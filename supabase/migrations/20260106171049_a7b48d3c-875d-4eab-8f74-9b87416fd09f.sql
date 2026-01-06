-- Add law_of_light_accepted columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS law_of_light_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS law_of_light_accepted_at TIMESTAMP WITH TIME ZONE;