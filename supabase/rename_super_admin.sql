-- STEP 1: Update existing data
-- Change any existing profiles that have role = 'Super Admin' to 'HR HEAD'
UPDATE public.profiles
SET role = 'HR HEAD'
WHERE role = 'Super Admin';

-- STEP 2: Drop the old CHECK constraint on profiles.role
-- The constraint name in schema.sql is: profiles_role_check
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- STEP 3: Add the new CHECK constraint with 'HR HEAD' instead of 'Super Admin'
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('Member','Leader','HR HEAD','Vice','Coordinator','Deputy Coordinator'));
