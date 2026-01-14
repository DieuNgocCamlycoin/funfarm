-- Fix RLS policy on user_roles to allow admin/owner to view all admin/owner roles
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins and owners can view all admin/owner roles (for admin management tab)
CREATE POLICY "Admins can view admin roles"
ON public.user_roles
FOR SELECT
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'))
  AND role IN ('admin', 'owner')
);

-- Only admins/owners can manage roles (insert/update/delete)
CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));