'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Zap, ArrowRight, AlertTriangle, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatFee, formatDate, cn } from '@/lib/utils';
import { TIER_COLORS } from '@/lib/constants';
import { Badge, TierBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition } from '@/components/shared/page-transition';

interface Tier {
  id: string;
  display_name?: string;
  name?: string;
  slug?: string;
  description?: string;
  price_monthly_minor: number;
  price_yearly_minor: number;
  currency: string;
  features: Record<string, boolean> | string[] | string;
}

interface Subscription {
  id: string;
  tier_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
}

function parseTierFeatures(features: any): string[] {
  if (!features) return [];
  if (Array.isArray(features)) return features;
  if (typeof features === 'string') {
    try { return parseTierFeatures(JSON.parse(features)); } catch { return [features]; }
  }
  if (typeof features === 'object') {
    return Object.entries(features)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  }
  return [];
}

export default function SubscriptionPage() {
  const { expertProfile } = useAuth();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<any>('/subscriptions/tiers'),
      api.get<any>('/subscriptions/me').catch(() => null),
    ])
      .then(([tiersData, subData]) => {
        setTiers(Array.isArray(tiersData) ? tiersData : tiersData?.data || []);
        setSubscription(subData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (tierId: string) => {
    try {
      await api.post('/subscriptions/subscribe', { tier_id: tierId, billing_cycle: billingCycle });
      window.location.reload();
    } catch {}
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.post('/subscriptions/cancel');
      setCancelOpen(false);
      window.location.reload();
    } catch {} finally { setCancelling(false); }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full rounded-2xl" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;
  }

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Subscription</h1>
            <p className="text-muted text-sm">Manage your expert subscription plan</p>
          </div>
        </div>

        {/* Current plan */}
        {expertProfile && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-secondary p-6">
            <div className="absolute inset-0 opacity-15">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
            </div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-sm">Current Plan</p>
                  <TierBadge tier={expertProfile.current_tier} className="!bg-white/20 !text-white border border-white/30 mt-1" />
                  {subscription && (
                    <p className="text-xs text-white/70 mt-1">
                      Renews {formatDate(subscription.current_period_end)}
                    </p>
                  )}
                </div>
              </div>
              {subscription && subscription.status === 'active' && (
                <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)} className="text-white hover:bg-white/20">
                  Cancel
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Billing toggle */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex justify-center">
          <div className="inline-flex gap-1 p-1 bg-surface rounded-xl">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                billingCycle === 'monthly' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                billingCycle === 'yearly' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
              }`}
            >
              Yearly
            </button>
          </div>
        </motion.div>

        {/* Tier comparison */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-x-auto">
          {tiers.map((tier) => {
            const price = billingCycle === 'monthly' ? tier.price_monthly_minor : tier.price_yearly_minor;
            const isCurrent = expertProfile?.current_tier === tier.id || expertProfile?.current_tier === tier.slug;
            const featureList = parseTierFeatures(tier.features);

            return (
              <div
                key={tier.id}
                className={cn(
                  'flex flex-col bg-surface-elevated border rounded-2xl p-6 hover:shadow-lg transition-all',
                  isCurrent ? 'ring-2 ring-primary/30 border-primary/30' : 'border-border'
                )}
              >
                {isCurrent && (
                  <Badge variant="info" className="self-start mb-2">Current Plan</Badge>
                )}
                <h3 className="text-lg font-bold text-foreground">{tier.display_name || tier.name || tier.id}</h3>
                {tier.description && <p className="text-xs text-muted mt-1">{tier.description}</p>}
                <div className="mt-2">
                  <span className="text-3xl font-extrabold text-foreground">{formatFee(price, tier.currency)}</span>
                  <span className="text-muted text-sm">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                <ul className="mt-4 space-y-2 flex-1">
                  {featureList.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted">
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  {isCurrent ? (
                    <Button variant="outline" disabled className="w-full">Current Plan</Button>
                  ) : (
                    <Button onClick={() => handleUpgrade(tier.id)} className="w-full">
                      {price === 0 ? 'Downgrade' : 'Upgrade'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Cancel modal */}
        <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Subscription?" size="sm">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted">
              Your plan will remain active until the end of the current billing period. After that, you&apos;ll be downgraded to the Starter plan.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setCancelOpen(false)} className="flex-1">Keep Plan</Button>
            <Button variant="danger" onClick={handleCancel} isLoading={cancelling} className="flex-1">Cancel Plan</Button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
