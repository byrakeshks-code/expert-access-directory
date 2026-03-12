-- ============================================================
-- EXPERT ACCESS DIRECTORY — DATABASE SCHEMA (v3)
-- Hybrid Model: Per-Expert Access Fees + Expert Subscription Tiers
-- Supabase + PostgreSQL
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CUSTOM TYPES (ENUMS)
-- ============================================================

CREATE TYPE user_role AS ENUM ('user', 'expert', 'admin');
CREATE TYPE verification_status AS ENUM ('pending', 'under_review', 'verified', 'rejected', 'suspended');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE request_status AS ENUM ('pending', 'sent', 'accepted', 'rejected', 'expired', 'cancelled', 'closed', 'payment_coordination', 'engaged', 'coordination_expired');
CREATE TYPE expert_decision AS ENUM ('accepted', 'rejected');
CREATE TYPE payment_gateway AS ENUM ('razorpay', 'stripe', 'free');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'push');
CREATE TYPE refund_status AS ENUM ('requested', 'approved', 'processed', 'denied');
CREATE TYPE expert_tier AS ENUM ('starter', 'pro', 'elite');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'expired');

-- ============================================================
-- 1. USERS (extends Supabase auth.users)
-- ============================================================

CREATE TABLE public.users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role            user_role NOT NULL DEFAULT 'user',
    full_name       TEXT NOT NULL,
    avatar_url      TEXT,
    email           TEXT NOT NULL,                          -- denormalized from auth for faster queries
    phone           TEXT,
    country_code    TEXT DEFAULT 'IN',                      -- ISO 3166-1 alpha-2
    timezone        TEXT DEFAULT 'Asia/Kolkata',
    preferred_lang  TEXT DEFAULT 'en',                      -- ISO 639-1
    is_active       BOOLEAN DEFAULT TRUE,                   -- soft-disable account
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_active ON public.users(is_active) WHERE is_active = TRUE;

-- ============================================================
-- 2. EXPERT PROFILES
-- ============================================================

CREATE TABLE public.experts (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    headline                TEXT NOT NULL,                   -- one-liner visible in search results
    bio                     TEXT,
    avatar_url              TEXT,
    primary_domain          TEXT,
    years_of_experience     INTEGER CHECK (years_of_experience >= 0),
    city                    TEXT,
    country                 TEXT,
    languages               TEXT[] DEFAULT '{en}',           -- array of ISO 639-1 codes
    linkedin_url            TEXT,
    website_url             TEXT,

    -- Per-Expert Access Pricing (Layer 1)
    access_fee_minor        INTEGER NOT NULL DEFAULT 0,     -- whole number price in currency (e.g. 2499 = ₹2,499)
    access_fee_currency     TEXT NOT NULL DEFAULT 'INR',    -- ISO 4217 currency code

    -- Subscription Tier
    current_tier            expert_tier NOT NULL DEFAULT 'starter',

    -- Operational
    verification_status     verification_status DEFAULT 'pending',
    verified_at             TIMESTAMPTZ,
    is_available            BOOLEAN DEFAULT TRUE,            -- expert can toggle availability
    max_requests_per_day    INTEGER DEFAULT 10,              -- default for starter; overridden by tier
    avg_response_hours      NUMERIC(5,1),                    -- auto-calculated from historical data

    -- Admin-managed search tags
    tags                    TEXT[] DEFAULT '{}',             -- admin-only search tags for discoverability

    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_experts_domain ON public.experts(primary_domain);
CREATE INDEX idx_experts_tags ON public.experts USING GIN (tags);
CREATE INDEX idx_experts_available ON public.experts(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_experts_verified ON public.experts(verification_status) WHERE verification_status = 'verified';
CREATE INDEX idx_experts_country ON public.experts(country);
CREATE INDEX idx_experts_tier ON public.experts(current_tier);

-- ============================================================
-- 2B. EXPERT SUBSCRIPTION TIERS (Admin-Defined Tier Catalog)
-- ============================================================

CREATE TABLE public.subscription_tiers (
    id              expert_tier PRIMARY KEY,                  -- starter | pro | elite
    display_name    TEXT NOT NULL,                            -- "Starter", "Pro", "Elite"
    description     TEXT,
    price_monthly_minor  INTEGER NOT NULL DEFAULT 0,         -- monthly price as whole number
    price_yearly_minor   INTEGER NOT NULL DEFAULT 0,         -- yearly price as whole number (discounted)
    currency        TEXT NOT NULL DEFAULT 'INR',
    features        JSONB NOT NULL DEFAULT '{}',             -- structured feature flags (see seed data below)
    max_requests_per_day INTEGER NOT NULL DEFAULT 10,
    search_boost    NUMERIC(3,1) NOT NULL DEFAULT 1.0,      -- multiplier for search ranking (1.0 = no boost)
    badge_label     TEXT,                                     -- badge text shown on profile (null for starter)
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Seed tier definitions
INSERT INTO public.subscription_tiers (id, display_name, description, price_monthly_minor, price_yearly_minor, currency, features, max_requests_per_day, search_boost, badge_label) VALUES
(
    'starter',
    'Starter',
    'Free tier — basic verified profile with standard visibility.',
    0, 0, 'INR',
    '{"analytics": false, "priority_search": false, "featured_homepage": false, "custom_profile_url": false, "email_notifications": true, "priority_support": false}',
    10, 1.0, NULL
),
(
    'pro',
    'Pro',
    'Enhanced visibility, response analytics, and a Pro badge on your profile.',
    799, 7999, 'INR',  -- ₹799/mo or ₹7,999/yr
    '{"analytics": true, "priority_search": true, "featured_homepage": false, "custom_profile_url": false, "email_notifications": true, "priority_support": false}',
    30, 1.5, 'Pro'
),
(
    'elite',
    'Elite',
    'Top placement, homepage featuring, full analytics dashboard, unlimited requests, and priority support.',
    2499, 24999, 'INR',  -- ₹2,499/mo or ₹24,999/yr
    '{"analytics": true, "priority_search": true, "featured_homepage": true, "custom_profile_url": true, "email_notifications": true, "priority_support": true}',
    999, 2.0, 'Elite'   -- 999 = effectively unlimited
);

-- ============================================================
-- 2C. EXPERT SUBSCRIPTIONS (Active Billing Records)
-- ============================================================

CREATE TABLE public.expert_subscriptions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id               UUID NOT NULL REFERENCES public.experts(id) ON DELETE CASCADE,
    tier_id                 expert_tier NOT NULL REFERENCES public.subscription_tiers(id),
    billing_cycle           TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    status                  subscription_status NOT NULL DEFAULT 'active',
    gateway                 payment_gateway NOT NULL,
    gateway_subscription_id TEXT,                             -- subscription ID from Razorpay/Stripe
    amount_minor            INTEGER NOT NULL,                 -- actual amount charged per cycle (whole number)
    currency                TEXT NOT NULL DEFAULT 'INR',
    current_period_start    TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_end      TIMESTAMPTZ NOT NULL,
    cancelled_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_expert_subs_expert ON public.expert_subscriptions(expert_id);
CREATE INDEX idx_expert_subs_status ON public.expert_subscriptions(status) WHERE status = 'active';
CREATE INDEX idx_expert_subs_period_end ON public.expert_subscriptions(current_period_end);

-- ============================================================
-- 3. DOMAIN STRUCTURE (Problem-First Taxonomy)
-- ============================================================

CREATE TABLE public.domains (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    slug        TEXT NOT NULL UNIQUE,                        -- URL-friendly identifier
    icon_url    TEXT,
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.sub_problems (
    id          SERIAL PRIMARY KEY,
    domain_id   INTEGER NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL,
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT now(),

    UNIQUE (domain_id, name),                               -- prevent duplicates within a domain
    UNIQUE (domain_id, slug)
);

CREATE INDEX idx_subproblems_domain ON public.sub_problems(domain_id);

-- ============================================================
-- 4. EXPERT SPECIALIZATIONS (many-to-many)
-- ============================================================

CREATE TABLE public.expert_specializations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id       UUID NOT NULL REFERENCES public.experts(id) ON DELETE CASCADE,
    sub_problem_id  INTEGER NOT NULL REFERENCES public.sub_problems(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),

    UNIQUE (expert_id, sub_problem_id)                      -- prevent duplicate tagging
);

CREATE INDEX idx_expert_spec_expert ON public.expert_specializations(expert_id);
CREATE INDEX idx_expert_spec_subproblem ON public.expert_specializations(sub_problem_id);

-- ============================================================
-- 5. PLATFORM ACCESS PAYMENTS (Layer 1 — Per-Expert Fee)
-- ============================================================

CREATE TABLE public.access_payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES public.users(id),
    expert_id           UUID NOT NULL REFERENCES public.experts(id),
    amount_minor        INTEGER NOT NULL,                    -- payment amount (whole number)
    currency            TEXT NOT NULL,                        -- ISO 4217 (INR, USD, etc.)
    gateway             payment_gateway NOT NULL,
    gateway_order_id    TEXT,                                 -- order ID from Razorpay/Stripe
    gateway_payment_id  TEXT,                                 -- payment ID after completion
    gateway_signature   TEXT,                                 -- signature for verification
    status              payment_status NOT NULL DEFAULT 'pending',
    paid_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_user ON public.access_payments(user_id);
CREATE INDEX idx_payments_expert ON public.access_payments(expert_id);
CREATE INDEX idx_payments_status ON public.access_payments(status);
CREATE INDEX idx_payments_gateway_order ON public.access_payments(gateway_order_id);

-- ============================================================
-- 6. ACCESS REQUESTS (Core Workflow)
-- ============================================================

CREATE TABLE public.access_requests (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                     UUID NOT NULL REFERENCES public.users(id),
    expert_id                   UUID NOT NULL REFERENCES public.experts(id),
    access_payment_id           UUID NOT NULL REFERENCES public.access_payments(id),
    subject                     TEXT NOT NULL,                        -- brief subject line
    message                     TEXT NOT NULL,                        -- detailed request message
    context_data                JSONB,                               -- optional structured metadata
    status                      request_status NOT NULL DEFAULT 'pending',
    expires_at                  TIMESTAMPTZ,                          -- auto-set: created_at + SLA window
    coordination_expires_at     TIMESTAMPTZ,                          -- deadline for payment coordination phase
    user_payment_confirmed      BOOLEAN DEFAULT false,                -- user clicked "Payment Completed"
    expert_payment_confirmed    BOOLEAN DEFAULT false,                -- expert clicked "Confirm Receipt"
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_requests_user ON public.access_requests(user_id);
CREATE INDEX idx_requests_expert ON public.access_requests(expert_id);
CREATE INDEX idx_requests_status ON public.access_requests(status);
CREATE INDEX idx_requests_expires ON public.access_requests(expires_at) WHERE status = 'sent';

-- ============================================================
-- 7. EXPERT RESPONSES (Layer 2 — Informational Only)
-- ============================================================

CREATE TABLE public.expert_responses (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id                  UUID UNIQUE NOT NULL REFERENCES public.access_requests(id) ON DELETE CASCADE,
    decision                    expert_decision NOT NULL,
    response_note               TEXT,                        -- message back to the user
    contact_terms               TEXT,                        -- how/when the expert is willing to engage
    interaction_mode            TEXT,                        -- e.g. video_call, voice_call, chat, email, in_person
    contact_price_indicated     NUMERIC(12,2),               -- expert's independently quoted price (informational)
    currency                    TEXT,                        -- currency of the indicated price
    created_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_responses_request ON public.expert_responses(request_id);

-- ============================================================
-- 7b. REQUEST MESSAGES (in-app chat within accepted requests)
-- ============================================================

CREATE TABLE public.request_messages (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id          UUID NOT NULL REFERENCES public.access_requests(id) ON DELETE CASCADE,
    sender_id           UUID NOT NULL REFERENCES public.users(id),
    body                TEXT NOT NULL,
    message_type        TEXT DEFAULT 'text',                  -- text, payment_details, payment_receipt, payment_confirmed, receipt_verified, system
    metadata            JSONB,                                -- structured data (fee, payment method, etc.)
    attachment_url      TEXT,                                  -- file URL for uploaded receipts
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_request_messages_request ON public.request_messages(request_id);
CREATE INDEX idx_request_messages_created ON public.request_messages(request_id, created_at);

-- ============================================================
-- 8. REFUNDS
-- ============================================================

CREATE TABLE public.refunds (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    access_payment_id   UUID NOT NULL REFERENCES public.access_payments(id),
    request_id          UUID REFERENCES public.access_requests(id),
    user_id             UUID NOT NULL REFERENCES public.users(id),
    amount_minor        INTEGER NOT NULL,                    -- refund amount (whole number)
    currency            TEXT NOT NULL,
    reason              TEXT NOT NULL,                        -- auto_expired | expert_rejected | user_cancelled | admin_initiated
    status              refund_status NOT NULL DEFAULT 'requested',
    gateway_refund_id   TEXT,                                 -- refund ID from payment gateway
    processed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_refunds_user ON public.refunds(user_id);
CREATE INDEX idx_refunds_payment ON public.refunds(access_payment_id);
CREATE INDEX idx_refunds_status ON public.refunds(status);

-- ============================================================
-- 9. NOTIFICATIONS
-- ============================================================

CREATE TABLE public.notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    channel     notification_channel NOT NULL DEFAULT 'in_app',
    title       TEXT NOT NULL,
    body        TEXT,
    action_url  TEXT,                                        -- deep link into the app
    is_read     BOOLEAN DEFAULT FALSE,
    metadata    JSONB,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- 10. REVIEWS (Post-Interaction Feedback)
-- ============================================================

CREATE TABLE public.reviews (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id  UUID UNIQUE NOT NULL REFERENCES public.access_requests(id),
    user_id     UUID NOT NULL REFERENCES public.users(id),
    expert_id   UUID NOT NULL REFERENCES public.experts(id),
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    is_visible  BOOLEAN DEFAULT TRUE,                        -- admin can hide inappropriate reviews
    is_flagged  BOOLEAN DEFAULT FALSE,                       -- expert can flag for moderation
    flag_reason TEXT,                                         -- reason provided by expert
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reviews_expert ON public.reviews(expert_id);
CREATE INDEX idx_reviews_user ON public.reviews(user_id);

-- ============================================================
-- 11. BLOCKED USERS
-- ============================================================

CREATE TABLE public.blocked_users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- expert's user_id
    blocked_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- blocked user
    reason          TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),

    UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX idx_blocked_blocker ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_blocked ON public.blocked_users(blocked_id);

-- ============================================================
-- 12. EXPERT VERIFICATION DOCUMENTS
-- ============================================================

CREATE TABLE public.verification_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id       UUID NOT NULL REFERENCES public.experts(id) ON DELETE CASCADE,
    document_type   TEXT NOT NULL,                            -- id_proof | degree | license | portfolio | other
    file_url        TEXT NOT NULL,                            -- Supabase Storage URL
    status          verification_status DEFAULT 'pending',
    reviewer_notes  TEXT,                                     -- admin notes during review
    reviewed_by     UUID REFERENCES public.users(id),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_verdocs_expert ON public.verification_documents(expert_id);
CREATE INDEX idx_verdocs_status ON public.verification_documents(status);

-- ============================================================
-- 13. AUDIT LOG (Legal Safety & Compliance)
-- ============================================================

CREATE TABLE public.audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id    UUID REFERENCES public.users(id),
    action      TEXT NOT NULL,                                -- e.g. request.created, payment.completed, expert.verified
    entity      TEXT NOT NULL,                                -- table name
    entity_id   UUID,
    old_data    JSONB,                                       -- previous state (for updates)
    new_data    JSONB,                                       -- new state
    ip_address  INET,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_entity ON public.audit_logs(entity, entity_id);
CREATE INDEX idx_audit_action ON public.audit_logs(action);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at);

-- ============================================================
-- 14. PLATFORM CONFIGURATION (Admin-Managed Settings)
-- ============================================================

CREATE TABLE public.platform_config (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL,
    description TEXT,
    updated_by  UUID REFERENCES public.users(id),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed default config
INSERT INTO public.platform_config (key, value, description) VALUES
    ('request_expiry_hours', '72', 'Hours before an unanswered request expires'),
    ('min_access_fee_inr', '49', 'Minimum access fee an expert can set (INR)'),
    ('default_access_fee_inr', '49', 'Default access fee for new experts (INR). Must be >= min_access_fee_inr'),
    ('max_requests_per_user_per_day', '5', 'Rate limit: max requests a user can send per day'),
    ('refund_on_expiry', 'true', 'Auto-refund if request expires without response'),
    ('refund_on_rejection', 'true', 'Auto-refund if expert rejects the request');

-- ============================================================
-- VIEW: Denormalized expert view for Meilisearch sync
-- Joins expert profile with user name for search-by-name support
-- ============================================================

CREATE OR REPLACE VIEW public.experts_search_view AS
SELECT
    e.id AS expert_id,
    u.full_name,
    u.email,
    e.headline,
    e.bio,
    e.primary_domain,
    e.avatar_url,
    e.years_of_experience,
    e.city,
    e.country,
    e.languages,
    e.access_fee_minor,
    e.access_fee_currency,
    e.current_tier,
    st.badge_label AS tier_badge,
    st.search_boost,
    e.is_available,
    e.verification_status,
    e.avg_response_hours,
    COALESCE(
        (SELECT ROUND(AVG(r.rating), 1) FROM public.reviews r WHERE r.expert_id = e.id AND r.is_visible = TRUE),
        0
    ) AS rating_avg,
    COALESCE(
        (SELECT COUNT(*) FROM public.reviews r WHERE r.expert_id = e.id AND r.is_visible = TRUE),
        0
    ) AS review_count,
    ARRAY(
        SELECT sp.name FROM public.expert_specializations es
        JOIN public.sub_problems sp ON sp.id = es.sub_problem_id
        WHERE es.expert_id = e.id
    ) AS sub_problems,
    e.tags
FROM public.experts e
JOIN public.users u ON u.id = e.user_id
LEFT JOIN public.subscription_tiers st ON st.id = e.current_tier
WHERE e.verification_status = 'verified';

-- ============================================================
-- HELPER: Auto-update updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_experts_updated_at BEFORE UPDATE ON public.experts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.access_payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_requests_updated_at BEFORE UPDATE ON public.access_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_refunds_updated_at BEFORE UPDATE ON public.refunds
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_expert_subs_updated_at BEFORE UPDATE ON public.expert_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_sub_tiers_updated_at BEFORE UPDATE ON public.subscription_tiers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- HELPER: Auto-expire requests (run via pg_cron or BullMQ)
-- ============================================================

CREATE OR REPLACE FUNCTION public.expire_stale_requests()
RETURNS INTEGER AS $$
DECLARE
    affected INTEGER;
BEGIN
    UPDATE public.access_requests
    SET status = 'expired', updated_at = now()
    WHERE status = 'sent'
      AND expires_at < now();

    GET DIAGNOSTICS affected = ROW_COUNT;
    RETURN affected;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY — COMPLETE POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_subscriptions ENABLE ROW LEVEL SECURITY;

-- ----- USERS -----

CREATE POLICY "Users: read own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users: update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins: full access to users"
    ON public.users FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- ----- EXPERTS -----

CREATE POLICY "Experts: public read for verified profiles"
    ON public.experts FOR SELECT
    USING (verification_status = 'verified' AND is_available = TRUE);

CREATE POLICY "Experts: read own profile regardless of status"
    ON public.experts FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Experts: update own profile"
    ON public.experts FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Experts: insert own profile"
    ON public.experts FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins: full access to experts"
    ON public.experts FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- ----- DOMAINS & SUB_PROBLEMS (public read) -----

CREATE POLICY "Anyone: read active domains"
    ON public.domains FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Admins: manage domains"
    ON public.domains FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

CREATE POLICY "Anyone: read active sub_problems"
    ON public.sub_problems FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Admins: manage sub_problems"
    ON public.sub_problems FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- ----- EXPERT SPECIALIZATIONS (public read) -----

CREATE POLICY "Anyone: read specializations"
    ON public.expert_specializations FOR SELECT
    USING (TRUE);

CREATE POLICY "Experts: manage own specializations"
    ON public.expert_specializations FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.experts e WHERE e.id = expert_id AND e.user_id = auth.uid())
    );

-- ----- ACCESS PAYMENTS -----

CREATE POLICY "Users: view own payments"
    ON public.access_payments FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Experts: view payments for their requests"
    ON public.access_payments FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.experts e WHERE e.id = expert_id AND e.user_id = auth.uid())
    );

CREATE POLICY "Users: create payment records"
    ON public.access_payments FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins: full access to payments"
    ON public.access_payments FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- ----- ACCESS REQUESTS -----

CREATE POLICY "Users: view own requests"
    ON public.access_requests FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users: create requests"
    ON public.access_requests FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users: cancel own pending requests"
    ON public.access_requests FOR UPDATE
    USING (user_id = auth.uid() AND status IN ('pending', 'sent'))
    WITH CHECK (status = 'cancelled');

CREATE POLICY "Experts: view requests sent to them"
    ON public.access_requests FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.experts e WHERE e.id = expert_id AND e.user_id = auth.uid())
    );

CREATE POLICY "Admins: full access to requests"
    ON public.access_requests FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- ----- EXPERT RESPONSES -----

CREATE POLICY "Experts: create response to their requests"
    ON public.expert_responses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.access_requests ar
            JOIN public.experts e ON e.id = ar.expert_id
            WHERE ar.id = request_id AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "Users: view responses to their requests"
    ON public.expert_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.access_requests ar
            WHERE ar.id = request_id AND ar.user_id = auth.uid()
        )
    );

CREATE POLICY "Experts: view own responses"
    ON public.expert_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.access_requests ar
            JOIN public.experts e ON e.id = ar.expert_id
            WHERE ar.id = request_id AND e.user_id = auth.uid()
        )
    );

-- ----- REFUNDS -----

CREATE POLICY "Users: view own refunds"
    ON public.refunds FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins: full access to refunds"
    ON public.refunds FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- ----- NOTIFICATIONS -----

CREATE POLICY "Users: view own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users: mark own notifications read"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ----- REVIEWS -----

CREATE POLICY "Anyone: read visible reviews"
    ON public.reviews FOR SELECT
    USING (is_visible = TRUE);

CREATE POLICY "Users: create review for their completed requests"
    ON public.reviews FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins: manage reviews"
    ON public.reviews FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- ----- BLOCKED USERS -----

CREATE POLICY "Users: manage own blocks"
    ON public.blocked_users FOR ALL
    USING (blocker_id = auth.uid());

-- ----- VERIFICATION DOCUMENTS -----

CREATE POLICY "Experts: manage own documents"
    ON public.verification_documents FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.experts e WHERE e.id = expert_id AND e.user_id = auth.uid())
    );

CREATE POLICY "Admins: full access to verification docs"
    ON public.verification_documents FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- ----- SUBSCRIPTION TIERS (public read, admin manage) -----

CREATE POLICY "Anyone: read active tiers"
    ON public.subscription_tiers FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Admins: manage subscription tiers"
    ON public.subscription_tiers FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- ----- EXPERT SUBSCRIPTIONS -----

CREATE POLICY "Experts: view own subscriptions"
    ON public.expert_subscriptions FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.experts e WHERE e.id = expert_id AND e.user_id = auth.uid())
    );

CREATE POLICY "Experts: create own subscription"
    ON public.expert_subscriptions FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.experts e WHERE e.id = expert_id AND e.user_id = auth.uid())
    );

CREATE POLICY "Admins: full access to subscriptions"
    ON public.expert_subscriptions FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- ----- AUDIT LOGS (admin read-only, system write) -----

CREATE POLICY "Admins: read audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

CREATE POLICY "Service role: insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true);

-- ----- PLATFORM CONFIG (admin CRUD) -----

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins: read platform config"
    ON public.platform_config FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

CREATE POLICY "Admins: update platform config"
    ON public.platform_config FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

CREATE POLICY "Admins: insert platform config"
    ON public.platform_config FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

CREATE POLICY "Admins: delete platform config"
    ON public.platform_config FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- ============================================================
-- ADDITIONAL INDEXES for common query patterns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_experts_status_available_tier
    ON public.experts (verification_status, is_available, current_tier);

CREATE INDEX IF NOT EXISTS idx_access_payments_user_status_created
    ON public.access_payments (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_requests_expert_status_created
    ON public.access_requests (expert_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_expert_visible_created
    ON public.reviews (expert_id, is_visible, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expert_subscriptions_expert_status_end
    ON public.expert_subscriptions (expert_id, status, current_period_end);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
    ON public.audit_logs (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
    ON public.notifications (user_id, is_read, created_at DESC);

-- ============================================================
-- CHECK CONSTRAINTS for data integrity
-- ============================================================

ALTER TABLE public.experts
    ADD CONSTRAINT chk_access_fee_non_negative
    CHECK (access_fee_minor >= 0);

ALTER TABLE public.access_payments
    ADD CONSTRAINT chk_payment_amount_positive
    CHECK (amount_minor > 0);

ALTER TABLE public.refunds
    ADD CONSTRAINT chk_refund_amount_positive
    CHECK (amount_minor > 0);

ALTER TABLE public.expert_subscriptions
    ADD CONSTRAINT chk_subscription_period_order
    CHECK (current_period_end > current_period_start);

ALTER TABLE public.reviews
    ADD CONSTRAINT chk_rating_range
    CHECK (rating >= 1 AND rating <= 5);

-- ============================================================
-- RPC: Aggregation functions for dashboard metrics
-- ============================================================

CREATE OR REPLACE FUNCTION public.sum_paid_revenue()
RETURNS TABLE(total BIGINT) AS $$
  SELECT COALESCE(SUM(amount_minor), 0) AS total
  FROM public.access_payments
  WHERE status = 'paid';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
