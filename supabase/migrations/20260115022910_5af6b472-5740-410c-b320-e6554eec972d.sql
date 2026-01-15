-- Phase 1: Marketplace Database Schema

-- 1. Add category column to posts for product categorization
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category text;

-- 2. Add product_status for managing product visibility
ALTER TABLE posts ADD COLUMN IF NOT EXISTS product_status text DEFAULT 'active';

-- 3. Add payment-related columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'camly';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_url text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_confirmed_by uuid REFERENCES profiles(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_note text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_note text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_reason text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES profiles(id);

-- 4. Create saved_products table for wishlist
CREATE TABLE IF NOT EXISTS saved_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved products" 
ON saved_products FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can save products" 
ON saved_products FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave products" 
ON saved_products FOR DELETE 
USING (auth.uid() = user_id);

-- 5. Create product_reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  images text[],
  created_at timestamptz DEFAULT now(),
  UNIQUE(order_id)
);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews" 
ON product_reviews FOR SELECT 
USING (true);

CREATE POLICY "Buyers can create reviews for their orders" 
ON product_reviews FOR INSERT 
WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can update own reviews" 
ON product_reviews FOR UPDATE 
USING (auth.uid() = reviewer_id);

-- 6. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category) WHERE is_product_post = true;
CREATE INDEX IF NOT EXISTS idx_posts_product_status ON posts(product_status) WHERE is_product_post = true;
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_saved_products_user ON saved_products(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_seller ON product_reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_post ON product_reviews(post_id);