-- Enable RLS on backup table (required by security policy)
ALTER TABLE reward_backup_20260126 ENABLE ROW LEVEL SECURITY;

-- Allow only admins to view backup data
CREATE POLICY "Admins can view reward backup"
ON reward_backup_20260126
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));