-- Feature 4: Order Status Notifications Trigger
-- Tự động tạo thông báo khi đơn hàng thay đổi trạng thái

-- Function: Thông báo khi trạng thái đơn hàng thay đổi
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_content TEXT;
  target_user_id UUID;
  from_user_id UUID;
BEGIN
  -- Xác định thông báo dựa trên status change
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    notification_content := '✅ Đơn hàng "' || NEW.product_name || '" đã được xác nhận';
    target_user_id := NEW.buyer_id;
    from_user_id := NEW.seller_id;
    
  ELSIF NEW.status = 'preparing' AND OLD.status = 'confirmed' THEN
    notification_content := '📦 Người bán đang chuẩn bị "' || NEW.product_name || '"';
    target_user_id := NEW.buyer_id;
    from_user_id := NEW.seller_id;
    
  ELSIF NEW.status = 'ready' AND OLD.status = 'preparing' THEN
    notification_content := '🚀 Đơn hàng "' || NEW.product_name || '" sẵn sàng giao';
    target_user_id := NEW.buyer_id;
    from_user_id := NEW.seller_id;
    
  ELSIF NEW.status = 'delivering' AND OLD.status = 'ready' THEN
    notification_content := '🚚 Đơn hàng "' || NEW.product_name || '" đang được giao';
    target_user_id := NEW.buyer_id;
    from_user_id := NEW.seller_id;
    
  ELSIF NEW.status = 'delivered' AND OLD.status = 'delivering' THEN
    notification_content := '🎉 Đơn hàng "' || NEW.product_name || '" đã giao thành công! Hãy đánh giá nhé';
    target_user_id := NEW.buyer_id;
    from_user_id := NEW.seller_id;
    
  ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Thông báo cho cả 2 bên
    -- Buyer nhận thông báo từ seller
    IF NEW.cancelled_by = NEW.seller_id THEN
      notification_content := '❌ Đơn hàng "' || NEW.product_name || '" đã bị hủy bởi người bán';
      target_user_id := NEW.buyer_id;
      from_user_id := NEW.seller_id;
    ELSE
      notification_content := '❌ Đơn hàng "' || NEW.product_name || '" đã bị hủy bởi người mua';
      target_user_id := NEW.seller_id;
      from_user_id := NEW.buyer_id;
    END IF;
  END IF;

  -- Insert notification if we have content
  IF notification_content IS NOT NULL AND target_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, from_user_id, type, content, post_id)
    VALUES (target_user_id, from_user_id, 'order_status', notification_content, NEW.post_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Thông báo cho seller khi có đơn hàng mới
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, from_user_id, type, content, post_id)
  VALUES (
    NEW.seller_id, 
    NEW.buyer_id, 
    'new_order', 
    '🛒 Bạn có đơn hàng mới: ' || NEW.product_name || ' (' || NEW.quantity_kg || ' kg)',
    NEW.post_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for order status changes
DROP TRIGGER IF EXISTS on_order_status_change ON orders;
CREATE TRIGGER on_order_status_change
AFTER UPDATE OF status ON orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION notify_order_status_change();

-- Create trigger for new orders
DROP TRIGGER IF EXISTS on_new_order ON orders;
CREATE TRIGGER on_new_order
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_new_order();

-- Feature 5: Order Messages Table for Buyer ↔ Seller Chat
CREATE TABLE IF NOT EXISTS order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_order_messages_order_id ON order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_created_at ON order_messages(created_at);

-- Enable RLS
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Chỉ buyer và seller của order mới xem được messages
CREATE POLICY "Participants can view order messages"
ON order_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_messages.order_id 
    AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
  )
);

-- RLS Policy: Chỉ participants mới gửi được message
CREATE POLICY "Participants can send order messages"
ON order_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_messages.order_id 
    AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
  )
);

-- Enable Realtime for order_messages
ALTER PUBLICATION supabase_realtime ADD TABLE order_messages;

-- Feature 6: Inventory Management Trigger
-- Tự động giảm quantity_kg khi đơn hàng được confirmed
-- Khôi phục quantity khi đơn bị hủy

CREATE OR REPLACE FUNCTION update_inventory_on_order_status()
RETURNS TRIGGER AS $$
DECLARE
  current_qty NUMERIC;
BEGIN
  -- Khi đơn hàng được confirmed, trừ quantity
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    -- Giảm số lượng
    UPDATE posts 
    SET quantity_kg = GREATEST(0, COALESCE(quantity_kg, 0) - NEW.quantity_kg)
    WHERE id = NEW.post_id AND is_product_post = true;
    
    -- Kiểm tra và cập nhật trạng thái sold_out
    SELECT quantity_kg INTO current_qty FROM posts WHERE id = NEW.post_id;
    
    IF current_qty <= 0 THEN
      UPDATE posts 
      SET product_status = 'sold_out'
      WHERE id = NEW.post_id AND is_product_post = true;
    END IF;
  END IF;
  
  -- Khi đơn hàng bị hủy sau khi đã confirmed, khôi phục quantity
  IF NEW.status = 'cancelled' AND OLD.status IN ('confirmed', 'preparing', 'ready') THEN
    UPDATE posts 
    SET 
      quantity_kg = COALESCE(quantity_kg, 0) + NEW.quantity_kg,
      product_status = CASE 
        WHEN product_status = 'sold_out' THEN 'active' 
        ELSE product_status 
      END
    WHERE id = NEW.post_id AND is_product_post = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create inventory trigger
DROP TRIGGER IF EXISTS on_order_status_inventory ON orders;
CREATE TRIGGER on_order_status_inventory
AFTER UPDATE OF status ON orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_inventory_on_order_status();