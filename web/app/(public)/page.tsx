'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Shield, CreditCard, MessageSquare, ArrowRight, CheckCircle,
  Sparkles, Scale, Cpu, TrendingUp, HeartPulse, GraduationCap, Briefcase,
  Globe, Zap, Users, Star, Crown, Rocket, Award, BarChart3, Headphones,
  BadgeCheck, Clock, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, GlassCard } from '@/components/ui/card';
import { TierBadge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { StarRating } from '@/components/ui/star-rating';
import { PageTransition } from '@/components/shared/page-transition';
import { StaggerContainer, StaggerItem } from '@/components/shared/page-transition';
import { api } from '@/lib/api';
import { formatFee, toArray } from '@/lib/utils';

interface Domain {
  id: string;
  name: string;
  slug: string;
  icon_url?: string;
  description?: string;
}

interface FeaturedExpert {
  id: string;
  full_name: string;
  headline: string;
  access_fee_minor: number;
  access_fee_currency: string;
  current_tier: 'starter' | 'pro' | 'elite';
  avg_rating: number;
  total_reviews: number;
  avatar_url?: string;
  primary_domain_name?: string;
}

interface Tier {
  id: string;
  display_name: string;
  slug?: string;
  description?: string;
  price_monthly_minor: number;
  price_yearly_minor: number;
  currency: string;
  features: Record<string, boolean> | string[] | string;
  is_popular?: boolean;
}

const DOMAIN_VISUALS: Record<string, { icon: any; gradient: string; image: string }> = {
  legal:            { icon: Scale,         gradient: 'from-amber-500 to-orange-600',   image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&h=400&fit=crop' },
  technology:       { icon: Cpu,           gradient: 'from-blue-500 to-cyan-600',      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop' },
  finance:          { icon: TrendingUp,    gradient: 'from-emerald-500 to-teal-600',   image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop' },
  'health-wellness': { icon: HeartPulse,   gradient: 'from-rose-500 to-pink-600',      image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&h=400&fit=crop' },
  education:        { icon: GraduationCap, gradient: 'from-violet-500 to-purple-600',  image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop' },
  business:         { icon: Briefcase,     gradient: 'from-slate-600 to-gray-700',     image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop' },
};

const DEFAULT_VISUAL = { icon: Globe, gradient: 'from-indigo-500 to-blue-600', image: '' };

const TYPING_PROBLEMS = [
  'property dispute resolution',
  'cloud migration strategy',
  'tax planning for startups',
  'nutrition for chronic disease',
  'college admissions guidance',
];

const TYPING_PROBLEMS_SHORT = [
  'property disputes',
  'cloud migration',
  'tax planning',
  'chronic nutrition',
  'college admissions',
];

const HOW_IT_WORKS = [
  { icon: Search, title: 'Describe Your Query', desc: 'Search by topic or browse domains to find verified experts who match your needs.' },
  { icon: CreditCard, title: 'Pay Once, Get Access', desc: 'Pay a one-time access fee securely. Full refund if the expert doesn\'t respond.' },
  { icon: MessageSquare, title: 'Get Expert Advice', desc: 'Chat, call, or meet — get direct access to a verified professional.' },
];

const STATS = [
  { value: '500+', label: 'Verified Experts' },
  { value: '10k+', label: 'Queries Resolved' },
  { value: '4.8', label: 'Avg. Rating' },
  { value: '< 24h', label: 'Response Time' },
];

const parseFeatures = (features: any): string[] => {
  if (!features) return [];
  if (Array.isArray(features)) return features;
  if (typeof features === 'string') {
    try { return parseFeatures(JSON.parse(features)); } catch { return [features]; }
  }
  if (typeof features === 'object') {
    return Object.entries(features)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  }
  return [];
};

export default function LandingPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [featuredExperts, setFeaturedExperts] = useState<FeaturedExpert[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [typingIndex, setTypingIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 480px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    api.get<any>('/domains').then((res) => setDomains(toArray(res))).catch(() => {});
    api.get<any>('/search/experts?limit=6&sort=rating').then((res) => {
      let hits: any[] = [];
      if (Array.isArray(res)) hits = res;
      else if (res && typeof res === 'object') hits = Array.isArray(res.data) ? res.data : res.hits || [];
      setFeaturedExperts(hits.slice(0, 6).map((h: any) => ({
        ...h,
        id: h.id || h.expert_id,
        avg_rating: h.avg_rating ?? h.rating_avg ?? 0,
        total_reviews: h.total_reviews ?? h.review_count ?? 0,
        primary_domain_name: h.primary_domain_name || h.primary_domain || '',
      })));
    }).catch(() => {});
    api.get<any>('/subscriptions/tiers').then((res) => setTiers(toArray(res))).catch(() => {});
  }, []);

  useEffect(() => {
    const list = isMobile ? TYPING_PROBLEMS_SHORT : TYPING_PROBLEMS;
    const currentText = list[typingIndex];
    let timeout: NodeJS.Timeout;
    if (!isDeleting && displayText.length < currentText.length) {
      timeout = setTimeout(() => setDisplayText(currentText.slice(0, displayText.length + 1)), 60);
    } else if (!isDeleting && displayText.length === currentText.length) {
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayText.length > 0) {
      timeout = setTimeout(() => setDisplayText(displayText.slice(0, -1)), 30);
    } else if (isDeleting && displayText.length === 0) {
      setIsDeleting(false);
      setTypingIndex((prev) => (prev + 1) % list.length);
    }
    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, typingIndex, isMobile]);

  const getDomainVisual = (slug: string) => DOMAIN_VISUALS[slug] || DEFAULT_VISUAL;

  return (
    <PageTransition>
      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' as const }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-primary bg-primary-light/80 backdrop-blur-sm rounded-full mb-8 border border-primary/10">
                <Sparkles className="w-3.5 h-3.5" />
                Trusted by thousands of professionals
              </span>

              <h1
                className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-foreground leading-[1.1] tracking-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Get expert advice
                <br />
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  for any query
                </span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
                Connect with verified professionals across legal, tech, finance, health and more.
                Pay once, get direct access.
              </p>
            </motion.div>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 max-w-2xl mx-auto"
            >
              <Link href="/search">
                <div className="group flex items-center gap-3 bg-surface-elevated/80 backdrop-blur-xl border border-border/60 rounded-2xl px-4 sm:px-6 py-4 sm:py-5 shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden w-full max-w-full">
                  <Search className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-muted text-left flex-1 text-sm sm:text-base whitespace-nowrap overflow-hidden text-ellipsis min-w-0 block">
                    {displayText}
                    <span className="animate-pulse text-primary">|</span>
                  </span>
                  <span className="px-4 sm:px-5 py-2 sm:py-2.5 bg-primary text-white text-sm font-semibold rounded-xl group-hover:bg-primary-hover transition-colors flex-shrink-0">
                    Search
                  </span>
                </div>
              </Link>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto"
            >
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-muted mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Trust signals */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-6"
            >
              {[
                { icon: Shield, text: 'Verified Experts Only' },
                { icon: CreditCard, text: 'Secure Payments' },
                { icon: CheckCircle, text: 'Refund Protection' },
              ].map((signal) => (
                <div key={signal.text} className="flex items-center gap-2 text-sm text-muted">
                  <signal.icon className="w-4 h-4 text-success" />
                  {signal.text}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ==================== BROWSE BY DOMAIN — 3-Column ==================== */}
      {domains.length > 0 && (
        <section className="py-20 sm:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 via-background to-secondary/5" />
          <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-14"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                <Globe className="w-3.5 h-3.5" /> Expertise Areas
              </span>
              <h2
                className="text-3xl sm:text-4xl font-extrabold text-foreground"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Browse by Domain
              </h2>
              <p className="text-muted mt-3 text-lg max-w-lg mx-auto">
                Find verified experts across all major disciplines
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {domains.map((domain, i) => {
                const visual = getDomainVisual(domain.slug);
                const Icon = visual.icon;
                return (
                  <motion.div
                    key={domain.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <Link href={`/search?domain_id=${domain.id}`}>
                      <div className="group relative rounded-2xl overflow-hidden border border-border bg-surface-elevated hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full">
                        {/* Image area */}
                        <div className={`relative h-44 bg-gradient-to-br ${visual.gradient} overflow-hidden`}>
                          {visual.image ? (
                            <img
                              src={visual.image}
                              alt={domain.name}
                              className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60 group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : null}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          <div className="absolute bottom-4 left-4 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white drop-shadow-md">{domain.name}</h3>
                          </div>
                        </div>
                        {/* Content */}
                        <div className="p-5">
                          <p className="text-sm text-muted line-clamp-2">
                            {domain.description || `Connect with verified ${domain.name.toLowerCase()} experts for personalized guidance.`}
                          </p>
                          <div className="flex items-center gap-1.5 mt-4 text-sm font-medium text-primary group-hover:gap-2.5 transition-all">
                            Explore experts <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
              <Zap className="w-3.5 h-3.5" /> Simple Process
            </span>
            <h2
              className="text-3xl sm:text-4xl font-extrabold text-foreground"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              How It Works
            </h2>
            <p className="text-muted mt-3 text-lg">Three simple steps to expert advice</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="text-center relative"
              >
                <div className="relative mx-auto mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mx-auto border border-primary/10">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-sm font-bold flex items-center justify-center shadow-lg">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted mt-3 max-w-xs mx-auto leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FEATURED EXPERTS ==================== */}
      {featuredExperts.length > 0 && (
        <section className="py-20 sm:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 via-background to-secondary/5" />
          <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-14"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                <Star className="w-3.5 h-3.5" /> Top Rated
              </span>
              <h2
                className="text-3xl sm:text-4xl font-extrabold text-foreground"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Featured Experts
              </h2>
              <p className="text-muted mt-3 text-lg">Top-rated professionals ready to help</p>
            </motion.div>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredExperts.map((expert) => (
                <StaggerItem key={expert.id}>
                  <Link href={`/experts/${expert.id}`}>
                    <Card hover className="h-full group">
                      <div className="flex items-start gap-4">
                        <Avatar name={expert.full_name} src={expert.avatar_url} size="lg" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-foreground truncate">{expert.full_name}</h3>
                            <TierBadge tier={expert.current_tier as any} />
                          </div>
                          <p className="text-sm text-muted line-clamp-2 mt-1">{expert.headline}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <StarRating rating={expert.avg_rating} />
                            <span className="text-xs text-muted">({expert.total_reviews})</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-5 pt-4 border-t border-border-light">
                        <div>
                          <p className="text-xs text-muted">Access Fee</p>
                          <p className="text-xl font-extrabold text-foreground">
                            {formatFee(expert.access_fee_minor, expert.access_fee_currency)}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                          View <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </Card>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mt-10"
            >
              <Link href="/search">
                <Button variant="outline" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Browse All Experts
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* ==================== PRICING — hidden: subscription module disabled for now ==================== */}
      {false && tiers.length > 0 && (() => {
        const TIER_META: Record<string, { icon: any; gradient: string; accent: string; tagline: string; perks: string[] }> = {
          starter: {
            icon: Rocket,
            gradient: 'from-slate-500 to-slate-700',
            accent: 'text-slate-600',
            tagline: 'Perfect for getting started',
            perks: ['Basic profile listing', 'Up to 10 requests/month', 'Standard support'],
          },
          pro: {
            icon: Crown,
            gradient: 'from-primary to-secondary',
            accent: 'text-primary',
            tagline: 'Best value for growing experts',
            perks: ['Priority search ranking', 'Unlimited requests', 'Analytics dashboard', 'Priority support'],
          },
          elite: {
            icon: Award,
            gradient: 'from-violet-600 to-purple-700',
            accent: 'text-violet-600',
            tagline: 'For top-tier professionals',
            perks: ['Featured placement', 'Unlimited everything', 'Advanced analytics', 'Dedicated account manager', 'Custom branding'],
          },
        };
        const getTierMeta = (id: string, slug?: string) => TIER_META[slug || id] || TIER_META.starter;

        return (
          <section id="pricing" className="py-20 sm:py-28 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
            <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-14"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                  <Crown className="w-3.5 h-3.5" /> For Experts
                </span>
                <h2
                  className="text-3xl sm:text-4xl font-extrabold text-foreground"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Grow Your Practice
                </h2>
                <p className="text-muted mt-3 text-lg max-w-lg mx-auto">
                  Choose the plan that fits your goals. Upgrade or cancel anytime.
                </p>

                {/* Billing toggle */}
                <div className="inline-flex items-center gap-1 mt-8 p-1.5 bg-surface-elevated border border-border rounded-2xl shadow-sm">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                      billingCycle === 'monthly'
                        ? 'bg-primary text-white shadow-md'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 relative ${
                      billingCycle === 'yearly'
                        ? 'bg-primary text-white shadow-md'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Yearly
                    <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-success text-white">
                      -20%
                    </span>
                  </button>
                </div>
              </motion.div>

              {/* Tier cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto items-stretch">
                {tiers.map((tier, i) => {
                  const price = billingCycle === 'monthly' ? tier.price_monthly_minor : tier.price_yearly_minor;
                  const tierSlug = tier.slug || tier.id;
                  const isPopular = tierSlug === 'pro';
                  const isElite = tierSlug === 'elite';
                  const meta = getTierMeta(tier.id, tier.slug);
                  const TierIcon = meta.icon;
                  const featureList = parseFeatures(tier.features);
                  const displayFeatures = featureList.length > 0 ? featureList : meta.perks;

                  return (
                    <motion.div
                      key={tier.id}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.12 }}
                      className={`relative ${isPopular ? 'md:-mt-4 md:mb-0' : ''}`}
                    >
                      {isPopular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                          <span className="px-5 py-1.5 text-xs font-bold bg-gradient-to-r from-primary to-secondary text-white rounded-full shadow-lg shadow-primary/30 whitespace-nowrap">
                            Most Popular
                          </span>
                        </div>
                      )}
                      <div
                        className={`relative h-full rounded-2xl border p-1 transition-all duration-300 ${
                          isPopular
                            ? 'bg-gradient-to-b from-primary/20 to-secondary/20 border-primary/40 shadow-2xl shadow-primary/15 hover:shadow-primary/25'
                            : isElite
                              ? 'bg-gradient-to-b from-violet-500/10 to-purple-500/10 border-violet-300/40 shadow-lg hover:shadow-xl hover:shadow-violet-500/10'
                              : 'bg-surface-elevated border-border shadow-md hover:shadow-lg'
                        }`}
                      >
                        <div className="bg-surface-elevated rounded-xl p-6 sm:p-8 h-full flex flex-col">
                          {/* Tier icon + name */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-sm`}>
                              <TierIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-foreground">{tier.display_name || tier.id}</h3>
                              <p className="text-xs text-muted">{meta.tagline}</p>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="mb-6">
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight">
                                {formatFee(price, tier.currency)}
                              </span>
                              <span className="text-muted text-sm font-medium">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                            </div>
                            {tier.description && (
                              <p className="text-xs text-muted mt-2">{tier.description}</p>
                            )}
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-border mb-6" />

                          {/* Features */}
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">What&apos;s included</p>
                            <ul className="space-y-3">
                              {displayFeatures.map((feature: string, fi: number) => (
                                <li key={fi} className="flex items-start gap-2.5 text-sm">
                                  <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isPopular ? 'text-primary' : isElite ? 'text-violet-500' : 'text-success'}`} />
                                  <span className="text-muted">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* CTA */}
                          <div className="mt-8">
                            <Link href="/expert/apply">
                              {isPopular ? (
                                <button className="w-full py-3 px-6 bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25 active:scale-[0.98]">
                                  Get Started
                                </button>
                              ) : isElite ? (
                                <button className="w-full py-3 px-6 bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold text-sm rounded-xl hover:opacity-90 transition-all shadow-lg shadow-violet-500/20 active:scale-[0.98]">
                                  Go Elite
                                </button>
                              ) : (
                                <Button variant="outline" className="w-full">
                                  Start Free
                                </Button>
                              )}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Bottom trust bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted"
              >
                {[
                  { icon: Shield, text: 'Cancel anytime' },
                  { icon: CreditCard, text: 'Secure billing' },
                  { icon: Clock, text: '14-day free trial' },
                  { icon: Headphones, text: 'Priority support' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-success" />
                    {item.text}
                  </div>
                ))}
              </motion.div>
            </div>
          </section>
        );
      })()}

      {/* ==================== CTA ==================== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-secondary" />
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-white rounded-full blur-3xl" />
            </div>
            <div className="relative text-center py-16 sm:py-20 px-6">
              <h2
                className="text-3xl sm:text-4xl font-extrabold text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Ready to get expert advice?
              </h2>
              <p className="text-white/80 mt-4 max-w-md mx-auto text-lg">
                Join thousands who have found the right expert for expert guidance.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
                <Link href="/search">
                  <button className="px-8 py-3.5 bg-white text-primary font-bold text-base rounded-xl hover:bg-white/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]">
                    Find an Expert
                  </button>
                </Link>
                <Link href="/expert/apply">
                  <button className="px-8 py-3.5 bg-transparent text-white font-bold text-base rounded-xl border-2 border-white/30 hover:bg-white/10 transition-all active:scale-[0.98]">
                    Become an Expert
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
