-- Notifications trigger logic

-- 1. Notify on new message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chat_buyer_id UUID;
  v_chat_seller_id UUID;
  v_recipient_id UUID;
  v_sender_name VARCHAR;
BEGIN
  -- Get chat participants
  SELECT buyer_id, seller_id INTO v_chat_buyer_id, v_chat_seller_id
  FROM public.chats WHERE id = NEW.chat_id;

  -- Determine recipient
  IF NEW.sender_id = v_chat_buyer_id THEN
    v_recipient_id := v_chat_seller_id;
  ELSE
    v_recipient_id := v_chat_buyer_id;
  END IF;

  -- Get sender name
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  IF v_sender_name IS NULL THEN
    v_sender_name := 'Пользователь';
  END IF;

  -- Insert notification
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (
    v_recipient_id,
    'NEW_MESSAGE',
    'Новое сообщение от ' || v_sender_name,
    '/messages/' || NEW.chat_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.messages;
CREATE TRIGGER trigger_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

-- 2. Notify on new offer
CREATE OR REPLACE FUNCTION public.notify_new_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_buyer_id UUID;
  v_request_title VARCHAR;
BEGIN
  -- Get request details
  SELECT buyer_id, title INTO v_buyer_id, v_request_title
  FROM public.requests WHERE id = NEW.request_id;

  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (
    v_buyer_id,
    'NEW_OFFER',
    'Новое предложение для запроса "' || v_request_title || '"',
    '/requests/' || NEW.request_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_offer ON public.request_offers;
CREATE TRIGGER trigger_notify_new_offer
AFTER INSERT ON public.request_offers
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_offer();

-- 3. Notify on new order
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (
    NEW.seller_id,
    'NEW_ORDER',
    'У вас новый заказ!',
    '/seller/orders/' || NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_order ON public.orders;
CREATE TRIGGER trigger_notify_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_order();

-- 4. Notify on order status change
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
      -- It could be cancelled by buyer or seller, notify the other party
      -- For simplicity, if we don't know who cancelled, we might notify both or just the other.
      -- Usually the RPC sets the status.
      -- Let's just notify the seller if it was cancelled, or buyer if it was cancelled.
      -- We don't have executor ID here. Let's notify seller (assuming buyer cancelled).
      v_status_text := 'Заказ отменен';
      v_recipient_id := NEW.seller_id;
      v_link := '/seller/orders/' || NEW.id;
    ELSIF NEW.status = 'COMPLETED' THEN
      v_status_text := 'Сделка завершена';
      v_recipient_id := NEW.seller_id; -- Notify seller that buyer completed it
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

DROP TRIGGER IF EXISTS trigger_notify_order_status_change ON public.orders;
CREATE TRIGGER trigger_notify_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_status_change();

-- 5. Notify on request expiration or closure
CREATE OR REPLACE FUNCTION public.notify_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'EXPIRED' THEN
      INSERT INTO public.notifications (user_id, type, message, link)
      VALUES (
        NEW.buyer_id,
        'REQUEST_EXPIRED',
        'Срок действия вашего запроса истек',
        '/requests/' || NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_request_status_change ON public.requests;
CREATE TRIGGER trigger_notify_request_status_change
AFTER UPDATE ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_request_status_change();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY; 
