# Báo Cáo Tiến Độ & Kế Hoạch Hoàn Thiện FUN FARM

## 1. Hiện trạng dự án (đã kiểm tra trực tiếp trong code)

Quy mô hiện tại:
- 20 trang (routes) trong `src/App.tsx`
- ~35 bảng dữ liệu + ~20 database function
- 13 edge function (claim-camly, angel-chat, check-content, check-avatar, upload-r2, merge tools, bscscan history...)
- 14 tab Admin Dashboard
- 5 file test (chỉ ở tầng logic tính thưởng / honor board / ngày giờ)

## 2. Đánh giá độ hoàn thiện theo mảng

| Mảng | Trạng thái | Ghi chú |
|------|-----------|---------|
| Mạng xã hội (Feed, post, comment, like, share, story, ảnh) | Gần hoàn thiện | Đủ trang Feed, PostDetail, Profile, UserProfile |
| Hồ sơ & bạn bè | Gần hoàn thiện | FriendsList, FriendRequests, FriendSearch, follow |
| Ví & CAMLY (MetaMask, claim, tặng quà, lịch sử, biểu đồ giá) | Gần hoàn thiện | Có claim on-chain BSC, gift flow đầy đủ |
| Hệ thống thưởng V3.1 (cộng/trừ/thu hồi, giới hạn ngày) | Hoàn thiện | Đã có trigger revoke cho unlike, unshare, ban user |
| Admin Dashboard | Hoàn thiện | 14 tab, `has_role()` + bảng `user_roles` riêng |
| Angel AI (companion + chat) | Hoàn thiện | Có edge function `angel-chat`, bảng lưu hội thoại |
| Bảng vinh danh / xếp hạng | Hoàn thiện | HonorBoard, TopRanking, TopSponsor, Leaderboard |
| SSO Fun Profile (Fun-ID) | Cơ bản xong | Có callback, link Fun-ID, webhook, merge conflict tool |
| Marketplace (đăng bán, mua) | Làm dở | Có ProductPostForm, ProductPostCard, BuyProductModal gọi `process_order`, nhưng **thiếu trang đơn hàng cho người mua và người bán** |
| Giao vận (shipper) | Làm dở | Có ShipperDashboard + bản đồ; người mua không có trang theo dõi đơn |
| Livestream | Mới có dữ liệu | Đã có bảng `livestreams`, `livestream_comments/likes/shares` và logic thưởng, nhưng **không có trang/route livestream nào trong app** |
| Đánh giá sản phẩm & lưu sản phẩm | Chưa dùng | Bảng `product_reviews`, `saved_products` tồn tại nhưng frontend chưa gọi tới |
| Kiểm thử tự động | Yếu | Chỉ test tầng lib, chưa test component/luồng |
| Tài liệu | Rải rác | `docs/` + `.lovable/packages/`, chưa có trang tài liệu trong app |

**Ước tính tổng thể: khoảng 75–80% hoàn thiện.** Phần lõi (social + thưởng + ví + admin) đã chạy được; phần thương mại (đơn hàng, giao vận, livestream) mới xong một nửa.

## 3. Những việc cần làm thêm

Ưu tiên 1 – Đóng vòng đời đơn hàng (đang hở nhất):
- Trang "Đơn hàng của tôi" cho người mua: danh sách, trạng thái, chi tiết, theo dõi shipper trên bản đồ, xác nhận đã nhận
- Trang "Đơn bán" cho người bán: nhận đơn, chuẩn bị, bàn giao shipper, huỷ đơn
- Khung chat đơn hàng (bảng `order_messages` đã có sẵn nhưng chưa dùng)
- Thông báo realtime khi đơn đổi trạng thái

Ưu tiên 2 – Marketplace đầy đủ:
- Trang Marketplace riêng: tìm kiếm, lọc theo loại nông sản, giá, khoảng cách, tình trạng còn hàng
- Lưu sản phẩm yêu thích (dùng `saved_products`)
- Đánh giá sau khi nhận hàng (dùng `product_reviews`) + hiển thị điểm uy tín người bán

Ưu tiên 3 – Livestream:
- Trang danh sách livestream đang phát + trang xem livestream
- Bình luận / tim / chia sẻ realtime, nối vào logic thưởng đã có
- Nút bắt đầu livestream cho người bán

Ưu tiên 4 – Chất lượng & vận hành:
- Test cho các luồng quan trọng: đặt hàng, claim thưởng, tặng quà
- Rà soát RLS và cảnh báo bảo mật còn tồn đọng
- Tối ưu Feed (phân trang / cuộn vô hạn, lazy ảnh)
- Trang tài liệu nội bộ trong app cho thành viên mới

## 4. Kế hoạch triển khai theo giai đoạn

| Giai đoạn | Nội dung | Kết quả mong đợi |
|-----------|----------|------------------|
| GĐ 1 | Vòng đời đơn hàng người mua + người bán, chat đơn hàng, thông báo trạng thái | Mua bán dùng thật được đầu-cuối |
| GĐ 2 | Trang Marketplace, bộ lọc, lưu sản phẩm, đánh giá sau mua | Trải nghiệm chợ nông sản hoàn chỉnh |
| GĐ 3 | Livestream: danh sách, xem, tương tác realtime, gắn thưởng | Kênh bán hàng trực tiếp |
| GĐ 4 | Test, bảo mật, tối ưu hiệu năng, tài liệu | Sẵn sàng mở rộng người dùng |

Mỗi giai đoạn làm xong sẽ kiểm thử rồi mới sang giai đoạn kế tiếp.

## 5. Chi tiết kỹ thuật

- Trang mới dự kiến: `src/pages/Orders.tsx`, `src/pages/OrderDetail.tsx`, `src/pages/SellerOrders.tsx`, `src/pages/Marketplace.tsx`, `src/pages/Livestreams.tsx`, `src/pages/LivestreamRoom.tsx`; đăng ký route trong `src/App.tsx`
- Tái sử dụng: `OrderTrackingMap`, `ShipperMap`, `ProductPostCard`, `BuyProductModal`, RPC `process_order` / `accept_order` / `complete_delivery`
- Realtime: dùng Supabase realtime channel cho `orders`, `order_messages`, `livestream_comments`
- Bảng cần dùng nhưng chưa có UI: `order_messages`, `product_reviews`, `saved_products`, `livestreams`
- Có thể cần migration bổ sung: RLS cho `order_messages`, `product_reviews`, `saved_products` (sẽ kiểm tra và bổ sung GRANT + policy trước khi viết UI)
- Không đụng tới logic thưởng V3.1 hiện tại, chỉ nối thêm sự kiện livestream vào luồng đã có
