-- Payment Coordination Chat System — Migration
-- Run against the Supabase PostgreSQL database

-- 1. Add new request_status enum values
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'payment_coordination';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'engaged';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'coordination_expired';

-- 2. Add coordination columns to access_requests
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS coordination_expires_at TIMESTAMPTZ;
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS user_payment_confirmed BOOLEAN DEFAULT false;
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS expert_payment_confirmed BOOLEAN DEFAULT false;

-- 3. Extend request_messages with message type, metadata, and attachment support
ALTER TABLE public.request_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE public.request_messages ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.request_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- 4. Index for expiry checks
CREATE INDEX IF NOT EXISTS idx_requests_coordination_expires
  ON public.access_requests(coordination_expires_at)
  WHERE status = 'payment_coordination';

-- 5. Add coordination window config (default 48 hours)
INSERT INTO public.platform_config (key, value, description)
VALUES ('coordination_window_hours', '48', 'Hours allowed for payment coordination before auto-expiry')
ON CONFLICT (key) DO NOTHING;

-- 6. RLS policies for request_messages (updated to allow payment_coordination status)
-- The existing policies should already cover insert/select based on participant checks.
-- If needed, you can update the policy conditions to include payment_coordination.
