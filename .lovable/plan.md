
# Kế Hoạch Fix Giao Diện Đăng Bài Trang Chủ

## Tổng Quan Yêu Cầu

| STT | Yêu cầu | Mô tả |
|-----|---------|-------|
| 1 | **Full Screen Modal** | Khi bấm vào ô đăng bài → hiện giao diện toàn màn hình |
| 2 | **Đổi nút bên dưới** | Thay (Livestream, Ảnh/Video, Cảm xúc) → (Chia sẻ, Bán hàng) |
| 3 | **Dropdown danh mục** | Form bán hàng: dùng Select dropdown cho danh mục thay vì grid button |

---

## Chi Tiết Thay Đổi

### 1. Full Screen Modal

**File**: `src/components/feed/CreatePostModal.tsx`

**Thay đổi**: Điều chỉnh DialogContent để hiển thị toàn màn hình trên mobile và desktop

```text
Trước: 
  className="w-full h-full sm:w-auto sm:h-auto sm:max-w-2xl sm:max-h-[90vh]..."

Sau:
  className="w-screen h-screen max-w-none rounded-none border-0..."
```

---

### 2. Đổi Nút "Livestream, Ảnh/Video, Cảm xúc" → "Chia sẻ, Bán hàng"

**File**: `src/components/profile/ProfileCreatePost.tsx`

**Thay đổi**:
- Bỏ 3 nút cũ (Livestream, Ảnh/Video, Cảm xúc)
- Thay bằng 2 nút mới:
  - 📝 **Chia sẻ** → mở tab `post` (bài viết thường)
  - 🌾 **Bán hàng** → mở tab `product` (form bán nông sản)

```typescript
// Mới:
<Button onClick={() => handleOpenModal("post")}>
  <PenSquare className="w-5 h-5" />
  Chia sẻ
</Button>

<Button onClick={() => handleOpenModal("product")}>
  <ShoppingBag className="w-5 h-5" />
  Bán hàng
</Button>
```

---

### 3. Dropdown Danh Mục (Form Bán Hàng)

**File**: `src/components/feed/ProductPostForm.tsx`

**Thay đổi**: Thay grid buttons bằng Select dropdown đẹp với icon

```typescript
// Trước (grid buttons):
<div className="grid grid-cols-4 gap-2">
  {PRODUCT_CATEGORIES.map(cat => (
    <button>...</button>
  ))}
</div>

// Sau (dropdown select với icon):
<Select value={selectedCategory || ''} onValueChange={(val) => setSelectedCategory(val)}>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Chọn danh mục...">
      {selectedCategory && (
        <span className="flex items-center gap-2">
          {PRODUCT_CATEGORIES.find(c => c.id === selectedCategory)?.icon}
          {PRODUCT_CATEGORIES.find(c => c.id === selectedCategory)?.nameVi}
        </span>
      )}
    </SelectValue>
  </SelectTrigger>
  <SelectContent>
    {PRODUCT_CATEGORIES.map(cat => (
      <SelectItem key={cat.id} value={cat.id}>
        <span className="flex items-center gap-2">
          <span className="text-lg">{cat.icon}</span>
          {cat.nameVi}
        </span>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## Danh Sách Files Thay Đổi

| Action | File Path | Mô tả |
|--------|-----------|-------|
| EDIT | `src/components/profile/ProfileCreatePost.tsx` | Đổi 3 nút → 2 nút (Chia sẻ, Bán hàng) |
| EDIT | `src/components/feed/CreatePostModal.tsx` | Full screen modal + simplified tabs |
| EDIT | `src/components/feed/ProductPostForm.tsx` | Đổi grid → dropdown danh mục |

---

## Thứ Tự Thực Hiện

```text
Bước 1: Fix ProfileCreatePost.tsx - đổi 3 nút thành 2 nút
        ↓
Bước 2: Fix CreatePostModal.tsx - full screen + 2 tabs (Chia sẻ, Bán hàng)
        ↓
Bước 3: Fix ProductPostForm.tsx - dropdown danh mục với icon
```

---

## Chi Tiết Kỹ Thuật

### ProfileCreatePost - Giao diện mới

```text
┌────────────────────────────────────────────┐
│  [Avatar]  "Bạn đang nghĩ gì vậy?"         │
├────────────────────────────────────────────┤
│  [📝 Chia sẻ]         [🌾 Bán hàng]        │
└────────────────────────────────────────────┘
```

### CreatePostModal - 2 tabs thay vì 4

```text
┌────────────────────────────────────────────┐
│  ✨ Tạo Bài Viết Mới                   [X] │
├────────────────────────────────────────────┤
│  [📝 Chia sẻ]  [🌾 Bán hàng]               │
├────────────────────────────────────────────┤
│                                            │
│  (Nội dung form tương ứng)                 │
│                                            │
└────────────────────────────────────────────┘
```

### ProductPostForm - Dropdown danh mục cute

```text
┌────────────────────────────────────────────┐
│  Danh mục sản phẩm                         │
│  ┌────────────────────────────────────┐   │
│  │  🥬 Rau củ                        ▼│   │
│  └────────────────────────────────────┘   │
│  ┌────────────────────────────────────┐   │
│  │  ✓ 🥬 Rau củ                       │   │
│  │    🍎 Trái cây                     │   │
│  │    🥩 Thịt                         │   │
│  │    🦐 Hải sản                      │   │
│  │    🥛 Sữa & Trứng                  │   │
│  │    🌾 Ngũ cốc                      │   │
│  │    🍯 Đặc sản                      │   │
│  │    🌱 Khác                         │   │
│  └────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

---

## Kết Quả Mong Đợi

1. **UX tốt hơn**: Modal full screen dễ sử dụng trên mobile
2. **Đơn giản hơn**: 2 lựa chọn rõ ràng (Chia sẻ / Bán hàng) thay vì 4 options
3. **Giao diện đẹp**: Dropdown danh mục với icon cute theo hình mẫu
4. **Nhất quán**: Giống với giao diện trong hình người dùng chia sẻ
