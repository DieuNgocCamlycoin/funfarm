# FUN FARM – Kiến trúc mới & Phase 1

North Star: Social → Trust → Commerce → Verified Contribution → Reward.
Trải nghiệm lõi: See → Trust → Chat → Buy → Receive → Review → Reward.

## Phản hồi ngắn về 10 quyết định của Cha

Toàn bộ 10 điểm đều được tiếp thu. Ba điểm làm thay đổi rõ nhất so với bản kế hoạch trước:

- Farm Post ≠ Product Post: composer tách "Farm Update" và "Sell in this post" thành hai công tắc độc lập.
- Chat phải sống trước khi có đơn: cần tầng `conversations` riêng, không dựa vào `order_messages`.
- Love Score và phần thưởng không cộng trực tiếp từ hành vi, mà đi qua tầng sự kiện đã xác thực (verified event → PLP → quyết định thưởng).

Ba điều cần Cha lưu ý về hiện trạng (đã kiểm tra trong code):

- Toàn hệ thống hiện chưa dùng chữ "Light Score"; điểm uy tín đang là `contribution_score` (persistence). Việc đổi tên là đưa tên **Love Score** ra UI một cách thống nhất, không phải đổi tên hàng loạt cái đang có.
- Số lượng hiện đang hard-code `quantity_kg` trong bảng `posts` và trong `src/types/feed.ts` → cần thêm `quantity_value` + `unit` và giữ `quantity_kg` như trường cũ để không vỡ dữ liệu.
- Chưa có bảng `conversations` / `messages`; chỉ có `order_messages` (gắn cứng vào đơn hàng) và cũng chưa có UI nào dùng nó.

## Nguyên tắc kiến trúc chốt cho mọi phase sau

| Chủ đề | Quyết định |
|--------|-----------|
| Điểm uy tín | Gọi là **Love Score** ở mọi UI/component/tài liệu; `contribution_score` chỉ tồn tại ở tầng dữ liệu |
| Loại bài | `post_kind`: post · video · farm_update · story; cờ bán hàng `is_selling` độc lập |
| Số lượng | `quantity_value` + `unit` (kg, g, ton, piece, box, pack, bunch, dozen, liter, tray) |
| Chat | `conversations` · `conversation_members` · `messages`, tham chiếu tùy chọn product/post/order/offer |
| Thưởng | `reward_asset` · `reward_amount` · `reward_rule_id` · `source_event_id` – không khoá vào CAMLY |
| Tin cậy | `trust_events` (verified) → PLP đánh giá → mới sinh Love Score / reward |
| Sản phẩm | `availability`: available_now · harvesting_today · pre_order · next_harvest · sold_out |
| Nguồn gốc | Product → Farm → Farmer, có action 🌱 View Source ngay từ MVP |

## Phase 1 – Navigation + Unified Home Feed (làm ngay)

Chỉ đụng tầng giao diện, không sửa logic thưởng, không redesign phần đang chạy tốt.

1. **Bottom nav 5 tab**: 🏠 Home · 🌱 Farm · ➕ · 🛒 Market · 👤 Me.
   - Ví, Thông báo chuyển lên thanh trên của Home (🔍 · 🔔 · 💬) để không mất lối vào.
   - Farm và Market ở Phase 1 mở trang khung (placeholder có tiêu đề + trạng thái "đang mở dần"), tránh dead link.
2. **Nút ➕ mở action sheet** với 5 lựa chọn: Post · Video · Farm Update · Sell Product · Story. Mỗi lựa chọn truyền `post_kind` (và `is_selling` cho Sell Product) vào composer hiện có — không mở thẳng modal như trước.
3. **Home feed hợp nhất**:
   - Thanh trên: Search · Notification · Chat (icon Chat tạm trỏ tới trang khung của Phase 5).
   - Story bar dùng dữ liệu thật thay dữ liệu mẫu: Story của bạn · Farm Story · Trending.
   - Post card: avatar · tên · **Love Score ⭐** · badge 🌱 khi là bài farm · nội dung · ảnh/video · nút 🛒 Mua ngay chỉ khi bài có bán · Thích/Bình luận/Chia sẻ.
4. **Component dùng chung tạo mới ở Phase 1** để các phase sau cắm vào: `LoveScoreBadge`, `FarmBadge`, `AvailabilityBadge`, `formatQuantity(value, unit)`.

Phase 1 không tạo bảng mới; chỉ đọc dữ liệu đã có.

## Kiểm tra phụ thuộc Phase 2–7 (làm trước khi code Phase 1)

Rà soát để UI Phase 1 không khoá kiến trúc:

- `posts`: cần bổ sung (Phase 2) `post_kind`, `is_selling`, `quantity_value`, `unit`, `availability`, `next_harvest_date`, `farm_id`. Phase 1 đọc qua lớp bọc dữ liệu (adapter) để khi thêm cột không phải sửa lại UI.
- `farms`: chưa có – Phase 4 tạo, liên kết `product → farm → farmer`.
- `conversations` / `conversation_members` / `messages` / `offers`: chưa có – Phase 5.
- `trust_events` + PLP: chưa có – Phase 6–7; `product_reviews` hiện có sẽ được gắn ràng buộc "chỉ hợp lệ khi có giao dịch đã xác thực".
- Bảng thưởng: giữ nguyên V3.1, Phase 7 mới bổ sung các cột trừu tượng `reward_asset` / `reward_rule_id` / `source_event_id`.
- `order_messages` giữ nguyên, Phase 5 sẽ nối vào `conversations` thay vì mở rộng thêm.

## Lộ trình

| Phase | Nội dung |
|-------|----------|
| 1 | Navigation + Unified Home Feed |
| 2 | Farm Feed + Create Composer (kind + sell độc lập, quantity/unit) |
| 3 | Market + Product + Product Detail (availability, harvest badge) |
| 4 | Profile + Farm Profile + View Source |
| 5 | Conversation + Chat + Offer |
| 6 | Orders + Reviews + Verified Trust Events |
| 7 | PLP + Love Score + Reward integration |
| 8 | Map + Nearby + Logistics + AI recommendation |

## Chi tiết kỹ thuật Phase 1

- Sửa: `src/components/MobileBottomNav.tsx` (5 tab, nút giữa nổi), `src/components/feed/StoryBar.tsx` (bỏ mock), `src/components/feed/FeedPost.tsx` (Love Score, badge farm, nút mua có điều kiện), `src/pages/Feed.tsx` (thanh trên), `src/App.tsx` (route mới).
- Thêm: `src/pages/FarmFeed.tsx`, `src/pages/Market.tsx` (khung), `src/components/create/CreateActionSheet.tsx`, `src/components/common/LoveScoreBadge.tsx`, `FarmBadge`, `AvailabilityBadge`, `src/lib/quantity.ts`.
- `CreatePostModal` nhận thêm `postKind` và `isSelling` thay vì `initialTab` dạng chuỗi tự do; giữ tương thích ngược cho các nơi đang gọi.
- Tái sử dụng nguyên trạng: `BuyProductModal`, `ProductPostCard`, `ProductPostForm`, `LocationPicker`.
- Mobile-first, thao tác một tay: vùng chạm tối thiểu 44px, nút chính nằm trong tầm ngón cái, thêm padding dưới cho các trang chính.
