-- Migration: Compliance, Admin RBAC, Reports, User Blocking, and Audit Logs

-- 1. Extend user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'MODERATOR';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPPORT';
COMMIT;

-- 2. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    target_id UUID,
    target_type VARCHAR(255),
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')));

-- 3. Reports Table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_target_type') THEN
        CREATE TYPE report_target_type AS ENUM ('LISTING', 'USER', 'MESSAGE', 'STORE');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    target_type report_target_type NOT NULL,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    status report_status NOT NULL DEFAULT 'OPEN',
    moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT unique_active_report UNIQUE NULLS NOT DISTINCT (reporter_id, target_id, target_type) -- Prevent spamming reports
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
CREATE POLICY "Users can view their own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Staff can view reports" ON public.reports;
CREATE POLICY "Staff can view reports" ON public.reports FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN', 'SUPER_ADMIN', 'MODERATOR'))
);
DROP POLICY IF EXISTS "Staff can update reports" ON public.reports;
CREATE POLICY "Staff can update reports" ON public.reports FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN', 'SUPER_ADMIN', 'MODERATOR'))
);

-- 4. User Blocks Table (Peer-to-Peer Blocking)
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id),
    CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert blocks" ON public.user_blocks;
CREATE POLICY "Users can insert blocks" ON public.user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.user_blocks;
CREATE POLICY "Users can view their own blocks" ON public.user_blocks FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);
DROP POLICY IF EXISTS "Users can delete their blocks" ON public.user_blocks;
CREATE POLICY "Users can delete their blocks" ON public.user_blocks FOR DELETE USING (auth.uid() = blocker_id);

-- 5. Ban tracking in profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF (current_setting('role', true) != 'service_role') THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role NOT IN ('ADMIN', 'SUPER_ADMIN')) THEN
            IF NEW.role IS DISTINCT FROM OLD.role THEN
                RAISE EXCEPTION 'Unauthorized to change role';
            END IF;
            IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
                RAISE EXCEPTION 'Unauthorized to change ban status';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER tr_prevent_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_privilege_escalation();

-- 6. Chat Abuse / Messages
DROP POLICY IF EXISTS "Users can insert messages in their chats." ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their chats" ON public.messages;
CREATE POLICY "Users can insert messages in their chats"
ON public.messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.chats c 
        WHERE c.id = chat_id 
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        AND NOT EXISTS (
            SELECT 1 FROM public.user_blocks ub 
            WHERE (ub.blocker_id = c.buyer_id AND ub.blocked_id = c.seller_id)
               OR (ub.blocker_id = c.seller_id AND ub.blocked_id = c.buyer_id)
        )
    )
);

DROP POLICY IF EXISTS "Users can create chats." ON public.chats;
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
CREATE POLICY "Users can create chats"
ON public.chats FOR INSERT
WITH CHECK (
    (auth.uid() = buyer_id OR auth.uid() = seller_id) AND
    NOT EXISTS (
        SELECT 1 FROM public.user_blocks ub 
        WHERE (ub.blocker_id = buyer_id AND ub.blocked_id = seller_id)
           OR (ub.blocker_id = seller_id AND ub.blocked_id = buyer_id)
    )
);
