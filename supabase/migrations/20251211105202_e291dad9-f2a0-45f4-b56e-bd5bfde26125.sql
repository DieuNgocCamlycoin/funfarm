-- Add shipper location tracking table
CREATE TABLE public.shipper_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shipper_id)
);

-- Enable RLS
ALTER TABLE public.shipper_locations ENABLE ROW LEVEL SECURITY;

-- Policies for shipper_locations
CREATE POLICY "Shippers can manage their own location"
ON public.shipper_locations
FOR ALL
USING (auth.uid() = shipper_id)
WITH CHECK (auth.uid() = shipper_id);

CREATE POLICY "Anyone can view shipper locations"
ON public.shipper_locations
FOR SELECT
USING (true);

-- Enable realtime for orders and shipper_locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipper_locations;

-- Add policy for shippers to view pending orders
CREATE POLICY "Shippers can view pending orders"
ON public.orders
FOR SELECT
USING (
  status = 'pending' AND 
  delivery_option = 'nationwide' AND
  public.has_role(auth.uid(), 'shipper')
);

-- Add policy for shippers to view their own delivering orders
CREATE POLICY "Shippers can view their delivering orders"
ON public.orders
FOR SELECT
USING (shipper_id = auth.uid());

-- Function to accept order
CREATE OR REPLACE FUNCTION public.accept_order(p_order_id UUID, p_shipper_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_status TEXT;
BEGIN
  -- Check if shipper has the role
  IF NOT public.has_role(p_shipper_id, 'shipper') THEN
    RAISE EXCEPTION 'User is not a shipper';
  END IF;

  -- Check order status
  SELECT status INTO v_order_status FROM public.orders WHERE id = p_order_id;
  
  IF v_order_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  IF v_order_status != 'pending' THEN
    RAISE EXCEPTION 'Order already taken';
  END IF;

  -- Update order
  UPDATE public.orders
  SET shipper_id = p_shipper_id, status = 'delivering', updated_at = now()
  WHERE id = p_order_id AND status = 'pending';

  RETURN TRUE;
END;
$$;

-- Function to complete delivery
CREATE OR REPLACE FUNCTION public.complete_delivery(p_order_id UUID, p_shipper_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_fee BIGINT := 5000; -- 5000 CAMLY per delivery
BEGIN
  -- Check shipper owns this order
  IF NOT EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = p_order_id AND shipper_id = p_shipper_id AND status = 'delivering'
  ) THEN
    RAISE EXCEPTION 'Invalid order or not your delivery';
  END IF;

  -- Update order status
  UPDATE public.orders
  SET status = 'delivered', updated_at = now()
  WHERE id = p_order_id;

  -- Pay shipper
  UPDATE public.profiles
  SET pending_reward = pending_reward + v_delivery_fee
  WHERE id = p_shipper_id;

  RETURN TRUE;
END;
$$;