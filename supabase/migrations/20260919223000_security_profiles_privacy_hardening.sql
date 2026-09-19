-- 1. Remove 'role' from public select
REVOKE SELECT ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, avatar_url, city, is_verified, created_at, updated_at) 
ON public.profiles TO anon, authenticated;

-- 2. Harden get_listing_phone
CREATE OR REPLACE FUNCTION public.get_listing_phone(p_listing_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone VARCHAR;
  v_seller_id UUID;
  v_show_phone BOOLEAN;
  v_status public.listing_status;
BEGIN
  SELECT seller_id, show_phone, status INTO v_seller_id, v_show_phone, v_status
  FROM public.listings
  WHERE id = p_listing_id;

  IF v_seller_id IS NULL THEN RETURN NULL; END IF;

  IF v_seller_id = auth.uid() OR (v_show_phone = true AND v_status = 'ACTIVE') THEN
    SELECT phone INTO v_phone FROM public.profiles WHERE id = v_seller_id;
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$$;

-- 3. Harden get_order_seller_phone
CREATE OR REPLACE FUNCTION public.get_order_seller_phone(p_order_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone VARCHAR;
  v_seller_id UUID;
  v_buyer_id UUID;
  v_status public.order_status;
BEGIN
  SELECT seller_id, buyer_id, status INTO v_seller_id, v_buyer_id, v_status
  FROM public.orders
  WHERE id = p_order_id;

  IF v_seller_id IS NULL THEN RETURN NULL; END IF;

  IF auth.uid() = v_seller_id OR (auth.uid() = v_buyer_id AND v_status = 'CONFIRMED') THEN
    SELECT phone INTO v_phone FROM public.profiles WHERE id = v_seller_id;
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$$;

-- 4. Harden get_order_buyer_phone
CREATE OR REPLACE FUNCTION public.get_order_buyer_phone(p_order_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone VARCHAR;
  v_seller_id UUID;
  v_buyer_id UUID;
BEGIN
  SELECT seller_id, buyer_id INTO v_seller_id, v_buyer_id
  FROM public.orders
  WHERE id = p_order_id;

  IF v_seller_id IS NULL THEN RETURN NULL; END IF;

  IF auth.uid() = v_buyer_id OR auth.uid() = v_seller_id THEN
    SELECT phone INTO v_phone FROM public.profiles WHERE id = v_buyer_id;
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$$;

-- 5. Revoke default execute and strictly grant
REVOKE EXECUTE ON FUNCTION public.get_listing_phone(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_order_seller_phone(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_order_buyer_phone(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_listing_phone(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_seller_phone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_buyer_phone(UUID) TO authenticated;
