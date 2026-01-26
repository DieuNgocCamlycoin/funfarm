

# Kế Hoạch: Modal Đăng Bài Căn Giữa & Giao Diện Facebook-Style

## Mục Tiêu
1. **Căn giữa modal** khi người dùng nhấp "Tạo bài viết" (thay vì full-screen)
2. **Thiết kế giao diện chia sẻ** tương tự Facebook (như hình tham khảo)

---

## Phân Tích Hiện Tại

**Vấn đề:**
- `DialogContent` đang dùng `w-screen h-screen` → full-screen trên mọi thiết bị
- Class `sm:left-0 sm:top-0 sm:translate-x-0 sm:translate-y-0` ghi đè cả trên desktop

**Thiết kế Facebook cần:**
- Modal căn giữa với kích thước cố định (~500px width)
- Header đơn giản: "Tạo bài viết" + nút X
- Avatar + Tên + Dropdown "Công khai"
- Textarea không border, placeholder italic
- Thanh công cụ dưới cùng với icons (Ảnh, Tag bạn bè, Emoji, Vị trí, ...)
- Nút "Đăng" full-width ở cuối

---

## Thay Đổi Chi Tiết

### 1. Sửa CreatePostModal.tsx - Responsive Layout

**Mobile (< 640px):** Giữ full-screen như cũ (tốt cho UX mobile)

**Desktop (≥ 640px):** Modal căn giữa, kích thước cố định

```
DialogContent classes mới:
- Mobile: w-full h-full max-w-none (full-screen)
- Desktop: sm:w-[500px] sm:h-auto sm:max-h-[85vh] sm:rounded-xl sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
```

### 2. Thiết kế Lại Header (Facebook-Style)

```
┌──────────────────────────────────────────┐
│           Tạo bài viết           [X]     │
├──────────────────────────────────────────┤
│  [Avatar] Tên Người Dùng                 │
│           🌐 Công khai ▼                 │
└──────────────────────────────────────────┘
```

- Title căn giữa, font đậm
- Nút X bên phải (có sẵn từ DialogClose)
- Dropdown "Công khai" dưới tên (UI display only - chưa functional)

### 3. Textarea Facebook-Style

```
┌──────────────────────────────────────────┐
│  [Tên] ơi, bạn đang nghĩ gì thế?         │
│                                          │
│  (Placeholder italic, không border,      │
│   background transparent)                │
└──────────────────────────────────────────┘
```

- Textarea không có border
- Background trong suốt
- Placeholder sử dụng tên người dùng (nếu có)
- Icon emoji & Aa bên dưới textarea

### 4. Thanh Công Cụ Dưới Cùng

```
┌──────────────────────────────────────────┐
│  Thêm vào bài viết của bạn               │
│        [📷] [👥] [😊] [📍] [📞] [...]    │
├──────────────────────────────────────────┤
│              [ Đăng ]                    │
└──────────────────────────────────────────┘
```

Icons theo thứ tự Facebook:
- 📷 Ảnh/Video (xanh lá)
- 👥 Tag bạn bè (xanh dương)
- 😊 Cảm xúc (vàng)
- 📍 Vị trí (đỏ)
- 📞 WhatsApp/Liên hệ (xanh lá đậm)
- ... More options

### 5. Giữ Nguyên Tab Chia sẻ/Bán hàng

Tabs "Chia sẻ" và "Bán hàng" vẫn giữ nguyên vị trí, nhưng giao diện mỗi tab sẽ được cập nhật theo style mới.

---

## Các File Cần Sửa

| File | Thay Đổi |
|------|----------|
| `src/components/feed/CreatePostModal.tsx` | Layout modal, header, textarea, toolbar |

---

## Preview Giao Diện Sau Khi Sửa

### Desktop (≥ 640px)
```
┌─────────────────────────────────────────────────┐
│              Tạo bài viết              [X]      │
├─────────────────────────────────────────────────┤
│   ┌────┐                                        │
│   │ 🖼️ │ ANGEL DIỆU NGỌC                       │
│   └────┘ 🌐 Công khai ▼                         │
├─────────────────────────────────────────────────┤
│                                          [Aa]   │
│  Ngọc ơi, bạn đang nghĩ gì thế?          [😊]   │
│                                                 │
│                                                 │
│                                                 │
│  [Grid ảnh đã upload nếu có]                    │
│                                                 │
├─────────────────────────────────────────────────┤
│  Thêm vào bài viết của bạn                      │
│  ────────────────────────  [📷][👥][😊][📍][…]  │
├─────────────────────────────────────────────────┤
│               [      Đăng      ]                │
└─────────────────────────────────────────────────┘
         Kích thước: 500px width
         Căn giữa màn hình
```

### Mobile (< 640px)
Giữ nguyên full-screen như hiện tại để đảm bảo UX tốt trên điện thoại.

---

## Lưu Ý Kỹ Thuật

1. **Dropdown "Công khai"**: Chỉ hiển thị UI, chưa thêm chức năng chọn privacy (có thể mở rộng sau)

2. **Giữ nguyên logic upload ảnh/video**: Không thay đổi code xử lý file

3. **Giữ nguyên auto-save draft**: Tính năng lưu nháp vẫn hoạt động

4. **Responsive**: Mobile vẫn full-screen, Desktop căn giữa

