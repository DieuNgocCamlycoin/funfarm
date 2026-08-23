# FUN FARM – Wireframe Mobile-First: Social có thể mua ngay trong post

Triển khai đúng bộ wireframe Cha đưa: 5 tab bottom nav, feed hợp nhất, Farm feed kiểu TikTok, post bật "Farm mode", Market, Product Detail, Profile có tab Farm, Chat mua hàng.

## Hiện trạng (đã kiểm tra trong code)

- Bottom nav hiện có 4 mục: Trang chủ, Ví & Quà, Thông báo, Cá nhân — chưa có Farm, chưa có nút Post ở giữa, chưa có Market.
- Đã có sẵn: Feed, PostDetail, Profile, UserProfile, StoryBar (đang dùng dữ liệu mẫu), ProductPostForm, ProductPostCard, BuyProductModal (gọi RPC `process_order`), LocationPicker, OrderTrackingMap.
- Chưa có trang: Farm feed, Market, Product Detail (trang riêng), Chat.
- Bảng dữ liệu đã có nhưng chưa có UI: `order_messages`, `product_reviews`, `saved_products`.
- Bài đăng đã hỗ trợ trường sản phẩm (`is_product_post`, `price_camly`, `quantity_kg`, `location_*`, `delivery_options`) và có `video`.

## Giai đoạn 1 – Khung điều hướng 5 tab

- Đổi bottom nav thành: 🏠 Home · 🌱 Farm · ➕ Post · 🛒 Market · 👤 Profile.
- Nút ➕ ở giữa nổi bật, mở thẳng modal tạo bài (không chuyển trang).
- Ví, Thông báo, Reward chuyển vào thanh trên cùng của Home (🔍 Tìm kiếm · 🔔 Thông báo · 💬 Chat) và menu Ecosystem, để không mất lối vào.

## Giai đoạn 2 – Home feed hợp nhất

- Thanh trên: Search · Notification · Chat.
- Story bar: "Story của bạn", Farm Story, Trending (thay dữ liệu mẫu bằng dữ liệu thật).
- Post card: Avatar · Tên · Light Score ⭐ · badge 🌱 nếu là nhà nông; nội dung; ảnh/video; nếu có sản phẩm thì tự hiện nút 🛒 Mua ngay; Thích · Bình luận · Chia sẻ.

## Giai đoạn 3 – Farm tab (TikTok nông sản)

- Feed video toàn màn hình, cuộn dọc từng bài, tự phát khi vào khung nhìn, tắt tiếng mặc định.
- Overlay: tên + avatar nhà nông, vị trí, tiêu đề sản phẩm, Light Score, giá CAMLY, nút 🛒 Mua ngay.
- Cột hành động bên phải: ❤️ · 💬 · 🔁 · 💾 (lưu vào `saved_products`).
- Thanh lọc danh mục cuộn ngang: Rau · Trái cây · Hải sản · Organic; tìm kiếm + "Gần bạn".
- Nút chuyển 🗺 Map View: hiện pin các farm kèm khoảng cách.

## Giai đoạn 4 – Create Post "Farm mode"

- Một màn duy nhất: tải ảnh/video, viết caption, ô tick "Đây là bài Farm 🌱".
- Khi tick mới hiện: Giá · Số lượng · Địa điểm · Hình thức giao.
- Hai nút: Đăng · Lưu nháp (nháp lưu tại máy, đã có sẵn cơ chế nháp).

## Giai đoạn 5 – Market & Product Detail

- Market: tìm kiếm, bộ lọc (Giá · Khoảng cách · Organic · Đánh giá), lưới sản phẩm 2 cột (ảnh, tên, giá, sao).
- Product Detail: slider ảnh/video; tên; người bán; Light Score; số đánh giá; giá; tồn kho; khoảng cách; nút 🛒 Mua ngay và 💬 Chat với nhà nông.
- Danh sách đánh giá lấy từ `product_reviews`; cho phép đánh giá sau khi nhận hàng.

## Giai đoạn 6 – Profile có tab Farm

- Đầu trang: avatar, tên, Light Score, bio, nút Theo dõi · Nhắn tin.
- Tabs: Bài viết · 🌱 Farm · 🛒 Sản phẩm · ⭐ Đánh giá.
- Tab Farm: tên farm, địa điểm, ảnh bìa, câu chuyện farm, các bài viết của farm.

## Giai đoạn 7 – Chat mua hàng

- Danh sách hội thoại + phòng chat realtime giữa người mua và nhà nông (dùng `order_messages`).
- Trong khung chat có 💰 Gửi báo giá và 🛒 Mua trực tiếp.
- Thông báo realtime khi có tin nhắn mới.

## Giai đoạn 8 – Vòng tròn tin cậy

- Sau khi nhận hàng: nhắc đánh giá → cộng Light Score cho nhà nông → ghi thưởng CAMLY theo luật thưởng V3.1 hiện hành.

## Chi tiết kỹ thuật

- Trang mới: `src/pages/FarmFeed.tsx`, `src/pages/Market.tsx`, `src/pages/ProductDetail.tsx`, `src/pages/Chat.tsx` (danh sách + phòng), đăng ký route trong `src/App.tsx`.
- Component mới: `FarmVideoCard`, `CategoryScroll`, `MarketFilters`, `ProductGrid`, `ReviewList`, `ChatRoom`, `FarmTab`; tái sử dụng `BuyProductModal`, `ProductPostCard`, `LocationPicker`, `OrderTrackingMap`.
- `MobileBottomNav` viết lại thành 5 mục với nút giữa nổi.
- `CreatePostModal` gộp `ProductPostForm` thành phần bung ra khi tick "bài Farm" thay vì tab riêng.
- Light Score: dùng công thức uy tín sẵn có trong `honorBoardQueries` / `contribution_score`, hiển thị thống nhất qua một component badge.
- Realtime: channel Supabase cho `order_messages`, cập nhật tồn kho khi đặt hàng.
- Trước khi viết UI sẽ kiểm tra và bổ sung GRANT + RLS cho `order_messages`, `product_reviews`, `saved_products` nếu còn thiếu.
- Video autoplay dùng IntersectionObserver, `playsInline` + `muted` để chạy được trên iOS.
- Không đổi logic thưởng V3.1, chỉ nối thêm sự kiện đánh giá / mua hàng vào luồng đã có.

## Đề xuất thứ tự làm

Làm GĐ 1–2 trước (khung nav + feed hợp nhất) để thấy hình hài ngay, rồi GĐ 3–4 (Farm feed + Farm mode) vì đây là trái tim sản phẩm, sau đó mới tới Market, Product Detail, Profile, Chat.
