-- Migration: Add is_available filter to experts_search_view
-- Only verified AND available experts should appear in search results.

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
WHERE e.verification_status = 'verified' AND e.is_available = TRUE;
