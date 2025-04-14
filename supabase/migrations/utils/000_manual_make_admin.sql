-- WARNING: This script directly modifies user roles.
-- Run this manually via the Supabase SQL Editor or psql.
-- DO NOT include this in automated migration runs unless intended.

-- Replace 'user-to-make-admin@example.com' with the actual email address
-- of the user registered in the auth.users table.

-- Step 1: Find the user ID based on email
-- SELECT id FROM auth.users WHERE email = 'user-to-make-admin@example.com';
-- Copy the resulting UUID.

-- Step 2: Update the role in the public.profiles table using the UUID found above.
-- Replace 'PASTE_USER_ID_HERE' with the actual UUID.
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'PASTE_USER_ID_HERE';

-- Optional: Verify the change
-- SELECT id, email, role FROM public.profiles WHERE id = 'PASTE_USER_ID_HERE';
