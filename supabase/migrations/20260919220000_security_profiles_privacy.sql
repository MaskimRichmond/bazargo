-- 1. Revoke table-level SELECT for anon and authenticated
REVOKE SELECT ON TABLE public.profiles FROM anon, authenticated;

-- 2. Grant column-level SELECT for safe columns
GRANT SELECT (id, full_name, avatar_url, city, role, is_verified, created_at, updated_at) 
ON public.profiles TO anon, authenticated;

-- 3. Create secure RPCs for fetching phone numbers based on strict business logic

-- For Product Page
CREATE OR REPLACE FUNCTION public.get_listing_phone(p_listing_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone VARCHAR;
  v_seller_id UUID;
  v_show_phone BOOLEAN;
BEGIN
  SELECT seller_id, show_phone INTO v_seller_id, v_show_phone
  FROM listings
  WHERE id = p_listing_id;

  IF v_seller_id IS NULL THEN RETURN NULL; END IF;

  IF v_seller_id = auth.uid() OR v_show_phone = true THEN
    SELECT phone INTO v_phone FROM profiles WHERE id = v_seller_id;
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$$;

-- For Buyer checking Order
CREATE OR REPLACE FUNCTION public.get_order_seller_phone(p_order_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone VARCHAR;
  v_seller_id UUID;
  v_buyer_id UUID;
  v_status order_status;
BEGIN
  SELECT seller_id, buyer_id, status INTO v_seller_id, v_buyer_id, v_status
  FROM orders
  WHERE id = p_order_id;

  IF v_seller_id IS NULL THEN RETURN NULL; END IF;

  IF auth.uid() = v_seller_id OR (auth.uid() = v_buyer_id AND v_status = 'CONFIRMED') THEN
    SELECT phone INTO v_phone FROM profiles WHERE id = v_seller_id;
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$$;

-- For Seller checking Order
CREATE OR REPLACE FUNCTION public.get_order_buyer_phone(p_order_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone VARCHAR;
  v_seller_id UUID;
  v_buyer_id UUID;
BEGIN
  SELECT seller_id, buyer_id INTO v_seller_id, v_buyer_id
  FROM orders
  WHERE id = p_order_id;

  IF v_seller_id IS NULL THEN RETURN NULL; END IF;

  IF auth.uid() = v_buyer_id OR auth.uid() = v_seller_id THEN
    SELECT phone INTO v_phone FROM profiles WHERE id = v_buyer_id;
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_phone(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_seller_phone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_buyer_phone(UUID) TO authenticated;
