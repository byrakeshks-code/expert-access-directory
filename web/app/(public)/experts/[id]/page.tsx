'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  MapPin, Clock, Award, CheckCircle, Share2, Star, ArrowLeft, MessageSquare,
  Calendar, Globe, Languages, ArrowRight, Shield, Tag, Briefcase, Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatFee, formatDate, cn, toArray, getInitials } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Avatar } from '@/components/ui/avatar';
import { Badge, TierBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StarRating } from '@/components/ui/star-rating';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition } from '@/components/shared/page-transition';

interface ExpertDetail {
  id: string;
  user_id: string;
  headline: string;
  bio: string;
  access_fee_minor: number;
  access_fee_currency: string;
  is_available: boolean;
  verification_status: string;
  current_tier: string;
  avg_rating: number;
  total_reviews: number;
  years_experience: number;
  city: string;
  country: string;
  languages: string[];
  max_requests_per_day: number;
  avatar_url?: string;
  full_name: string;
  primary_domain_name?: string;
  specializations?: { id: string; label: string }[];
  tags?: string[];
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_name: string;
}

const TIER_GRADIENTS: Record<string, string> = {
  elite: 'from-violet-600 via-purple-600 to-fuchsia-600',
  pro: 'from-primary via-primary to-secondary',
  starter: 'from-slate-500 via-slate-600 to-slate-700',
};

export default function ExpertProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const expertId = params.id as string;

  const [expert, setExpert] = useState<ExpertDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);

  useEffect(() => {
    if (!expertId) return;
    setLoading(true);
    Promise.all([
      api.get<any>(`/experts/${expertId}`),
      api.get<any>(`/experts/${expertId}/reviews?page=1&limit=5`),
    ])
      .then(([expertRaw, reviewRaw]) => {
        const e = expertRaw;
        const normalized: ExpertDetail = {
          id: e.id,
          user_id: e.user_id,
          headline: e.headline || '',
          bio: e.bio || '',
          access_fee_minor: e.access_fee_minor ?? 0,
          access_fee_currency: e.access_fee_currency || 'INR',
          is_available: e.is_available ?? false,
          verification_status: e.verification_status || 'pending',
          current_tier: e.current_tier || 'starter',
          avg_rating: e.avg_rating ?? e.rating_avg ?? 0,
          total_reviews: e.total_reviews ?? e.review_count ?? 0,
          years_experience: e.years_experience ?? e.years_of_experience ?? 0,
          city: e.city || '',
          country: e.country || '',
          languages: e.languages || [],
          max_requests_per_day: e.max_requests_per_day ?? 10,
          avatar_url: e.avatar_url || e.users?.avatar_url,
          full_name: e.full_name || e.users?.full_name || 'Unknown',
          primary_domain_name: e.primary_domain_name || e.primary_domain || '',
          specializations: (e.expert_specializations || e.specializations || []).map((s: any) => ({
            id: s.id || s.sub_problems?.id,
            label: s.label || s.sub_problems?.name || s.name || '',
          })),
          tags: e.tags || [],
        };
        setExpert(normalized);

        const reviewList: any[] = toArray(reviewRaw);
        const normalizedReviews: Review[] = reviewList.map((r: any) => ({
          id: r.id,
          rating: r.rating ?? 0,
          comment: r.comment || '',
          created_at: r.created_at,
          user_name: r.user_name || r.users?.full_name || 'Anonymous',
        }));
        setReviews(normalizedReviews);
        setHasMoreReviews(reviewList.length === 5);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [expertId]);

  const loadMoreReviews = async () => {
    const nextPage = reviewPage + 1;
    try {
      const raw = await api.get<any>(`/experts/${expertId}/reviews?page=${nextPage}&limit=5`);
      const reviewList: any[] = toArray(raw);
      const newReviews: Review[] = reviewList.map((r: any) => ({
        id: r.id,
        rating: r.rating ?? 0,
        comment: r.comment || '',
        created_at: r.created_at,
        user_name: r.user_name || r.users?.full_name || 'Anonymous',
      }));
      setReviews((prev) => [...prev, ...newReviews]);
      setReviewPage(nextPage);
      setHasMoreReviews(reviewList.length === 5);
    } catch {}
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${expert?.full_name} - Loop Ex`,
          text: expert?.headline,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleRequestAccess = () => {
    if (user) {
      router.push(`/requests/new?expert_id=${expert!.id}`);
    } else {
      router.push(`/login?redirect=/experts/${expert!.id}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="flex items-center gap-4 -mt-12 ml-8">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="space-y-3 flex-1 mt-12">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-foreground">Expert not found</h2>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const isVerified = expert.verification_status === 'verified';
  const tier = expert.current_tier as 'starter' | 'pro' | 'elite';
  const gradient = TIER_GRADIENTS[tier] || TIER_GRADIENTS.starter;
  const initials = getInitials(expert.full_name);
  const location = [expert.city, expert.country].filter(Boolean).join(', ');

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-28 md:pb-8">
        {/* ==================== HERO BANNER ==================== */}
        <div className="relative">
          <div className={`h-48 sm:h-56 bg-gradient-to-r ${gradient} relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-1/4 w-64 h-64 bg-white rounded-full blur-3xl -translate-y-1/2" />
              <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-white rounded-full blur-3xl translate-y-1/2" />
            </div>

            {/* Back + share */}
            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>

          {/* Avatar + name overlay */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-14 sm:-mt-16 relative z-10">
              {/* Avatar */}
              <div className="relative">
                {expert.avatar_url ? (
                  <img
                    src={expert.avatar_url}
                    alt={expert.full_name}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-background shadow-xl"
                  />
                ) : (
                  <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-background shadow-xl flex items-center justify-center font-bold text-3xl text-white bg-gradient-to-br ${gradient}`}>
                    {initials}
                  </div>
                )}
                {isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-success rounded-full flex items-center justify-center border-2 border-background">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              {/* Name section */}
              <div className="flex-1 min-w-0 text-center sm:text-left sm:pb-2">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                  <h1
                    className="text-2xl sm:text-3xl font-extrabold text-foreground"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {expert.full_name}
                  </h1>
                  <TierBadge tier={tier} />
                </div>
                <p className="text-muted mt-1 text-sm sm:text-base">{expert.headline}</p>
                {expert.primary_domain_name && (
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-medium text-primary">{expert.primary_domain_name}</span>
                  </div>
                )}
              </div>

              {/* Desktop CTA card */}
              <div className="hidden md:block flex-shrink-0 sm:pb-2">
                <div className="bg-surface-elevated border border-border rounded-2xl p-5 shadow-lg text-center min-w-[220px]">
                  <p className="text-[10px] text-muted uppercase tracking-wider font-medium">Access Fee</p>
                  <p className="text-3xl font-extrabold text-foreground mt-1">
                    {formatFee(expert.access_fee_minor, expert.access_fee_currency)}
                  </p>
                  <button
                    disabled={!expert.is_available}
                    onClick={handleRequestAccess}
                    className={cn(
                      'w-full mt-3 py-3 px-6 font-bold text-sm rounded-xl transition-all active:scale-[0.98]',
                      expert.is_available
                        ? `bg-gradient-to-r ${gradient} text-white shadow-lg hover:opacity-90`
                        : 'bg-surface text-muted border border-border cursor-not-allowed',
                    )}
                  >
                    {expert.is_available ? 'Request Access' : 'Currently Unavailable'}
                  </button>
                  {expert.is_available && (
                    <p className="text-[10px] text-muted mt-2 flex items-center justify-center gap-1">
                      <Shield className="w-3 h-3" /> Refund if no response
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== STATS BAR ==================== */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {[
              {
                icon: Star,
                label: 'Rating',
                value: `${(expert.avg_rating ?? 0).toFixed(1)}`,
                sub: `${expert.total_reviews ?? 0} reviews`,
                color: 'text-warning',
              },
              {
                icon: Clock,
                label: 'Experience',
                value: `${expert.years_experience ?? 0}`,
                sub: 'years',
                color: 'text-info',
              },
              {
                icon: MapPin,
                label: 'Location',
                value: expert.city || 'N/A',
                sub: expert.country || '',
                color: 'text-success',
              },
              {
                icon: Languages,
                label: 'Languages',
                value: expert.languages?.length ? expert.languages[0] : 'N/A',
                sub: expert.languages?.length > 1 ? `+${expert.languages.length - 1} more` : '',
                color: 'text-secondary',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-surface-elevated border border-border rounded-xl p-4 text-center hover:shadow-md transition-shadow"
              >
                <stat.icon className={cn('w-5 h-5 mx-auto mb-2', stat.color)} />
                <p className="text-lg font-extrabold text-foreground leading-tight">{stat.value}</p>
                <p className="text-[10px] text-muted mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ==================== CONTENT AREA ==================== */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content — left 2/3 */}
            <div className="lg:col-span-2 space-y-6">
              {/* About */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="bg-surface-elevated border border-border rounded-2xl p-6">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-primary" />
                    </div>
                    About
                  </h2>
                  <p className={cn('text-sm text-muted leading-relaxed whitespace-pre-line', !bioExpanded && 'line-clamp-5')}>
                    {expert.bio || 'No bio provided.'}
                  </p>
                  {expert.bio?.length > 300 && (
                    <button
                      onClick={() => setBioExpanded(!bioExpanded)}
                      className="text-sm text-primary font-semibold hover:underline mt-3"
                    >
                      {bioExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              </motion.div>

              {/* Specializations + Tags combined */}
              {((expert.specializations && expert.specializations.length > 0) || (expert.tags && expert.tags.length > 0)) && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="bg-surface-elevated border border-border rounded-2xl p-6">
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-secondary" />
                      </div>
                      Expertise
                    </h2>
                    {expert.specializations && expert.specializations.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Specializations</p>
                        <div className="flex flex-wrap gap-2">
                          {expert.specializations.map((spec) => (
                            <span key={spec.id} className="px-3 py-1.5 text-xs font-medium text-foreground bg-surface rounded-lg border border-border">
                              {spec.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {expert.tags && expert.tags.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {expert.tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/8 text-primary text-xs font-medium rounded-lg">
                              <Tag className="w-3 h-3" />{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Reviews */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="bg-surface-elevated border border-border rounded-2xl p-6">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Star className="w-4 h-4 text-warning" />
                    </div>
                    Reviews
                    <span className="text-sm font-normal text-muted ml-1">({expert.total_reviews})</span>
                  </h2>
                  {reviews.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 text-muted mx-auto mb-2" />
                      <p className="text-muted text-sm">No reviews yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="border border-border-light rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Avatar name={review.user_name || 'User'} size="sm" />
                              <div>
                                <span className="text-sm font-semibold text-foreground">{review.user_name || 'Anonymous'}</span>
                                <div className="mt-0.5"><StarRating rating={review.rating} /></div>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted">{formatDate(review.created_at)}</span>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-muted leading-relaxed mt-1">{review.comment}</p>
                          )}
                        </div>
                      ))}
                      {hasMoreReviews && (
                        <Button variant="outline" onClick={loadMoreReviews} className="w-full">
                          Load More Reviews
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Sidebar — right 1/3 */}
            <div className="space-y-5">
              {/* Mobile CTA (also visible on smaller desktop) */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="lg:hidden"
              >
                <div className="bg-surface-elevated border border-border rounded-2xl p-5 text-center">
                  <p className="text-[10px] text-muted uppercase tracking-wider font-medium">Access Fee</p>
                  <p className="text-3xl font-extrabold text-foreground mt-1">
                    {formatFee(expert.access_fee_minor, expert.access_fee_currency)}
                  </p>
                  <button
                    disabled={!expert.is_available}
                    onClick={handleRequestAccess}
                    className={cn(
                      'w-full mt-3 py-3 px-6 font-bold text-sm rounded-xl transition-all active:scale-[0.98]',
                      expert.is_available
                        ? `bg-gradient-to-r ${gradient} text-white shadow-lg hover:opacity-90`
                        : 'bg-surface text-muted border border-border cursor-not-allowed',
                    )}
                  >
                    {expert.is_available ? 'Request Access' : 'Currently Unavailable'}
                  </button>
                  {expert.is_available && (
                    <p className="text-[10px] text-muted mt-2 flex items-center justify-center gap-1">
                      <Shield className="w-3 h-3" /> Refund if no response
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Quick info card */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="bg-surface-elevated border border-border rounded-2xl p-5">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Quick Info</h3>
                  <div className="space-y-3">
                    {[
                      { icon: MapPin, label: 'Location', value: location || 'Not specified' },
                      { icon: Languages, label: 'Languages', value: expert.languages?.join(', ') || 'Not specified' },
                      { icon: Clock, label: 'Experience', value: `${expert.years_experience} years` },
                      { icon: Calendar, label: 'Availability', value: expert.is_available ? 'Accepting requests' : 'Not available' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-3">
                        <item.icon className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted uppercase tracking-wider">{item.label}</p>
                          <p className="text-sm font-medium text-foreground">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Trust signals */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="bg-surface-elevated border border-border rounded-2xl p-5">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Trust & Safety</h3>
                  <div className="space-y-3">
                    {[
                      { icon: Shield, text: 'Identity Verified', active: isVerified },
                      { icon: Award, text: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Expert`, active: true },
                      { icon: CheckCircle, text: 'Refund Protection', active: true },
                      { icon: MessageSquare, text: 'Guaranteed Response', active: true },
                    ].map((item) => (
                      <div key={item.text} className="flex items-center gap-2.5">
                        <div className={cn(
                          'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                          item.active ? 'bg-success/10' : 'bg-surface',
                        )}>
                          <item.icon className={cn('w-3.5 h-3.5', item.active ? 'text-success' : 'text-muted')} />
                        </div>
                        <span className={cn('text-sm', item.active ? 'text-foreground font-medium' : 'text-muted')}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== STICKY MOBILE BAR ==================== */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/90 backdrop-blur-xl border-t border-border p-4 md:hidden">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider font-medium">Access Fee</p>
            <p className="text-xl font-extrabold text-foreground">
              {formatFee(expert.access_fee_minor, expert.access_fee_currency)}
            </p>
          </div>
          <button
            disabled={!expert.is_available}
            onClick={handleRequestAccess}
            className={cn(
              'py-3 px-6 font-bold text-sm rounded-xl transition-all active:scale-[0.98]',
              expert.is_available
                ? `bg-gradient-to-r ${gradient} text-white shadow-lg hover:opacity-90`
                : 'bg-surface text-muted border border-border cursor-not-allowed',
            )}
          >
            {expert.is_available ? 'Request Access' : 'Unavailable'}
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
