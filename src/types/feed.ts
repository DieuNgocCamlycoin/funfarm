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
}

export interface Comment {
  id: string;
  author: User;
  content: string;
  createdAt: string;
  likes: number;
}
