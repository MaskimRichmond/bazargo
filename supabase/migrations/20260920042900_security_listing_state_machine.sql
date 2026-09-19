-- ==========================================
-- STAGE 2: LISTING STATE MACHINE HARDENING
-- ==========================================

-- Replace the existing trigger with a strict DB-level State Machine
-- Enforcement for listing statuses.
CREATE OR REPLACE FUNCTION public.protect_listing_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

    -- 2. Check if caller is service_role (bypassing normal checks)
    BEGIN
        IF current_setting('role', true) = 'service_role' OR auth.role() = 'service_role' THEN
            v_is_service_role := TRUE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if not set
    END;

    -- 3. Always protect seller_id ownership integrity
    NEW.seller_id := OLD.seller_id;

    -- 4. Status State Machine
    IF OLD.status != NEW.status THEN
        -- Admins and Service Role bypass the strict owner state machine to perform moderation
        IF NOT v_is_admin AND NOT v_is_service_role THEN
            
            -- BLOCKED (Only Admin can block/unblock)
            IF OLD.status = 'BLOCKED' THEN
                RAISE EXCEPTION 'Blocked listings cannot be modified by the owner';
            END IF;
            IF NEW.status = 'BLOCKED' THEN
                RAISE EXCEPTION 'Only administrators can block a listing';
            END IF;

            -- ARCHIVED (Terminal state for owners)
            IF OLD.status = 'ARCHIVED' THEN
                RAISE EXCEPTION 'Archived listings cannot be reactivated or modified';
            END IF;

            -- SOLD
            IF OLD.status = 'SOLD' THEN
                IF NEW.status != 'ARCHIVED' THEN
                    RAISE EXCEPTION 'Sold listings can only be archived';
                END IF;
            END IF;

            -- OUT_OF_STOCK
            IF OLD.status = 'OUT_OF_STOCK' THEN
                IF NEW.status = 'ACTIVE' THEN
                    IF NEW.quantity <= 0 THEN
                        RAISE EXCEPTION 'Cannot activate listing with 0 inventory';
                    END IF;
                ELSIF NEW.status NOT IN ('ARCHIVED', 'DEACTIVATED') THEN
                    RAISE EXCEPTION 'Invalid transition from OUT_OF_STOCK to %', NEW.status;
                END IF;
            END IF;

            -- ACTIVE
            IF OLD.status = 'ACTIVE' THEN
                IF NEW.status NOT IN ('DEACTIVATED', 'SOLD', 'OUT_OF_STOCK', 'ARCHIVED') THEN
                    RAISE EXCEPTION 'Invalid transition from ACTIVE to %', NEW.status;
                END IF;
            END IF;

            -- DEACTIVATED
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

    -- 5. Inventory Integrity
    -- Auto-transition to OUT_OF_STOCK if inventory hits 0 and status is ACTIVE
    IF NEW.status = 'ACTIVE' AND NEW.quantity <= 0 THEN
        NEW.status := 'OUT_OF_STOCK';
    END IF;

    -- SINGLE listings cannot have quantity > 1
    IF NEW.listing_type = 'SINGLE' AND NEW.quantity > 1 THEN
        NEW.quantity := 1;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger is already attached from previous stages, but we ensure it's BEFORE UPDATE
DROP TRIGGER IF EXISTS tr_protect_listing_integrity ON public.listings;
CREATE TRIGGER tr_protect_listing_integrity
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.protect_listing_integrity();
