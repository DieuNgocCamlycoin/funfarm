-- Add pending_reward column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pending_reward bigint NOT NULL DEFAULT 0;

-- Add wallet_connected column to track if user has connected wallet
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wallet_connected boolean NOT NULL DEFAULT false;

-- Update handle_new_user function to set pending_reward = 50000 for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, wallet_address, display_name, pending_reward)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'wallet_address', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', ''),
    50000
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;