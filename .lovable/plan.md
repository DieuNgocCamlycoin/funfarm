

# Kế Hoạch: Đổi Giao Diện Trang Chủ - 2 Nút Chia Sẻ & Bán Hàng

## Vấn Đề Hiện Tại

Trang chủ (Feed) đang hiển thị 3 nút cũ:
- Livestream
- Ảnh/Video  
- Cảm xúc

## Thay Đổi Mong Muốn

Đổi thành 2 nút giống như đã làm ở `ProfileCreatePost.tsx`:
- **Chia sẻ** (mở tab đăng bài thường)
- **Bán hàng** (mở tab đăng sản phẩm)

## Giao Diện Sau Khi Sửa

```
┌─────────────────────────────────────────────────────┐
│  [Avatar]  Bạn đang nghĩ gì vậy?                    │
├─────────────────────────────────────────────────────┤
│      [✏️ Chia sẻ]     |     [🛒 Bán hàng]          │
└─────────────────────────────────────────────────────┘
```

---

## Chi Tiết Kỹ Thuật

### File cần sửa: `src/components/feed/CreatePost.tsx`

**Thay đổi:**

1. **Cập nhật imports:**
   - Xóa: `Video`, `Image`, `Smile`
   - Thêm: `PenSquare`, `ShoppingBag`

2. **Thêm props mới:**
   - `onOpenModalWithTab?: (tab: string) => void` để mở modal với tab cụ thể

3. **Thay 3 nút cũ thành 2 nút mới:**

| Nút Cũ | Nút Mới | Icon | Màu sắc |
|--------|---------|------|---------|
| Livestream | Chia sẻ | PenSquare | text-primary (xanh dương) |
| Ảnh/Video | - | - | - |
| Cảm xúc | Bán hàng | ShoppingBag | text-green-600 (xanh lá) |

4. **Logic click:**
   - Nút "Chia sẻ" → Gọi `onOpenModalWithTab("post")`
   - Nút "Bán hàng" → Gọi `onOpenModalWithTab("product")`

### File cần sửa: `src/pages/Feed.tsx`

**Thay đổi:**
- Cập nhật cách gọi `CreatePost` component với prop mới để mở đúng tab

---

## Code Thay Đổi

### CreatePost.tsx (Sau khi sửa)

```tsx
// Imports mới
import { PenSquare, ShoppingBag } from "lucide-react";

// Props mới
interface CreatePostProps {
  onOpenModal?: () => void;
  onOpenModalWithTab?: (tab: string) => void;
}

// Buttons mới
<Button 
  variant="ghost" 
  className="flex-1 gap-2 text-primary hover:bg-primary/10"
  onClick={() => onOpenModalWithTab?.("post") || onOpenModal?.()}
>
  <PenSquare className="w-5 h-5" />
  <span className="font-medium">Chia sẻ</span>
</Button>

<div className="w-px h-6 bg-border" />

<Button 
  variant="ghost" 
  className="flex-1 gap-2 text-green-600 hover:bg-green-100/50"
  onClick={() => onOpenModalWithTab?.("product") || onOpenModal?.()}
>
  <ShoppingBag className="w-5 h-5" />
  <span className="font-medium">Bán hàng</span>
</Button>
```

---

## Kết Quả

- Giao diện trang chủ đồng bộ với `ProfileCreatePost`
- 2 nút rõ ràng: Chia sẻ (bài thường) và Bán hàng (sản phẩm)
- Người dùng có thể nhanh chóng chọn loại bài muốn đăng

