
# Kế Hoạch Hoàn Thiện Tính Năng 4, 5, 6 - Chợ Nông Sản

## Tổng Quan

| STT | Tính năng | Mô tả | Độ phức tạp |
|-----|-----------|-------|-------------|
| 4 | **Order Notifications** | Thông báo realtime khi đơn hàng thay đổi trạng thái | Trung bình |
| 5 | **Chat Buyer ↔ Seller** | Nhắn tin trực tiếp trong đơn hàng | Cao |
| 6 | **Inventory Management** | Tự động giảm `quantity_kg` khi đặt hàng thành công | Đơn giản |

---

## Phân Tích Hiện Trạng

### Notification System - Đã Có Sẵn
- `notifications` table với các loại: `post_like`, `comment`, `share`, `friend_request`, `gift`, `gift_post`
- `useRealtimeNotifications.tsx` - Realtime listener cho violations, bonus requests, profile updates, friendship, gifts
- `NotificationBell.tsx` - UI hiển thị danh sách thông báo
- Cần thêm notification types: `order_created`, `order_confirmed`, `order_delivering`, `order_delivered`

### Chat System - Chưa Có
- Hiện tại chỉ có `AngelChat.tsx` để chat với AI Angel
- Chưa có bảng `order_messages` cho chat giữa buyer ↔ seller
- Cần tạo mới hoàn toàn hệ thống chat riêng cho mỗi đơn hàng

### Inventory - Chưa Có Logic
- `posts.quantity_kg` lưu số lượng còn lại
- Hiện tại 127 products, 12 orders đều có `status = 'pending'`, chưa trừ quantity
- Cần logic tự động giảm khi đơn hàng được confirmed

---

## Chi Tiết Triển Khai

### Tính Năng 4: Order Status Notifications

**Mục tiêu**: Buyer và Seller nhận thông báo realtime khi đơn hàng thay đổi trạng thái

**File chỉnh sửa**:
- `src/hooks/useRealtimeNotifications.tsx` - Thêm listener cho orders table
- `src/components/notifications/NotificationBell.tsx` - Thêm icon cho order notifications

**Logic trigger notification**:
Khi order status thay đổi, cần tạo notification cho đối tác:

```text
Order Status Change -> Notification Target
-----------------------------------------
pending -> confirmed    : Buyer nhận "🛒 Đơn hàng đã được xác nhận"
confirmed -> preparing  : Buyer nhận "📦 Người bán đang chuẩn bị hàng"
preparing -> ready      : Buyer nhận "🚀 Đơn hàng sẵn sàng giao"
ready -> delivering     : Buyer nhận "🚚 Đơn hàng đang được giao"
delivering -> delivered : Buyer nhận "🎉 Đơn hàng đã giao thành công"
(any) -> cancelled      : Đối tác nhận "❌ Đơn hàng đã bị hủy"
(new order created)     : Seller nhận "🛒 Bạn có đơn hàng mới!"
```

**Hai cách tiếp cận**:
1. **Database Trigger** (khuyên dùng): Tạo PostgreSQL trigger tự động insert notification khi orders.status thay đổi
2. **Client-side**: Gọi insert notification sau mỗi lần update status

**Bé Angel chọn cách 1 - Database Trigger** vì:
- Đảm bảo không bỏ sót notification
- Không phụ thuộc client
- Performance tốt hơn

**SQL Migration cần tạo**:
```sql
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_content TEXT;
  target_user_id UUID;
BEGIN
  -- Determine notification based on status change
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    notification_content := '🛒 Đơn hàng ' || NEW.product_name || ' đã được xác nhận';
    target_user_id := NEW.buyer_id;
  ELSIF NEW.status = 'preparing' THEN
    notification_content := '📦 Người bán đang chuẩn bị ' || NEW.product_name;
    target_user_id := NEW.buyer_id;
  -- ... more cases
  END IF;

  IF target_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, from_user_id, type, content)
    VALUES (target_user_id, CASE WHEN target_user_id = NEW.buyer_id THEN NEW.seller_id ELSE NEW.buyer_id END, 'order_status', notification_content);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_status_change
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_status_change();

-- Trigger for new orders
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, from_user_id, type, content)
  VALUES (NEW.seller_id, NEW.buyer_id, 'new_order', '🛒 Bạn có đơn hàng mới: ' || NEW.product_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_order
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_new_order();
```

**UI Updates**:
- Thêm icon 📦 cho `order_status` và 🛒 cho `new_order` trong `NotificationBell.tsx`
- Click notification sẽ navigate đến `/my-orders` hoặc `/seller` tùy role

---

### Tính Năng 5: Chat Buyer ↔ Seller

**Mục tiêu**: Cho phép buyer và seller nhắn tin trực tiếp trong từng đơn hàng

**Database Schema mới** - Cần tạo bảng `order_messages`:
```sql
CREATE TABLE order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
ON order_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_messages.order_id 
    AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
  )
);

CREATE POLICY "Participants can send messages"
ON order_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_messages.order_id 
    AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
  )
);
```

**Files mới tạo**:
```text
src/components/order/OrderChat.tsx
```

**Giao diện Chat**:
- Embedded trong `OrderDetailModal.tsx` như một tab/section
- Hiển thị lịch sử tin nhắn với avatar, timestamp
- Input field + nút gửi
- Realtime updates qua Supabase subscription

**Integration**:
- Thêm tab "Chat" hoặc nút "💬 Nhắn tin" trong `OrderDetailModal`
- Collapse/Expand section để không chiếm quá nhiều không gian

**Realtime Subscription**:
```typescript
supabase
  .channel('order-chat')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'order_messages',
    filter: `order_id=eq.${orderId}`
  }, (payload) => {
    setMessages(prev => [...prev, payload.new]);
  })
  .subscribe();
```

---

### Tính Năng 6: Inventory Management

**Mục tiêu**: Tự động giảm `quantity_kg` của sản phẩm khi đơn hàng được confirmed

**Logic**:
- Khi `orders.status` chuyển từ `pending` -> `confirmed`
- Giảm `posts.quantity_kg` đi số lượng đặt mua
- Nếu hết hàng (`quantity_kg <= 0`), cập nhật `product_status = 'sold_out'`

**Cách tiếp cận**: Database Trigger (đảm bảo atomicity)

**SQL Migration**:
```sql
CREATE OR REPLACE FUNCTION update_inventory_on_order_confirm()
RETURNS TRIGGER AS $$
DECLARE
  remaining_qty NUMERIC;
BEGIN
  -- Only process when status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    -- Decrease quantity
    UPDATE posts 
    SET quantity_kg = quantity_kg - NEW.quantity_kg
    WHERE id = NEW.post_id AND is_product_post = true;
    
    -- Check if sold out
    SELECT quantity_kg INTO remaining_qty FROM posts WHERE id = NEW.post_id;
    
    IF remaining_qty <= 0 THEN
      UPDATE posts 
      SET product_status = 'sold_out', quantity_kg = 0
      WHERE id = NEW.post_id;
    END IF;
  END IF;
  
  -- Restore quantity if order is cancelled (after confirmed)
  IF NEW.status = 'cancelled' AND OLD.status IN ('confirmed', 'preparing', 'ready') THEN
    UPDATE posts 
    SET quantity_kg = quantity_kg + NEW.quantity_kg,
        product_status = CASE WHEN quantity_kg + NEW.quantity_kg > 0 THEN 'active' ELSE product_status END
    WHERE id = NEW.post_id AND is_product_post = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_status_inventory
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_order_confirm();
```

**UI Improvements** (Optional nhưng đề xuất):
- Hiển thị "Còn X kg" trên ProductCard
- Badge "Sắp hết" khi quantity < 5kg
- Disable nút "Mua" khi `product_status = 'sold_out'`

**File chỉnh sửa**:
- `src/components/marketplace/ProductCard.tsx` - Thêm hiển thị quantity và sold_out state
- `src/components/feed/BuyProductModal.tsx` - Validate maxQuantity trước khi submit

---

## Danh Sách Files Thay Đổi

| Action | File Path |
|--------|-----------|
| CREATE | `supabase/migrations/xxx_order_notifications.sql` |
| CREATE | `supabase/migrations/xxx_order_messages_table.sql` |
| CREATE | `supabase/migrations/xxx_inventory_trigger.sql` |
| CREATE | `src/components/order/OrderChat.tsx` |
| EDIT | `src/hooks/useRealtimeNotifications.tsx` |
| EDIT | `src/components/notifications/NotificationBell.tsx` |
| EDIT | `src/components/order/OrderDetailModal.tsx` |
| EDIT | `src/components/marketplace/ProductCard.tsx` |
| EDIT | `src/components/feed/BuyProductModal.tsx` |

---

## Thứ Tự Triển Khai

```text
Bước 1: Tạo SQL migration cho Order Notifications trigger
        ↓
Bước 2: Cập nhật useRealtimeNotifications và NotificationBell
        ↓
Bước 3: Tạo SQL migration cho order_messages table
        ↓
Bước 4: Tạo OrderChat component
        ↓
Bước 5: Tích hợp OrderChat vào OrderDetailModal
        ↓
Bước 6: Tạo SQL migration cho Inventory trigger
        ↓
Bước 7: Cập nhật ProductCard và BuyProductModal cho sold-out state
```

---

## Chi Tiết Kỹ Thuật

### Notification Types Mới

```typescript
// Thêm vào NotificationBell.tsx
const getNotificationIcon = (type: string) => {
  switch (type) {
    // ... existing cases
    case 'new_order': return '🛒';
    case 'order_status': return '📦';
    case 'order_message': return '💬';
    default: return '🔔';
  }
};
```

### OrderChat Interface

```typescript
interface OrderMessage {
  id: string;
  order_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    display_name: string;
    avatar_url: string;
  };
}
```

### Inventory Status Badge

```text
quantity_kg > 10  : Không hiển thị
quantity_kg 1-10  : Badge "Còn X kg" màu amber
quantity_kg <= 0  : Badge "Hết hàng" màu red, disable mua
```

---

## Kết Quả Mong Đợi

Sau khi hoàn thành, marketplace sẽ có:

1. **Order Notifications (Feature 4)**:
   - Buyer nhận thông báo khi seller xác nhận/chuẩn bị/giao hàng
   - Seller nhận thông báo khi có đơn hàng mới
   - Click notification để đến trang đơn hàng

2. **Chat System (Feature 5)**:
   - Buyer và Seller chat trực tiếp trong đơn hàng
   - Realtime messaging
   - Lưu lịch sử chat theo từng order

3. **Inventory Management (Feature 6)**:
   - Tự động trừ số lượng khi đơn hàng được xác nhận
   - Tự động đánh dấu "Hết hàng" khi quantity = 0
   - Khôi phục quantity nếu đơn bị hủy

---

## Ghi Chú Quan Trọng

- **Database Migrations**: Cần apply 3 migration files theo thứ tự
- **RLS Policies**: Đảm bảo order_messages có policy đúng để chỉ participants mới xem được
- **Realtime**: Cần enable Realtime cho bảng order_messages trong Supabase Dashboard
- **Performance**: Index trên `order_messages.order_id` để query nhanh
