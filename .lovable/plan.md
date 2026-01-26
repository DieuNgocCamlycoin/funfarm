
# Kế Hoạch Hoàn Thiện Tính Năng 7, 8, 9, 10 - Chợ Nông Sản

## Tổng Quan

| STT | Tính năng | Mô tả | Độ phức tạp |
|-----|-----------|-------|-------------|
| 7 | **Product Detail Page** | Trang chi tiết sản phẩm riêng biệt với đầy đủ thông tin | Trung bình |
| 8 | **Seller Shop Page** | Trang gian hàng của người bán với danh sách sản phẩm | Trung bình |
| 9 | **Location Search** | Cải thiện tìm kiếm theo vị trí với autocomplete | Đơn giản |
| 10 | **Wishlist Page** | Trang hiển thị sản phẩm đã lưu yêu thích | Đơn giản |

---

## Phân Tích Hiện Trạng

### Đã Có Sẵn
- `PostDetail.tsx` - Hiển thị bài viết gốc, nhưng chưa tối ưu cho product posts
- `UserProfile.tsx` - Profile người dùng, nhưng chưa có tab sản phẩm đang bán
- `MarketplaceFilters.tsx` - Có filter khoảng cách, nhưng chưa có search theo địa điểm cụ thể
- `saved_products` table - Đã có logic lưu sản phẩm, nhưng chưa có trang riêng để xem

### Cần Hoàn Thiện
- Trang `/product/:productId` chuyên biệt cho sản phẩm
- Trang `/shop/:sellerId` hiển thị gian hàng
- Input search địa điểm với autocomplete
- Trang `/wishlist` hiển thị sản phẩm đã lưu

---

## Chi Tiết Triển Khai

### Tính Năng 7: Product Detail Page

**Mục tiêu**: Tạo trang chi tiết sản phẩm riêng biệt với đầy đủ thông tin để người mua dễ dàng xem và quyết định mua hàng.

**File mới tạo**:
```text
src/pages/ProductDetail.tsx
```

**Giao diện bao gồm**:
- **Image Gallery**: Slideshow ảnh sản phẩm với zoom
- **Product Info**: Tên, giá CAMLY/VND, số lượng còn lại
- **Seller Card**: Avatar, tên, verified badge, rating, link đến shop
- **Commitments**: Hiển thị các cam kết (hữu cơ, không bảo quản...)
- **Delivery Options**: Các phương thức giao hàng
- **Location**: Bản đồ vị trí người bán
- **Description**: Nội dung mô tả chi tiết
- **Reviews Section**: Tích hợp ProductReviewList
- **Action Buttons**: "Mua ngay", "Lưu yêu thích", "Nhắn tin"

**Route mới**: `/product/:productId`

**Logic**:
- Fetch product từ `posts` table với `is_product_post = true`
- Fetch seller profile
- Fetch reviews và rating
- Redirect đến `/post/:postId` nếu không phải product post

---

### Tính Năng 8: Seller Shop Page

**Mục tiêu**: Trang gian hàng của người bán, hiển thị tất cả sản phẩm họ đang bán.

**File mới tạo**:
```text
src/pages/SellerShop.tsx
```

**Giao diện bao gồm**:
- **Shop Header**:
  - Cover photo (dùng cover_url từ profile)
  - Avatar + Tên shop (display_name)
  - Verified badge + Good Heart badge
  - Rating trung bình từ tất cả reviews
  - Số sản phẩm đang bán
  - Nút "Kết bạn" / "Nhắn tin" / "Tặng CAMLY"

- **Stats Bar**:
  - Tổng số đơn hàng đã bán
  - Rating trung bình
  - Thời gian tham gia

- **Products Grid**:
  - Hiển thị tất cả sản phẩm của seller
  - Filter theo category
  - Sort theo giá/mới nhất

- **Reviews Tab**:
  - Hiển thị tất cả reviews của các sản phẩm seller

**Route mới**: `/shop/:sellerId`

**Logic**:
- Fetch seller profile từ `profiles`
- Fetch all products từ `posts` where `author_id = sellerId AND is_product_post = true`
- Fetch all reviews từ `product_reviews` where `seller_id = sellerId`
- Tính average rating và total orders

---

### Tính Năng 9: Location Search Enhancement

**Mục tiêu**: Cho phép người dùng tìm kiếm sản phẩm theo địa điểm cụ thể (tỉnh/thành phố) thay vì chỉ dựa vào GPS.

**File chỉnh sửa**:
```text
src/components/marketplace/MarketplaceFilters.tsx
src/types/marketplace.ts
src/hooks/useMarketplaceProducts.ts
```

**Tính năng mới**:
- **Location Input**: Dropdown hoặc combobox chọn tỉnh/thành phố Việt Nam
- **Preset Locations**: Danh sách 63 tỉnh thành Việt Nam
- **Filter Logic**: Lọc sản phẩm theo `location_address` chứa tên tỉnh/thành

**Danh sách tỉnh thành (top 10 phổ biến)**:
```text
- Hà Nội
- TP. Hồ Chí Minh
- Đà Nẵng
- Cần Thơ
- Bình Dương
- Đồng Nai
- Hải Phòng
- Long An
- Tiền Giang
- Lâm Đồng (Đà Lạt)
```

**UI Update**:
- Thêm Select/Combobox "📍 Khu vực" trong MarketplaceFilters
- Hiển thị badge khu vực đang chọn

---

### Tính Năng 10: Wishlist Page

**Mục tiêu**: Trang riêng hiển thị tất cả sản phẩm đã lưu để người dùng dễ dàng quản lý và mua sau.

**File mới tạo**:
```text
src/pages/Wishlist.tsx
```

**Giao diện bao gồm**:
- **Header**: "Sản phẩm yêu thích" với icon Heart
- **Stats**: Số lượng sản phẩm đã lưu
- **Products Grid**: 
  - Hiển thị ProductCard cho mỗi sản phẩm
  - Nút "Bỏ lưu" để xóa khỏi wishlist
  - Nút "Mua ngay" để mở BuyProductModal
- **Empty State**: Thông báo khi chưa lưu sản phẩm nào
- **Quick Actions**:
  - "Xóa tất cả" để clear wishlist
  - Link đến Marketplace để tiếp tục shopping

**Route mới**: `/wishlist`

**Logic**:
- Fetch từ `saved_products` join với `posts`
- Realtime subscription để cập nhật khi save/unsave
- Validate sản phẩm còn active hay đã sold_out

---

## Danh Sách Files Thay Đổi

| Action | File Path |
|--------|-----------|
| CREATE | `src/pages/ProductDetail.tsx` |
| CREATE | `src/pages/SellerShop.tsx` |
| CREATE | `src/pages/Wishlist.tsx` |
| EDIT | `src/App.tsx` (thêm 3 routes mới) |
| EDIT | `src/components/marketplace/MarketplaceFilters.tsx` (thêm location search) |
| EDIT | `src/types/marketplace.ts` (thêm VIETNAM_PROVINCES) |
| EDIT | `src/hooks/useMarketplaceProducts.ts` (thêm location filter) |
| EDIT | `src/components/marketplace/ProductCard.tsx` (link đến ProductDetail) |
| EDIT | `src/components/MobileBottomNav.tsx` (thêm Wishlist icon) |

---

## Thứ Tự Triển Khai

```text
Bước 1: Tạo ProductDetail.tsx với đầy đủ UI
        ↓
Bước 2: Tạo SellerShop.tsx với products grid và reviews
        ↓
Bước 3: Thêm VIETNAM_PROVINCES vào marketplace.ts
        ↓
Bước 4: Cập nhật MarketplaceFilters với location dropdown
        ↓
Bước 5: Cập nhật useMarketplaceProducts với location filter
        ↓
Bước 6: Tạo Wishlist.tsx
        ↓
Bước 7: Cập nhật App.tsx với 3 routes mới
        ↓
Bước 8: Cập nhật ProductCard để link đến ProductDetail
        ↓
Bước 9: Thêm Wishlist icon vào MobileBottomNav
```

---

## Chi Tiết Kỹ Thuật

### ProductDetail Component Structure

```typescript
interface ProductDetailData {
  // Product info
  id: string;
  product_name: string;
  content: string;
  images: string[];
  price_camly: number;
  price_vnd: number;
  quantity_kg: number;
  category: ProductCategory;
  product_status: ProductStatus;
  commitments: string[];
  delivery_options: string[];
  location_address: string;
  location_lat: number;
  location_lng: number;
  
  // Seller info
  seller: {
    id: string;
    display_name: string;
    avatar_url: string;
    is_verified: boolean;
    is_good_heart: boolean;
    total_products: number;
    average_rating: number;
  };
  
  // Stats
  review_count: number;
  average_rating: number;
  is_saved: boolean;
}
```

### SellerShop Query

```typescript
// Fetch all products by seller
const { data: products } = await supabase
  .from('posts')
  .select('*')
  .eq('author_id', sellerId)
  .eq('is_product_post', true)
  .in('product_status', ['active', 'sold_out'])
  .order('created_at', { ascending: false });

// Fetch seller stats
const { count: orderCount } = await supabase
  .from('orders')
  .select('*', { count: 'exact', head: true })
  .eq('seller_id', sellerId)
  .eq('status', 'delivered');

const { data: reviews } = await supabase
  .from('product_reviews')
  .select('rating')
  .eq('seller_id', sellerId);
```

### Vietnam Provinces Constant

```typescript
export const VIETNAM_PROVINCES = [
  { value: 'hanoi', label: 'Hà Nội' },
  { value: 'hcm', label: 'TP. Hồ Chí Minh' },
  { value: 'danang', label: 'Đà Nẵng' },
  { value: 'cantho', label: 'Cần Thơ' },
  { value: 'binhduong', label: 'Bình Dương' },
  { value: 'dongnai', label: 'Đồng Nai' },
  { value: 'haiphong', label: 'Hải Phòng' },
  { value: 'longan', label: 'Long An' },
  { value: 'tiengiang', label: 'Tiền Giang' },
  { value: 'lamdong', label: 'Lâm Đồng' },
  // ... thêm 53 tỉnh còn lại
];
```

### Location Filter Logic

```typescript
// In useMarketplaceProducts.ts
if (filters.location) {
  const province = VIETNAM_PROVINCES.find(p => p.value === filters.location);
  if (province) {
    query = query.ilike('location_address', `%${province.label}%`);
  }
}
```

---

## Routes Mới

| Route | Component | Mô tả |
|-------|-----------|-------|
| `/product/:productId` | `ProductDetail` | Chi tiết sản phẩm |
| `/shop/:sellerId` | `SellerShop` | Gian hàng người bán |
| `/wishlist` | `Wishlist` | Sản phẩm đã lưu |

---

## Kết Quả Mong Đợi

Sau khi hoàn thành, marketplace sẽ có:

1. **Product Detail (Tính năng 7)**:
   - Trang chi tiết sản phẩm chuyên nghiệp
   - Gallery ảnh, thông tin đầy đủ
   - Reviews và rating
   - Quick buy actions

2. **Seller Shop (Tính năng 8)**:
   - Gian hàng của mỗi người bán
   - Danh sách tất cả sản phẩm
   - Stats và rating tổng hợp
   - Tăng trust cho buyer

3. **Location Search (Tính năng 9)**:
   - Tìm kiếm theo tỉnh/thành phố
   - Không phụ thuộc GPS
   - UX tốt hơn cho mobile

4. **Wishlist (Tính năng 10)**:
   - Quản lý sản phẩm yêu thích
   - Mua sau dễ dàng
   - Tăng conversion rate

---

## Ghi Chú Quan Trọng

- **SEO**: ProductDetail và SellerShop nên có meta tags tốt cho SEO
- **Performance**: Lazy load images trong gallery
- **Mobile First**: Tất cả pages phải responsive
- **Navigation**: Thêm breadcrumbs để user dễ navigate
- **Analytics**: Track view count cho ProductDetail

