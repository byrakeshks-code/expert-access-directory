'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Send, User, CreditCard, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { createPaymentOrder, openRazorpayCheckout, verifyPayment } from '@/lib/payment';
import { formatFee, cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge, TierBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition } from '@/components/shared/page-transition';

interface ExpertInfo {
  id: string;
  headline: string;
  full_name: string;
  avatar_url?: string;
  access_fee_minor: number;
  access_fee_currency: string;
  current_tier: string;
  is_available: boolean;
  primary_domain?: string;
  primary_domain_name?: string;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export default function NewRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const expertId = searchParams.get('expert_id');

  const [expert, setExpert] = useState<ExpertInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');

  useEffect(() => {
    if (!expertId) {
      setLoading(false);
      return;
    }
    api
      .get<any>(`/experts/${expertId}`)
      .then((res) => {
        const e = res;
        setExpert({
          id: e.id,
          headline: e.headline || '',
          full_name: e.full_name || e.users?.full_name || 'Expert',
          avatar_url: e.avatar_url || e.users?.avatar_url,
          access_fee_minor: e.access_fee_minor ?? 0,
          access_fee_currency: e.access_fee_currency || 'INR',
          current_tier: e.current_tier || 'starter',
          is_available: e.is_available ?? true,
          primary_domain: e.primary_domain,
          primary_domain_name: e.primary_domain_name || e.primary_domain || '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [expertId]);

  const isFree = expert ? expert.access_fee_minor === 0 : false;

  const handleSubmit = async () => {
    if (!expert || !subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      if (isFree) {
        await api.post('/requests/free', {
          expert_id: expert.id,
          subject: subject.trim(),
          message: message.trim(),
        });
        router.push('/requests');
        return;
      }

      const order = await createPaymentOrder(expert.id);

      if (!order?.payment_id) {
        setError('Failed to initiate payment. Please try again.');
        return;
      }

      let paymentId = order.payment_id;

      if (!order.demo && order.client_data) {
        const { razorpay_payment_id, razorpay_signature } = await openRazorpayCheckout(
          order,
          profile?.email || '',
          profile?.full_name || '',
        );

        await verifyPayment(
          order.client_data.order_id || order.order_id,
          razorpay_payment_id,
          razorpay_signature,
        );
      }

      await api.post('/requests', {
        expert_id: expert.id,
        access_payment_id: paymentId,
        subject: subject.trim(),
        message: message.trim(),
      });

      router.push('/requests');
    } catch (err: any) {
      if (err.message === 'Payment cancelled') {
        setError('Payment was cancelled. You can try again.');
      } else {
        setError(err.message || 'Failed to create request. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!expertId || !expert) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <AlertCircle className="w-12 h-12 text-muted mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground">No expert selected</h2>
        <p className="text-muted text-sm mt-2">Please select an expert from the search page first.</p>
        <Button variant="outline" onClick={() => router.push('/search')} className="mt-6">
          Browse Experts
        </Button>
      </div>
    );
  }

  if (!expert.is_available) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground">Expert Unavailable</h2>
        <p className="text-muted text-sm mt-2">This expert is currently not accepting new requests.</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-6">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <PageTransition>
      <motion.div
        className="max-w-lg mx-auto space-y-6"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={fadeUp}>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted hover:text-foreground bg-surface-elevated border border-border rounded-xl transition-all mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1
                className="text-2xl font-extrabold text-foreground"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Request Access
              </h1>
              <p className="text-muted text-sm">Send a consultation request to this expert</p>
            </div>
          </div>
        </motion.div>

        {/* Expert info card */}
        <motion.div
          variants={fadeUp}
          className="bg-surface-elevated border border-border rounded-2xl p-4 flex items-center gap-4"
        >
          <Avatar name={expert.full_name} src={expert.avatar_url} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{expert.full_name}</h3>
              {expert.current_tier !== 'starter' && (
                <TierBadge tier={expert.current_tier as 'pro' | 'elite'} />
              )}
            </div>
            <p className="text-sm text-muted truncate">{expert.headline}</p>
            {expert.primary_domain_name && (
              <Badge variant="outline" size="sm" className="mt-1">
                {expert.primary_domain_name}
              </Badge>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted">Fee</p>
            <p className="text-lg font-bold text-foreground">
              {formatFee(expert.access_fee_minor, expert.access_fee_currency)}
            </p>
          </div>
        </motion.div>

        {/* Request form */}
        {step === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="bg-surface-elevated border border-border rounded-2xl p-6"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Subject <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your query..."
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-foreground text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <p className="text-xs text-muted mt-1">{subject.length}/200</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Message <span className="text-error">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your query in detail. The more context you provide, the better the expert can help you..."
                  maxLength={5000}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-foreground text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-vertical"
                />
                <p className="text-xs text-muted mt-1">{message.length}/5000</p>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={!subject.trim() || !message.trim()}
                onClick={() => setStep('confirm')}
                rightIcon={isFree ? <Send className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
              >
                {isFree ? 'Review & Send' : 'Continue to Payment'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Confirmation step */}
        {step === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="bg-surface-elevated border border-border rounded-2xl p-6"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4">Confirm Your Request</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Expert</span>
                <span className="font-medium text-foreground">{expert.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Subject</span>
                <span className="font-medium text-foreground truncate ml-4 max-w-[200px]">{subject}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="text-muted">Access Fee</span>
                <span className="text-lg font-bold text-foreground">
                  {isFree ? 'Free' : formatFee(expert.access_fee_minor, expert.access_fee_currency)}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted mt-4 leading-relaxed">
              {isFree
                ? 'This is a free consultation request. You will receive a guaranteed response within 48 hours.'
                : 'By proceeding, you agree to pay the access fee. You will receive a guaranteed response within 48 hours. If the expert does not respond or rejects your request, you will receive a full refund.'}
            </p>

            {error && (
              <div className="mt-4 px-4 py-3 bg-error-light border border-error/20 rounded-xl text-sm text-error">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                isLoading={submitting}
                leftIcon={<Send className="w-4 h-4" />}
              >
                {isFree ? 'Send Request' : 'Pay & Send Request'}
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </PageTransition>
  );
}
