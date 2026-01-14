-- Create admin_invitations table for managing admin invites
CREATE TABLE public.admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(invitee_id, status)
);

-- Enable RLS
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Owner can manage all invitations
CREATE POLICY "Owner can manage invitations"
ON public.admin_invitations
FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- Invitee can view their own invitations
CREATE POLICY "Invitee can view own invitations"
ON public.admin_invitations
FOR SELECT
USING (auth.uid() = invitee_id);

-- Invitee can update their own invitation status
CREATE POLICY "Invitee can update own invitation"
ON public.admin_invitations
FOR UPDATE
USING (auth.uid() = invitee_id)
WITH CHECK (auth.uid() = invitee_id);

-- Admins can view all invitations
CREATE POLICY "Admins can view invitations"
ON public.admin_invitations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));