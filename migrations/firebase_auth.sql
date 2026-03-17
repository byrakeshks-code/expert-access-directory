-- Migration: Switch authentication from Supabase Auth to Firebase Auth
-- Firebase users are managed externally; public.users no longer references auth.users.

BEGIN;

-- 1. Drop the FK constraint linking public.users.id to auth.users(id).
--    The constraint name follows Postgres's default naming: {table}_{column}_fkey
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- 2. Add a column to store the Firebase UID for identity lookup.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;

-- 3. Set a default UUID generator so auto-provisioned rows get an id automatically.
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Fast lookup index on firebase_uid.
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON public.users(firebase_uid);

COMMIT;
