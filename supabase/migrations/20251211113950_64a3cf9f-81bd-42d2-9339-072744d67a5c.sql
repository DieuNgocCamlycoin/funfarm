-- Add location columns to profiles table for storing user's farm/business location
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS location_lat numeric,
ADD COLUMN IF NOT EXISTS location_lng numeric,
ADD COLUMN IF NOT EXISTS location_address text;

-- Add realtime support for shipper_locations
ALTER TABLE public.shipper_locations REPLICA IDENTITY FULL;

-- Create index for faster location queries
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(location_lat, location_lng) WHERE location_lat IS NOT NULL;