'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, ArrowRight, CheckCircle, Tag, Star } from 'lucide-react';
import { TierBadge } from '@/components/ui/badge';
import { formatFee, cn, getInitials } from '@/lib/utils';

interface ExpertCardProps {
  expert: {
    id: string;
    full_name: string;
    headline: string;
    access_fee_minor: number;
    access_fee_currency: string;
    is_available: boolean;
    current_tier: string;
    avg_rating: number;
    total_reviews: number;
    years_experience: number;
    city?: string;
    country?: string;
    avatar_url?: string;
    primary_domain_name?: string;
    specializations?: string[];
    tags?: string[];
    verification_status?: string;
  };
}

const TIER_GRADIENTS: Record<string, string> = {
  elite: 'from-violet-600 via-purple-600 to-fuchsia-600',
  pro: 'from-primary via-primary to-secondary',
  starter: 'from-slate-500 via-slate-600 to-slate-700',
};

export function ExpertCard({ expert }: ExpertCardProps) {
  const isVerified = expert.verification_status === 'verified';
  const tier = expert.current_tier as 'starter' | 'pro' | 'elite';
  const gradient = TIER_GRADIENTS[tier] || TIER_GRADIENTS.starter;
  const initials = getInitials(expert.full_name);

  const allChips: { label: string; type: 'spec' | 'tag' }[] = [
    ...(expert.specializations || []).slice(0, 3).map((s) => ({ label: s, type: 'spec' as const })),
    ...(expert.tags || []).slice(0, 3).map((t) => ({ label: t, type: 'tag' as const })),
  ];
  const extraCount =
    Math.max(0, (expert.specializations?.length || 0) - 3) +
    Math.max(0, (expert.tags?.length || 0) - 3);

  return (
    <motion.div
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Link href={`/experts/${expert.id}`} className="h-full block">
        <div className="group bg-surface-elevated border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 h-full flex flex-col">
          {/* Gradient header */}
          <div className={`relative bg-gradient-to-r ${gradient} px-5 pt-5 pb-10 flex-shrink-0`}>
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
            </div>
            <div className="relative flex items-center justify-between">
              <TierBadge tier={tier} className="!bg-white/20 !text-white backdrop-blur-sm border border-white/20" />
              {expert.is_available ? (
                <span className="px-2.5 py-1 text-[10px] font-bold text-white bg-white/20 backdrop-blur-sm rounded-full border border-white/20">
                  Available
                </span>
              ) : (
                <span className="px-2.5 py-1 text-[10px] font-bold text-white/60 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
                  Unavailable
                </span>
              )}
            </div>
          </div>

          {/* Avatar overlapping the gradient */}
          <div className="flex justify-center -mt-8 relative z-10 flex-shrink-0">
            {expert.avatar_url ? (
              <img
                src={expert.avatar_url}
                alt={expert.full_name}
                className="w-16 h-16 rounded-full object-cover border-[3px] border-surface-elevated shadow-lg"
              />
            ) : (
              <div className={`w-16 h-16 rounded-full border-[3px] border-surface-elevated shadow-lg flex items-center justify-center font-bold text-lg text-white bg-gradient-to-br ${gradient}`}>
                {initials}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col flex-1 px-5 pt-2 pb-4">
            {/* Name + domain + headline — fixed area */}
            <div className="text-center flex-shrink-0">
              <div className="flex items-center justify-center gap-1.5">
                <h3 className="font-bold text-foreground text-sm truncate max-w-[180px]">{expert.full_name}</h3>
                {isVerified && <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />}
              </div>
              {expert.primary_domain_name && (
                <p className="text-[11px] font-medium text-primary mt-0.5">{expert.primary_domain_name}</p>
              )}
              <p className="text-[11px] text-muted line-clamp-2 mt-1 leading-relaxed">{expert.headline}</p>
            </div>

            {/* Rating + location */}
            <div className="flex items-center justify-center gap-2.5 mt-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-warning fill-warning" />
                <span className="text-xs font-bold text-foreground">{(expert.avg_rating || 0).toFixed(1)}</span>
                <span className="text-[10px] text-muted">({expert.total_reviews})</span>
              </div>
              {(expert.city || expert.country) && (
                <>
                  <span className="w-0.5 h-0.5 rounded-full bg-border" />
                  <div className="flex items-center gap-0.5 text-[10px] text-muted">
                    <MapPin className="w-2.5 h-2.5" />
                    <span className="truncate max-w-[100px]">{[expert.city, expert.country].filter(Boolean).join(', ')}</span>
                  </div>
                </>
              )}
            </div>

            {/* Chips area — fixed height, overflow hidden */}
            <div className="h-[4.5rem] mt-2 flex gap-1 flex-wrap justify-center content-start overflow-hidden flex-shrink-0">
              {allChips.slice(0, 6).map((chip) => (
                chip.type === 'tag' ? (
                  <span key={chip.label} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-primary/8 text-primary text-[10px] font-medium rounded-md leading-tight">
                    <Tag className="w-2.5 h-2.5" />{chip.label}
                  </span>
                ) : (
                  <span key={chip.label} className="px-2 py-0.5 text-[10px] font-medium text-muted bg-surface rounded-md border border-border leading-tight">
                    {chip.label}
                  </span>
                )
              ))}
              {extraCount > 0 && (
                <span className="text-[10px] text-muted leading-tight py-0.5">+{extraCount}</span>
              )}
            </div>

            {/* Footer — price + View button */}
            <div className="flex items-center justify-between pt-3 mt-auto border-t border-border-light flex-shrink-0">
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider font-medium">Access Fee</p>
                <p className="text-base font-extrabold text-foreground leading-tight">
                  {formatFee(expert.access_fee_minor, expert.access_fee_currency)}
                </p>
              </div>
              {expert.is_available ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-sm group-hover:bg-primary-hover group-hover:shadow-md transition-all active:scale-[0.97]">
                  View <ArrowRight className="w-3.5 h-3.5" />
                </span>
              ) : (
                <span className="inline-flex items-center px-4 py-2 bg-surface text-muted text-xs font-medium rounded-xl border border-border">
                  Unavailable
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
