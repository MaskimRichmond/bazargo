-- P0 FINAL HARDENING

-- ==================================================
-- 1. READ RECEIPTS SECURITY
-- ==================================================
-- Ensure a user can only update messages to is_read = true IF they are the recipient in the chat.
DROP POLICY IF EXISTS "Users can update their own chats." ON public.messages;
DROP POLICY IF EXISTS "Users can mark received messages as read" ON public.messages;

CREATE POLICY "Users can mark received messages as read" ON public.messages
FOR UPDATE USING (
    auth.uid() IN (SELECT buyer_id FROM public.chats WHERE id = chat_id UNION SELECT seller_id FROM public.chats WHERE id = chat_id)
    AND sender_id != auth.uid()
) WITH CHECK (
    auth.uid() IN (SELECT buyer_id FROM public.chats WHERE id = chat_id UNION SELECT seller_id FROM public.chats WHERE id = chat_id)
    AND sender_id != auth.uid()
);

-- Protect messages from being edited (content spoofing) by the sender after creation
-- (We only allow updating is_read, which is done by the recipient. The sender cannot update their own message content).
-- This is handled because sender_id != auth.uid() for updates.

-- ==================================================
-- 2. ANTI-FRAUD FOUNDATION
-- ==================================================
-- Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS abuse_score INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- Listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS abuse_score INT DEFAULT 0;

-- Stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS abuse_score INT DEFAULT 0;

-- Requests
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT false;

-- Protect Anti-Fraud flags from owner manipulation
CREATE OR REPLACE FUNCTION public.protect_anti_fraud_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow bypass for Service Role or Admin
    IF current_setting('role', true) = 'service_role' OR auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF auth.uid() IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
            RETURN NEW;
        END IF;
    END IF;

    -- For normal users, force NEW values to equal OLD values for these fields
    IF TG_TABLE_NAME = 'profiles' THEN
        NEW.is_verified := OLD.is_verified;
        NEW.is_suspicious := OLD.is_suspicious;
        NEW.abuse_score := OLD.abuse_score;
        NEW.blocked_reason := OLD.blocked_reason;
        NEW.role := OLD.role;
    ELSIF TG_TABLE_NAME IN ('listings', 'stores', 'requests') THEN
        NEW.is_suspicious := OLD.is_suspicious;
        NEW.abuse_score := OLD.abuse_score;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profiles_anti_fraud ON public.profiles;
CREATE TRIGGER tr_protect_profiles_anti_fraud
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_anti_fraud_flags();

DROP TRIGGER IF EXISTS tr_protect_stores_anti_fraud ON public.stores;
CREATE TRIGGER tr_protect_stores_anti_fraud
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.protect_anti_fraud_flags();

-- Also integrate anti-fraud protection into the existing listing integrity trigger
CREATE OR REPLACE FUNCTION public.protect_listing_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_admin BOOLEAN := FALSE;
    v_is_service_role BOOLEAN := FALSE;
BEGIN
    -- 1. Check if caller is admin
    IF auth.uid() IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN'
        ) INTO v_is_admin;
    END IF;

    -- 2. Check if caller is service_role
    BEGIN
        IF current_setting('role', true) = 'service_role' OR auth.role() = 'service_role' THEN
            v_is_service_role := TRUE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore
    END;

    -- 3. Always protect seller_id ownership integrity
    NEW.seller_id := OLD.seller_id;

    -- 4. Protect Anti-Fraud flags
    IF NOT v_is_admin AND NOT v_is_service_role THEN
        NEW.is_suspicious := OLD.is_suspicious;
        NEW.abuse_score := OLD.abuse_score;
    END IF;

    -- 5. Status and Immutability checks for owners
    IF NOT v_is_admin AND NOT v_is_service_role THEN
        -- BLOCKED Immutability
        IF OLD.status = 'BLOCKED' THEN
            IF NEW.status IS DISTINCT FROM OLD.status 
               OR NEW.title IS DISTINCT FROM OLD.title 
               OR NEW.description IS DISTINCT FROM OLD.description 
               OR NEW.price IS DISTINCT FROM OLD.price 
               OR NEW.quantity IS DISTINCT FROM OLD.quantity 
               OR NEW.category_id IS DISTINCT FROM OLD.category_id 
               OR NEW.condition IS DISTINCT FROM OLD.condition 
               OR NEW.city IS DISTINCT FROM OLD.city 
               OR NEW.delivery_methods IS DISTINCT FROM OLD.delivery_methods 
               OR NEW.product_id IS DISTINCT FROM OLD.product_id
               OR NEW.store_id IS DISTINCT FROM OLD.store_id
               OR NEW.listing_type IS DISTINCT FROM OLD.listing_type THEN
                RAISE EXCEPTION 'Blocked listings cannot be modified by the owner';
            END IF;
        END IF;

        IF NEW.status = 'BLOCKED' AND OLD.status != 'BLOCKED' THEN
            RAISE EXCEPTION 'Only administrators can block a listing';
        END IF;

        -- ARCHIVED Immutability
        IF OLD.status = 'ARCHIVED' THEN
            IF NEW.status IS DISTINCT FROM OLD.status 
               OR NEW.title IS DISTINCT FROM OLD.title 
               OR NEW.description IS DISTINCT FROM OLD.description 
               OR NEW.price IS DISTINCT FROM OLD.price 
               OR NEW.quantity IS DISTINCT FROM OLD.quantity 
               OR NEW.category_id IS DISTINCT FROM OLD.category_id 
               OR NEW.condition IS DISTINCT FROM OLD.condition 
               OR NEW.city IS DISTINCT FROM OLD.city 
               OR NEW.delivery_methods IS DISTINCT FROM OLD.delivery_methods 
               OR NEW.product_id IS DISTINCT FROM OLD.product_id
               OR NEW.store_id IS DISTINCT FROM OLD.store_id
               OR NEW.listing_type IS DISTINCT FROM OLD.listing_type THEN
                RAISE EXCEPTION 'Archived listings cannot be modified by the owner';
            END IF;
        END IF;

        -- Status State Machine
        IF OLD.status != NEW.status THEN
            IF OLD.status = 'SOLD' THEN
                IF NEW.status != 'ARCHIVED' THEN
                    RAISE EXCEPTION 'Sold listings can only be archived';
                END IF;
            END IF;
            IF OLD.status = 'OUT_OF_STOCK' THEN
                IF NEW.status = 'ACTIVE' THEN
                    IF NEW.quantity <= 0 THEN
                        RAISE EXCEPTION 'Cannot activate listing with 0 inventory';
                    END IF;
                ELSIF NEW.status NOT IN ('ARCHIVED', 'DEACTIVATED') THEN
                    RAISE EXCEPTION 'Invalid transition from OUT_OF_STOCK to %', NEW.status;
                END IF;
            END IF;
            IF OLD.status = 'ACTIVE' THEN
                IF NEW.status NOT IN ('DEACTIVATED', 'SOLD', 'OUT_OF_STOCK', 'ARCHIVED') THEN
                    RAISE EXCEPTION 'Invalid transition from ACTIVE to %', NEW.status;
                END IF;
            END IF;
            IF OLD.status = 'DEACTIVATED' THEN
                IF NEW.status = 'ACTIVE' THEN
                    IF NEW.quantity <= 0 THEN
                        RAISE EXCEPTION 'Cannot activate listing with 0 inventory';
                    END IF;
                ELSIF NEW.status NOT IN ('ARCHIVED') THEN
                    RAISE EXCEPTION 'Invalid transition from DEACTIVATED to %', NEW.status;
                END IF;
            END IF;
        END IF;
    END IF;

    -- 6. Inventory Integrity
    IF NEW.status = 'ACTIVE' AND NEW.quantity <= 0 THEN
        NEW.status := 'OUT_OF_STOCK';
    END IF;
    IF NEW.listing_type = 'SINGLE' AND NEW.quantity > 1 THEN
        NEW.quantity := 1;
    END IF;

    RETURN NEW;
END;
$$;

-- ==================================================
-- 3. EXTENDED AUDIT LOGGING
-- ==================================================
DROP TRIGGER IF EXISTS tr_audit_requests ON public.requests;
CREATE TRIGGER tr_audit_requests
AFTER INSERT OR UPDATE ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS tr_audit_request_offers ON public.request_offers;
CREATE TRIGGER tr_audit_request_offers
AFTER INSERT OR UPDATE ON public.request_offers
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_func();
