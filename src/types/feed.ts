export type UserType = 'farm' | 'fisher' | 'ranch' | 'buyer' | 'restaurant' | 'distributor' | 'shipper' | 'reviewer';

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  type: UserType;
  verified: boolean;
  reputationScore: number;
  location: string;
  followers: number;
  following: number;
  isGoodHeart?: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  stock: number;
  harvestDate: string;
  organic: boolean;
  certifications: string[];
  estimatedDelivery: string;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  images: string[];
  video?: string;
  product?: Product;
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  isLiked: boolean;
  isSaved: boolean;
  hashtags: string[];
  location?: string;
  isLive?: boolean;
  // Product post fields (FUN FARM marketplace)
  is_product_post?: boolean;
  product_name?: string;
  price_camly?: number;
  price_vnd?: number;
  quantity_kg?: number;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  delivery_options?: string[];
  commitments?: string[];
}

export interface Comment {
  id: string;
  author: User;
  content: string;
  createdAt: string;
  likes: number;
}
