-- Package A: Architecture and Database Fixes

BEGIN;

-- A1 & A6: Add missing columns to orders to support checkout RPC and cancellation
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50) DEFAULT 'PICKUP' NOT NULL,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- A7: Add payload to notifications for structured data
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;

-- A3: Add missing indexes for admin dashboard performance
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_b2b_apps_status ON public.b2b_applications(status);

-- Fix the checkout RPC to use the correct columns for order_items (title_snapshot, image_url_snapshot)
-- and remove the non-existent store_id from order_items (it's already on orders)
CREATE OR REPLACE FUNCTION public.create_orders_from_cart()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_seller RECORD;
    v_cart_item RECORD;
    v_order_id UUID;
    v_total_amount DECIMAL(10,2);
    v_created_order_ids UUID[] := '{}';
    v_active_reserved INTEGER;
    v_store_id UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- For each unique seller in the cart
    FOR v_seller IN (
        SELECT DISTINCT l.seller_id
        FROM public.cart_items c
        JOIN public.listings l ON c.listing_id = l.id
        WHERE c.user_id = v_uid
    ) LOOP
        v_total_amount := 0;
        v_store_id := NULL;

        -- We need to check stock with row locking to prevent race conditions during checkout
        FOR v_cart_item IN (
            SELECT c.quantity, l.id, l.price, l.title, l.status, l.quantity as stock, l.listing_type, l.store_id
            FROM public.cart_items c
            JOIN public.listings l ON c.listing_id = l.id
            WHERE c.user_id = v_uid AND l.seller_id = v_seller.seller_id
            ORDER BY l.id
            FOR UPDATE OF l -- Row lock to prevent concurrent checkouts of the same listing!
        ) LOOP
            IF v_cart_item.status != 'ACTIVE' THEN
                RAISE EXCEPTION 'Item % is no longer active', v_cart_item.title;
            END IF;

            -- Calculate currently reserved stock in PENDING/CONFIRMED orders
            SELECT COALESCE(SUM(oi.quantity), 0) INTO v_active_reserved
            FROM public.order_items oi
            JOIN public.orders o ON o.id = oi.order_id
            WHERE oi.listing_id = v_cart_item.id 
            AND o.status IN ('PENDING', 'CONFIRMED');

            IF v_cart_item.listing_type = 'SINGLE' THEN
                IF v_active_reserved + v_cart_item.quantity > 1 THEN
                    RAISE EXCEPTION 'Item % is already ordered by someone else', v_cart_item.title;
                END IF;
            ELSE
                IF v_active_reserved + v_cart_item.quantity > v_cart_item.stock THEN
                    RAISE EXCEPTION 'Item % does not have enough available stock (Available: %, Requested: %)', 
                        v_cart_item.title, 
                        v_cart_item.stock - v_active_reserved, 
                        v_cart_item.quantity;
                END IF;
            END IF;

            v_total_amount := v_total_amount + (v_cart_item.price * v_cart_item.quantity);
            v_store_id := COALESCE(v_store_id, v_cart_item.store_id);
        END LOOP;

        -- Create the order
        INSERT INTO public.orders (
            buyer_id,
            seller_id,
            store_id,
            total_amount,
            status,
            payment_status,
            delivery_type,
            notes
        ) VALUES (
            v_uid,
            v_seller.seller_id,
            v_store_id,
            v_total_amount,
            'PENDING',
            'PENDING',
            'PICKUP',
            ''
        ) RETURNING id INTO v_order_id;

        -- Insert order items
        FOR v_cart_item IN (
            SELECT c.quantity, l.id, l.price, l.title, l.store_id,
                   (SELECT url FROM public.listing_images WHERE listing_id = l.id ORDER BY order_index ASC LIMIT 1) as img_url
            FROM public.cart_items c
            JOIN public.listings l ON c.listing_id = l.id
            WHERE c.user_id = v_uid AND l.seller_id = v_seller.seller_id
        ) LOOP
            INSERT INTO public.order_items (
                order_id,
                listing_id,
                quantity,
                unit_price,
                title_snapshot,
                image_url_snapshot
            ) VALUES (
                v_order_id,
                v_cart_item.id,
                v_cart_item.quantity,
                v_cart_item.price,
                v_cart_item.title,
                v_cart_item.img_url
            );
        END LOOP;

        -- Remove these items from cart
        DELETE FROM public.cart_items 
        WHERE user_id = v_uid 
        AND listing_id IN (
            SELECT id FROM public.listings WHERE seller_id = v_seller.seller_id
        );

        v_created_order_ids := array_append(v_created_order_ids, v_order_id);
    END LOOP;

    RETURN v_created_order_ids;
END;
$$;


-- Fix order cancellation notification (notify buyer if seller cancels, notify seller if buyer cancels)
-- Since we don't know the actor in the trigger directly, we infer it from standard patterns or notify the other party
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status_text VARCHAR;
  v_recipient_id UUID;
  v_link VARCHAR;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    IF NEW.status = 'CONFIRMED' THEN
      v_status_text := 'Заказ подтвержден продавцом';
      v_recipient_id := NEW.buyer_id;
      v_link := '/orders/' || NEW.id;
    ELSIF NEW.status = 'REJECTED' THEN
      v_status_text := 'Заказ отклонен продавцом';
      v_recipient_id := NEW.buyer_id;
      v_link := '/orders/' || NEW.id;
    ELSIF NEW.status = 'CANCELLED' THEN
      IF auth.uid() IS NULL OR auth.uid() = NEW.seller_id THEN
          v_recipient_id := NEW.buyer_id;
          v_link := '/orders/' || NEW.id;
      ELSE
          v_recipient_id := NEW.seller_id;
          v_link := '/seller/orders/' || NEW.id;
      END IF;
      v_status_text := 'Заказ отменен';
    ELSIF NEW.status = 'EXPIRED' THEN
      v_status_text := 'Время подтверждения заказа истекло';
      v_recipient_id := NEW.buyer_id;
      v_link := '/orders/' || NEW.id;
    ELSIF NEW.status = 'COMPLETED' THEN
      v_status_text := 'Сделка завершена';
      v_recipient_id := NEW.seller_id; 
      v_link := '/seller/orders/' || NEW.id;
    ELSE
      RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (
      v_recipient_id,
      'ORDER_STATUS',
      v_status_text,
      v_link
    );
  END IF;

  RETURN NEW;
END;
$$;


-- A5: Fix privilege escalation trigger
CREATE OR REPLACE FUNCTION public.protect_profile_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_service_role BOOLEAN := FALSE;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    IF current_setting('role', true) = 'service_role' OR current_user = 'postgres' OR current_user = 'supabase_admin' THEN
        v_is_service_role := TRUE;
    END IF;

    IF NOT v_is_service_role THEN
        BEGIN
            SELECT (role IN ('ADMIN', 'SUPER_ADMIN')) INTO v_is_admin 
            FROM public.profiles 
            WHERE id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
        EXCEPTION WHEN OTHERS THEN
            v_is_admin := FALSE;
        END;

        IF NEW.role IS DISTINCT FROM OLD.role AND NOT v_is_admin THEN
            RAISE EXCEPTION 'Only administrators can change user roles';
        END IF;

        IF NEW.is_banned IS DISTINCT FROM OLD.is_banned AND NOT v_is_admin THEN
            RAISE EXCEPTION 'Only administrators can ban/unban users';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


COMMIT;
