-- Create orders table for product purchases
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL,
  price_per_kg_camly BIGINT NOT NULL,
  price_per_kg_vnd BIGINT,
  total_camly BIGINT NOT NULL,
  total_vnd BIGINT,
  delivery_option TEXT NOT NULL,
  delivery_address TEXT,
  delivery_lat NUMERIC,
  delivery_lng NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  shipper_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Buyers can view their own orders"
ON public.orders FOR SELECT
USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view orders for their products"
ON public.orders FOR SELECT
USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can create orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update order status"
ON public.orders FOR UPDATE
USING (auth.uid() = seller_id);

-- Trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to process order and transfer CAMLY
CREATE OR REPLACE FUNCTION public.process_order(
  p_buyer_id UUID,
  p_seller_id UUID,
  p_post_id UUID,
  p_product_name TEXT,
  p_quantity_kg NUMERIC,
  p_price_per_kg_camly BIGINT,
  p_price_per_kg_vnd BIGINT,
  p_delivery_option TEXT,
  p_delivery_address TEXT DEFAULT NULL,
  p_delivery_lat NUMERIC DEFAULT NULL,
  p_delivery_lng NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_camly BIGINT;
  v_total_vnd BIGINT;
  v_buyer_balance BIGINT;
  v_order_id UUID;
BEGIN
  -- Calculate totals
  v_total_camly := CEIL(p_quantity_kg * p_price_per_kg_camly);
  v_total_vnd := CEIL(p_quantity_kg * COALESCE(p_price_per_kg_vnd, 0));
  
  -- Check buyer balance
  SELECT camly_balance INTO v_buyer_balance FROM public.profiles WHERE id = p_buyer_id;
  
  IF v_buyer_balance IS NULL THEN
    RAISE EXCEPTION 'Buyer profile not found';
  END IF;
  
  IF v_buyer_balance < v_total_camly THEN
    RAISE EXCEPTION 'Insufficient CAMLY balance. Required: %, Available: %', v_total_camly, v_buyer_balance;
  END IF;
  
  -- Deduct from buyer
  UPDATE public.profiles SET camly_balance = camly_balance - v_total_camly WHERE id = p_buyer_id;
  
  -- Add to seller (as pending_reward for now)
  UPDATE public.profiles SET pending_reward = pending_reward + v_total_camly WHERE id = p_seller_id;
  
  -- Create order
  INSERT INTO public.orders (
    buyer_id, seller_id, post_id, product_name, quantity_kg,
    price_per_kg_camly, price_per_kg_vnd, total_camly, total_vnd,
    delivery_option, delivery_address, delivery_lat, delivery_lng, status
  ) VALUES (
    p_buyer_id, p_seller_id, p_post_id, p_product_name, p_quantity_kg,
    p_price_per_kg_camly, p_price_per_kg_vnd, v_total_camly, v_total_vnd,
    p_delivery_option, p_delivery_address, p_delivery_lat, p_delivery_lng, 'pending'
  ) RETURNING id INTO v_order_id;
  
  -- Update post stock
  UPDATE public.posts SET quantity_kg = quantity_kg - p_quantity_kg WHERE id = p_post_id;
  
  RETURN v_order_id;
END;
$$;