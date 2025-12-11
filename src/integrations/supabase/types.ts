export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          likes_count: number
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followers_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followers_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          delivery_address: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_option: string
          id: string
          post_id: string
          price_per_kg_camly: number
          price_per_kg_vnd: number | null
          product_name: string
          quantity_kg: number
          seller_id: string
          shipper_id: string | null
          status: string
          total_camly: number
          total_vnd: number | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          delivery_address?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_option: string
          id?: string
          post_id: string
          price_per_kg_camly: number
          price_per_kg_vnd?: number | null
          product_name: string
          quantity_kg: number
          seller_id: string
          shipper_id?: string | null
          status?: string
          total_camly: number
          total_vnd?: number | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          delivery_address?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_option?: string
          id?: string
          post_id?: string
          price_per_kg_camly?: number
          price_per_kg_vnd?: number | null
          product_name?: string
          quantity_kg?: number
          seller_id?: string
          shipper_id?: string | null
          status?: string
          total_camly?: number
          total_vnd?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          comments_count: number
          commitments: string[] | null
          content: string | null
          created_at: string
          delivery_options: string[] | null
          hashtags: string[] | null
          id: string
          images: string[] | null
          is_product_post: boolean
          likes_count: number
          location: string | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          post_type: string
          price_camly: number | null
          price_vnd: number | null
          product_name: string | null
          quantity_kg: number | null
          shares_count: number
          updated_at: string
          video_url: string | null
        }
        Insert: {
          author_id: string
          comments_count?: number
          commitments?: string[] | null
          content?: string | null
          created_at?: string
          delivery_options?: string[] | null
          hashtags?: string[] | null
          id?: string
          images?: string[] | null
          is_product_post?: boolean
          likes_count?: number
          location?: string | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          post_type?: string
          price_camly?: number | null
          price_vnd?: number | null
          product_name?: string | null
          quantity_kg?: number | null
          shares_count?: number
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          author_id?: string
          comments_count?: number
          commitments?: string[] | null
          content?: string | null
          created_at?: string
          delivery_options?: string[] | null
          hashtags?: string[] | null
          id?: string
          images?: string[] | null
          is_product_post?: boolean
          likes_count?: number
          location?: string | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          post_type?: string
          price_camly?: number | null
          price_vnd?: number | null
          product_name?: string | null
          quantity_kg?: number | null
          shares_count?: number
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          camly_balance: number
          cover_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_verified: boolean
          location: string | null
          pending_reward: number
          phone: string | null
          profile_type: Database["public"]["Enums"]["profile_type"]
          referral_code: string | null
          reputation_score: number
          updated_at: string
          wallet_address: string
          wallet_connected: boolean
          welcome_bonus_claimed: boolean
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          camly_balance?: number
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_verified?: boolean
          location?: string | null
          pending_reward?: number
          phone?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"]
          referral_code?: string | null
          reputation_score?: number
          updated_at?: string
          wallet_address: string
          wallet_connected?: boolean
          welcome_bonus_claimed?: boolean
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          camly_balance?: number
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean
          location?: string | null
          pending_reward?: number
          phone?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"]
          referral_code?: string | null
          reputation_score?: number
          updated_at?: string
          wallet_address?: string
          wallet_connected?: boolean
          welcome_bonus_claimed?: boolean
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_claimed: boolean
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          bonus_claimed?: boolean
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          bonus_claimed?: boolean
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      shipper_locations: {
        Row: {
          id: string
          lat: number
          lng: number
          shipper_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          lat: number
          lng: number
          shipper_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          lat?: number
          lng?: number
          shipper_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_verified: boolean | null
          location: string | null
          profile_type: Database["public"]["Enums"]["profile_type"] | null
          reputation_score: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          location?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          reputation_score?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          location?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          reputation_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_order: {
        Args: { p_order_id: string; p_shipper_id: string }
        Returns: boolean
      }
      add_camly_reward: {
        Args: { amount: number; user_id: string }
        Returns: undefined
      }
      calculate_user_rewards: { Args: { p_user_id: string }; Returns: number }
      complete_delivery: {
        Args: { p_order_id: string; p_shipper_id: string }
        Returns: boolean
      }
      get_public_profiles: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          bio: string
          cover_url: string
          created_at: string
          display_name: string
          id: string
          is_verified: boolean
          location: string
          profile_type: Database["public"]["Enums"]["profile_type"]
          reputation_score: number
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_order: {
        Args: {
          p_buyer_id: string
          p_delivery_address?: string
          p_delivery_lat?: number
          p_delivery_lng?: number
          p_delivery_option: string
          p_post_id: string
          p_price_per_kg_camly: number
          p_price_per_kg_vnd: number
          p_product_name: string
          p_quantity_kg: number
          p_seller_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "shipper"
      profile_type:
        | "farmer"
        | "fisher"
        | "eater"
        | "restaurant"
        | "distributor"
        | "shipper"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "shipper"],
      profile_type: [
        "farmer",
        "fisher",
        "eater",
        "restaurant",
        "distributor",
        "shipper",
      ],
    },
  },
} as const
