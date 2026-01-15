// Marketplace Types for FUN FARM

export type ProductCategory = 
  | 'vegetables' 
  | 'fruits' 
  | 'rice_grains' 
  | 'meat' 
  | 'seafood' 
  | 'dairy' 
  | 'honey' 
  | 'plants';

export type ProductStatus = 'active' | 'sold_out' | 'hidden' | 'deleted';

export type PaymentMethod = 'camly' | 'bank_transfer' | 'momo' | 'zalopay' | 'crypto';

export type PaymentStatus = 'pending' | 'proof_uploaded' | 'confirmed' | 'completed' | 'refunded' | 'failed';

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';

export interface CategoryInfo {
  id: ProductCategory;
  name: string;
  nameVi: string;
  icon: string;
  color: string;
}

export const PRODUCT_CATEGORIES: CategoryInfo[] = [
  { id: 'vegetables', name: 'Vegetables', nameVi: 'Rau củ', icon: '🥬', color: 'bg-green-500' },
  { id: 'fruits', name: 'Fruits', nameVi: 'Trái cây', icon: '🍎', color: 'bg-red-500' },
  { id: 'rice_grains', name: 'Rice & Grains', nameVi: 'Gạo & Ngũ cốc', icon: '🌾', color: 'bg-amber-500' },
  { id: 'meat', name: 'Meat', nameVi: 'Thịt', icon: '🥩', color: 'bg-rose-600' },
  { id: 'seafood', name: 'Seafood', nameVi: 'Hải sản', icon: '🦐', color: 'bg-blue-500' },
  { id: 'dairy', name: 'Dairy & Eggs', nameVi: 'Sữa & Trứng', icon: '🥛', color: 'bg-orange-400' },
  { id: 'honey', name: 'Honey & Specialties', nameVi: 'Mật ong & Đặc sản', icon: '🍯', color: 'bg-yellow-500' },
  { id: 'plants', name: 'Seedlings', nameVi: 'Cây giống', icon: '🌱', color: 'bg-emerald-500' },
];

export interface MarketplaceFilters {
  category?: ProductCategory;
  minPrice?: number;
  maxPrice?: number;
  distance?: number; // in km
  commitments?: string[];
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'nearest' | 'rating';
  search?: string;
}

export interface MarketplaceProduct {
  id: string;
  author_id: string;
  product_name: string;
  content: string;
  images: string[];
  price_camly: number;
  price_vnd: number;
  quantity_kg: number;
  category: ProductCategory | null;
  product_status: ProductStatus;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  commitments: string[];
  delivery_options: string[];
  created_at: string;
  // Joined data
  author?: {
    id: string;
    display_name: string;
    avatar_url: string;
    is_verified: boolean;
    is_good_heart: boolean;
    reputation_score: number;
  };
  average_rating?: number;
  review_count?: number;
  distance_km?: number;
  is_saved?: boolean;
}

export interface PaymentMethodInfo {
  id: PaymentMethod;
  name: string;
  nameVi: string;
  icon: string;
  description: string;
  available: boolean;
}

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  { 
    id: 'camly', 
    name: 'CAMLY', 
    nameVi: 'Số dư CAMLY', 
    icon: '🪙', 
    description: 'Thanh toán bằng số dư CAMLY trong ví',
    available: true 
  },
  { 
    id: 'bank_transfer', 
    name: 'Bank Transfer', 
    nameVi: 'Chuyển khoản ngân hàng', 
    icon: '🏦', 
    description: 'Chuyển khoản qua QR hoặc số tài khoản',
    available: true 
  },
  { 
    id: 'momo', 
    name: 'Momo', 
    nameVi: 'Ví Momo', 
    icon: '💜', 
    description: 'Thanh toán qua ví điện tử Momo',
    available: true 
  },
  { 
    id: 'zalopay', 
    name: 'ZaloPay', 
    nameVi: 'Ví ZaloPay', 
    icon: '💙', 
    description: 'Thanh toán qua ví điện tử ZaloPay',
    available: true 
  },
  { 
    id: 'crypto', 
    name: 'Crypto', 
    nameVi: 'Tiền điện tử', 
    icon: '₿', 
    description: 'Thanh toán bằng BNB, USDT qua MetaMask',
    available: true 
  },
];

export const DISTANCE_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 30, label: '30 km' },
  { value: 50, label: '50 km' },
  { value: 0, label: 'Toàn quốc' },
];

export const PRICE_RANGES = [
  { min: 0, max: 50000, label: 'Dưới 50k' },
  { min: 50000, max: 200000, label: '50k - 200k' },
  { min: 200000, max: 500000, label: '200k - 500k' },
  { min: 500000, max: Infinity, label: 'Trên 500k' },
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'nearest', label: 'Gần nhất' },
  { value: 'rating', label: 'Đánh giá cao' },
];
