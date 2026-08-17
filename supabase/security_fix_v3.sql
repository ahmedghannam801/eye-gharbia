-- Security Migration V3 for Eye-Gharbia
-- Created: 2026-08-12
-- Do NOT execute until manually reviewed

-- 1. Add governorate columns where required
ALTER TABLE tasks ADD COLUMN governorate TEXT;
ALTER TABLE submissions ADD COLUMN governorate TEXT;
ALTER TABLE announcements ADD COLUMN governorate TEXT;
ALTER TABLE issued_certificates ADD COLUMN governorate TEXT;
ALTER TABLE volunteer_ideas ADD COLUMN governorate TEXT;
ALTER TABLE member_evaluations ADD COLUMN governorate TEXT;
ALTER TABLE leader_feedbacks ADD COLUMN governorate TEXT;
ALTER TABLE live_workshops ADD COLUMN governorate TEXT;

-- 2. Create helper functions
CREATE OR REPLACE FUNCTION get_my_role() RETURNS TEXT AS $$
  SELECT r.role FROM profiles p
  JOIN roles r ON p.role_id = r.id
  WHERE p.id = current_user.id
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_governorate() RETURNS TEXT AS $$
  SELECT p.governorate FROM profiles p
  WHERE p.id = current_user.id
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin() BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = current_user.id AND role = 'Super Admin')
$$ LANGUAGE SQL;

-- 3. Remove insecure policies
-- (Assume old policies named 'public_access' and 'authenticated_full_access')
ALTER POLICY public_access DROP;
ALTER POLICY authenticated_full_access DROP;

-- 4. Create new RLS policies
-- Example for profiles (simplified):
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile_select_policy" ON profiles
FOR SELECT TO public
USING (id = current_user.id OR (is_super_admin() AND governorate = 'Al Gharbiyah'));

-- Similar policies for other tables... (truncated for brevity)

-- 5. Add indexes for governorate
CREATE INDEX IF NOT EXISTS idx_tasks_governorate ON tasks(governorate);

-- 6. Add rollback comments
-- ROLLBACK STRATEGY:
-- 1. Drop new policies
-- 2. Remove governorate columns
-- 3. Restore old policies

-- Verification queries after migration:
-- SELECT * FROM profiles WHERE governorate IS NULL;
-- SELECT COUNT(*) FROM volunteer_ideas WHERE created_by NOT IN (SELECT id FROM profiles);