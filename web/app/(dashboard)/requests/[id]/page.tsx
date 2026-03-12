'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageSquare, Ban, Star, AlertCircle, FileText, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, formatFee, cn } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { PageTransition } from '@/components/shared/page-transition';
import { RequestTimeline, buildTimelineSteps } from '@/components/request/request-timeline';
import { SLACountdown } from '@/components/request/sla-countdown';
import { Conversation } from '@/components/request/conversation';
import { PaymentCoordination } from '@/components/request/payment-coordination';

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [request, setRequest] = useState<any>(null);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    Promise.all([
      api.get<any>(`/requests/${requestId}`),
      api.get<any>(`/requests/${requestId}/response`).catch(() => null),
    ])
      .then(([req, res]) => {
        setRequest(req);
        setResponse(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [requestId]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.post(`/requests/${requestId}/cancel`);
      setRequest((prev: any) => ({ ...prev, status: 'cancelled' }));
      setCancelOpen(false);
    } catch {
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-foreground">Request not found</h2>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const statusStyle = STATUS_COLORS[request.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
  const canCancel = ['sent', 'pending', 'payment_coordination'].includes(request.status);
  const canReview = (request.status === 'engaged' || request.status === 'accepted' || request.status === 'closed') && !request.has_review;
  const timelineSteps = buildTimelineSteps(request);

  return (
    <PageTransition>
      <div className="space-y-6">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0 }}
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted hover:text-foreground bg-surface-elevated border border-border rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Requests
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {request.subject || 'Request Detail'}
              </h1>
              <p className="text-sm text-muted">ID: {request.id}</p>
            </div>
          </div>
          <Badge size="md" className={cn('text-sm', statusStyle.bg, statusStyle.text)}>
            {statusStyle.label}
          </Badge>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-elevated border border-border rounded-2xl p-6"
        >
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-3 h-3 text-primary" />
            </div>
            Status Timeline
          </h3>
          <RequestTimeline steps={timelineSteps} />
        </motion.div>

        {/* SLA Countdown */}
        {request.status === 'sent' && request.expires_at && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <SLACountdown expiresAt={request.expires_at} className="w-full justify-center" />
          </motion.div>
        )}

        {/* Request content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-elevated border border-border rounded-2xl p-6"
        >
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-3 h-3 text-primary" />
            </div>
            Your Request
          </h3>
          <p className="text-xs text-muted mb-3">Sent on {formatDate(request.created_at)}</p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{request.message}</p>
        </motion.div>

        {/* Expert response */}
        {response && ['payment_coordination', 'engaged', 'accepted', 'closed'].includes(request.status) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="border border-success/30 bg-success-light/30 rounded-2xl p-6"
          >
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-success/10 flex items-center justify-center">
                <MessageSquare className="w-3 h-3 text-success" />
              </div>
              Expert Response
            </h3>
            {response.response_note && (
              <p className="text-sm text-foreground leading-relaxed mb-3">{response.response_note}</p>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {response.interaction_mode && (
                <div>
                  <p className="text-xs text-muted">Interaction Mode</p>
                  <p className="font-medium text-foreground capitalize">{response.interaction_mode.replace('_', ' ')}</p>
                </div>
              )}
              {response.contact_price_indicated && (
                <div>
                  <p className="text-xs text-muted">Indicated Price</p>
                  <p className="font-medium text-foreground">
                    {formatFee(response.contact_price_indicated, response.currency || 'INR')}
                  </p>
                </div>
              )}
              {response.contact_terms && (
                <div className="col-span-2">
                  <p className="text-xs text-muted">Contact Terms</p>
                  <p className="font-medium text-foreground">{response.contact_terms}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Payment Coordination Chat */}
        {['payment_coordination', 'coordination_expired', 'engaged', 'accepted', 'closed'].includes(request.status) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <PaymentCoordination
              requestId={requestId}
              requestStatus={request.status}
              coordinationExpiresAt={request.coordination_expires_at}
              userPaymentConfirmed={request.user_payment_confirmed}
              expertPaymentConfirmed={request.expert_payment_confirmed}
              isExpertView={false}
              onStatusChange={(s) => setRequest((prev: any) => ({ ...prev, status: s }))}
            />
          </motion.div>
        )}

        {/* Full conversation (only for engaged/closed requests) */}
        {['engaged', 'accepted', 'closed'].includes(request.status) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Conversation
              requestId={requestId}
              requestStatus={request.status}
              onClose={() => setRequest((prev: any) => ({ ...prev, status: 'closed' }))}
            />
          </motion.div>
        )}

        {/* Rejection reason */}
        {request.status === 'rejected' && response?.rejection_reason && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="border border-error/30 bg-error-light/30 rounded-2xl p-6"
          >
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-error/10 flex items-center justify-center">
                <Ban className="w-3 h-3 text-error" />
              </div>
              Rejection Reason
            </h3>
            <p className="text-sm text-muted">{response.rejection_reason}</p>
          </motion.div>
        )}

        {/* Refund info */}
        {['rejected', 'expired', 'cancelled'].includes(request.status) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="border border-info/30 bg-info-light/30 rounded-2xl p-6"
          >
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-info/10 flex items-center justify-center">
                <AlertCircle className="w-3 h-3 text-info" />
              </div>
              Refund Information
            </h3>
            <p className="text-sm text-muted">
              Your payment will be refunded within 5-7 business days. Check the Refunds section for status updates.
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3 flex-wrap"
        >
          {canCancel && (
            <Button variant="danger" onClick={() => setCancelOpen(true)}>
              Cancel Request
            </Button>
          )}
          {canReview && (
            <Link href={`/requests/${requestId}/review`}>
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                <Star className="w-4 h-4" />
                Leave Review
              </span>
            </Link>
          )}
        </motion.div>

        {/* Cancel confirmation */}
        <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Request?" size="sm">
          <p className="text-sm text-muted mb-6">
            Are you sure you want to cancel this request? Your payment will be refunded.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setCancelOpen(false)} className="flex-1">
              Keep Request
            </Button>
            <Button variant="danger" onClick={handleCancel} isLoading={cancelling} className="flex-1">
              Cancel Request
            </Button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
