-- Email OTP for signup verification (Gmail SMTP).
-- One row per email; upserted on each send; deleted or marked used after successful verify.

CREATE TABLE IF NOT EXISTS public.email_signup_otp (
    email                   TEXT PRIMARY KEY,
    full_name               TEXT NOT NULL,
    otp_hash                TEXT NOT NULL,
    expires_at              TIMESTAMPTZ NOT NULL,
    failed_attempts         INT NOT NULL DEFAULT 0,
    resend_count            INT NOT NULL DEFAULT 0,
    rate_limit_window_start TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_signup_otp_expires_at ON public.email_signup_otp(expires_at);

COMMENT ON TABLE public.email_signup_otp IS 'Pending email OTP for signup; rate limit and expiry enforced in app.';
