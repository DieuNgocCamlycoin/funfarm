# Ke hoach: Sua loi Timezone trong Tra cuu & Bao cao User

## Van de phat hien

Dashboard dang su dung **local timezone** de hien thi ngay, nhung query database lai dung **UTC**. Dieu nay gay ra sai lech so lieu:

- Bai viet tao luc `2026-01-16 18:07:16 UTC` = `2026-01-17 01:07:16 VN time`
- UI hien thi: 17/01/2026 (dung theo gio VN)
- Query filter theo 17/01/2026 UTC -> khong tim thay du lieu

## Giai phap

### Buoc 1: Tao helper function chuyen doi timezone

Them function chuyen timestamp UTC sang Vietnam timezone (UTC+7):

```typescript
// Convert UTC timestamp to Vietnam date string (YYYY-MM-DD)
const toVietnamDate = (utcTimestamp: string): string => {
  const date = new Date(utcTimestamp);
  // Vietnam is UTC+7
  const vietnamTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return format(vietnamTime, 'yyyy-MM-dd');
};
```

### Buoc 2: Cap nhat tat ca noi nhom ngay (allDates)

Thay doi tu:
```typescript
allDates.add(format(new Date(p.created_at), 'yyyy-MM-dd'));
```

Thanh:
```typescript
allDates.add(toVietnamDate(p.created_at));
```

Ap dung cho:
- userPosts (dong 202-204)
- reactionsGiven (dong 217-219)
- commentsGiven (dong 232-234)
- sharesGiven (dong 248-250)
- friendsAdded (dong 264-266)
- reactionsReceived (dong 317-319)
- commentsReceived (dong 320-322)
- sharesReceived (dong 323-325)

### Buoc 3: Cap nhat date filter query

Thay doi tu:
```typescript
const startDateStr = filterStartDate ? format(filterStartDate, 'yyyy-MM-dd') : null;
const endDateStr = filterEndDate ? format(filterEndDate, 'yyyy-MM-dd') + 'T23:59:59' : null;
```

Thanh (chuyen sang UTC truoc khi query):
```typescript
// Convert Vietnam date to UTC for database query
// Start of day in VN = previous day 17:00 UTC
// End of day in VN = current day 16:59:59 UTC
const startDateStr = filterStartDate 
  ? new Date(filterStartDate.getTime() - 7 * 60 * 60 * 1000).toISOString()
  : null;
const endDateStr = filterEndDate
  ? new Date(new Date(filterEndDate).setHours(23, 59, 59, 999) - 7 * 60 * 60 * 1000).toISOString()
  : null;
```

Giai thich:
- Ngay 17/01/2026 theo VN = tu `2026-01-16T17:00:00Z` den `2026-01-17T16:59:59Z` theo UTC
- Query se tim tat ca records trong khoang thoi gian nay

### Buoc 4: Cap nhat ham tinh toan theo ngay

Trong phan lap qua tung ngay (dong 330+), dam bao su dung `toVietnamDate()` de nhom du lieu chinh xac.

### Buoc 5: Cap nhat handleExportAllUsers

Ap dung cung logic timezone cho chuc nang xuat Excel tat ca users.

## Ket qua mong doi

Sau khi sua:
- Dashboard hien thi ngay theo gio Viet Nam
- Query database tim dung du lieu theo gio Viet Nam
- So lieu khop giua UI va database
- Bai viet "15 gio truoc" se duoc tinh dung vao ngay 17/01/2026

## Luu y

- Tat ca thoi gian hien thi cho user se theo gio Viet Nam (UTC+7)
- Database van luu theo UTC (khong thay doi)
- Chi thay doi cach chuyen doi khi doc va filter du lieu
