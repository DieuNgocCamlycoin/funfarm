
# Kế Hoạch Hoàn Thiện 3 Tính Năng Ưu Tiên Cao - Chợ Nông Sản

## Tổng Quan

Bé Angel sẽ hoàn thiện 3 tính năng thiết yếu để marketplace có thể đưa vào sử dụng:

| STT | Tính năng | Mô tả | Độ phức tạp |
|-----|-----------|-------|-------------|
| 1 | **Review Form** | Form cho buyer đánh giá sản phẩm sau khi nhận hàng | Trung bình |
| 2 | **Hiển thị Reviews** | Hiển thị rating + reviews trên ProductCard và PostDetail | Trung bình |
| 3 | **Seller xác nhận thanh toán** | Nút cho seller confirm payment khi buyer upload proof | Đơn giản |

---

## Phân Tích Hiện Trạng

### Database Schema (product_reviews) - Đã Có Sẵn
- `id` (uuid) - Primary key
- `order_id` (uuid) - Liên kết đơn hàng  
- `reviewer_id` (uuid) - Người đánh giá (buyer)
- `seller_id` (uuid) - Người bán
- `post_id` (uuid) - Sản phẩm
- `rating` (integer) - Điểm 1-5 sao
- `comment` (text) - Nhận xét
- `images` (array) - Ảnh đánh giá
- `created_at` (timestamp)

### Orders Table - Payment Status Flow
```text
pending → proof_uploaded → confirmed → completed
```
Hiện tại: 12 orders đều có `payment_status = 'pending'`

---

## Chi Tiết Triển Khai

### Tính Năng 1: Review Form Cho Buyer

**Mục tiêu**: Buyer có thể viết đánh giá sau khi đơn hàng đã delivered

**File mới tạo**:
```text
src/components/order/ProductReviewForm.tsx
```

**Giao diện Form**:
- Star rating selector (1-5 sao) với animation
- Textarea cho nhận xét (tối đa 500 ký tự)
- Upload tối đa 3 ảnh review
- Nút gửi đánh giá

**Logic**:
- Chỉ hiển thị khi `order.status === 'delivered'`
- Kiểm tra buyer chưa review đơn hàng này
- Insert vào bảng `product_reviews`
- Hiển thị toast thành công

**Tích hợp vào**:
- `src/components/order/OrderDetailModal.tsx` - Thêm section Review phía dưới
- `src/pages/MyOrders.tsx` - Thêm badge "Chưa đánh giá" trên order card

---

### Tính Năng 2: Hiển Thị Reviews

**2A. ProductCard - Hiển thị Rating Summary**

**File chỉnh sửa**: `src/components/marketplace/ProductCard.tsx`

**Thêm hiển thị**:
- Số sao trung bình (đã có `average_rating`)
- Số lượng reviews (đã có `review_count`)
- Icon sao vàng với số liệu

**2B. PostDetail - Hiển thị Chi Tiết Reviews**

**File mới tạo**:
```text
src/components/marketplace/ProductReviewList.tsx
```

**Giao diện**:
- Header: Điểm trung bình + tổng số reviews
- Breakdown: Thanh progress cho mỗi mức sao (5→1)
- Danh sách reviews với:
  - Avatar + tên reviewer
  - Số sao + ngày đánh giá
  - Nội dung comment
  - Gallery ảnh review (nếu có)

**Tích hợp vào**: `src/pages/PostDetail.tsx` - Thêm section "Đánh giá từ người mua" bên dưới bài viết (chỉ cho product posts)

---

### Tính Năng 3: Seller Xác Nhận Thanh Toán

**Mục tiêu**: Khi buyer upload proof thanh toán → Seller có nút confirm

**File chỉnh sửa**: 
- `src/components/seller/NewOrderCard.tsx`
- `src/components/order/OrderDetailModal.tsx`

**Logic**:
- Điều kiện hiển thị: `payment_status === 'proof_uploaded'` AND `payment_proof_url !== null`
- Khi click "Xác nhận đã nhận tiền":
  - Update `payment_status` → `'confirmed'`
  - Update `payment_confirmed_at` → current timestamp
  - Update `payment_confirmed_by` → seller id
- Hiển thị toast thành công

**UI bổ sung cho NewOrderCard**:
- Badge "Chờ xác nhận thanh toán" màu vàng
- Nút "💰 Xác nhận đã nhận tiền" màu xanh lá

---

## Danh Sách Files Thay Đổi

| Action | File Path |
|--------|-----------|
| CREATE | `src/components/order/ProductReviewForm.tsx` |
| CREATE | `src/components/marketplace/ProductReviewList.tsx` |
| EDIT | `src/components/order/OrderDetailModal.tsx` |
| EDIT | `src/components/seller/NewOrderCard.tsx` |
| EDIT | `src/pages/PostDetail.tsx` |
| EDIT | `src/pages/MyOrders.tsx` |
| EDIT | `src/types/marketplace.ts` (thêm Review interface) |

---

## Chi Tiết Kỹ Thuật

### Types Bổ Sung (marketplace.ts)

```typescript
export interface ProductReview {
  id: string;
  order_id: string;
  reviewer_id: string;
  seller_id: string;
  post_id: string;
  rating: number;
  comment: string | null;
  images: string[] | null;
  created_at: string;
  reviewer?: {
    id: string;
    display_name: string;
    avatar_url: string;
  };
}
```

### Payment Status Flow Update

```text
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT STATUS FLOW                      │
├─────────────────────────────────────────────────────────────┤
│  pending ──► proof_uploaded ──► confirmed ──► completed     │
│     │              │                  │                     │
│     │         [Buyer uploads]    [Seller clicks             │
│     │          proof image]       "Xác nhận"]               │
│     │                                                       │
│     └──────────── (CAMLY auto-confirm) ────────────────────►│
└─────────────────────────────────────────────────────────────┘
```

### Review Form Validation

```text
- Rating: Bắt buộc (1-5 sao)
- Comment: Tối thiểu 10 ký tự, tối đa 500 ký tự
- Images: Tối đa 3 ảnh, mỗi ảnh ≤ 5MB
- Một order chỉ được review 1 lần
```

---

## Thứ Tự Triển Khai

```text
Bước 1: Thêm ProductReview interface vào marketplace.ts
        ↓
Bước 2: Tạo ProductReviewForm component
        ↓
Bước 3: Tích hợp ReviewForm vào OrderDetailModal
        ↓
Bước 4: Thêm nút "Xác nhận thanh toán" cho Seller
        ↓
Bước 5: Tạo ProductReviewList component
        ↓
Bước 6: Tích hợp ReviewList vào PostDetail
        ↓
Bước 7: Cập nhật MyOrders để hiển thị badge "Chưa đánh giá"
```

---

## Kết Quả Mong Đợi

Sau khi hoàn thành, marketplace sẽ có:

1. **Buyer Experience**:
   - Xem được rating/reviews trên mỗi sản phẩm
   - Viết đánh giá sau khi nhận hàng
   - Biết được đơn nào chưa đánh giá

2. **Seller Experience**:
   - Xác nhận thanh toán thủ công khi buyer chuyển khoản
   - Theo dõi được trạng thái thanh toán rõ ràng

3. **Trust & Transparency**:
   - Người mua tham khảo được đánh giá trước khi mua
   - Tăng độ tin cậy cho marketplace
