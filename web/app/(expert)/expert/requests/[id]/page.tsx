'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, X, ShieldBan, MessageSquare, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { STATUS_COLORS, INTERACTION_MODES } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { PageTransition } from '@/components/shared/page-transition';
import { SLACountdown } from '@/components/request/sla-countdown';
import { Conversation } from '@/components/request/conversation';
import { PaymentCoordination } from '@/components/request/payment-coordination';

export default function ExpertRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Accept form
  const [responseNote, setResponseNote] = useState('');
  const [contactTerms, setContactTerms] = useState('');
  const [interactionMode, setInteractionMode] = useState('chat');
  const [indicatedPrice, setIndicatedPrice] = useState('');

  // Reject form
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (!requestId) return;
    api.get<any>(`/requests/${requestId}`)
      .then(setRequest)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [requestId]);

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/requests/${requestId}/respond`, {
        decision: 'accepted',
        response_note: responseNote,
        contact_terms: contactTerms,
        interaction_mode: interactionMode,
        contact_price_indicated: indicatedPrice ? Math.round(Number(indicatedPrice)) : undefined,
      });
      setRequest((prev: any) => ({ ...prev, status: 'payment_coordination' }));
      setAcceptOpen(false);
    } catch {} finally { setIsSubmitting(false); }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/requests/${requestId}/respond`, {
        decision: 'rejected',
        rejection_reason: rejectionReason,
      });
      setRequest((prev: any) => ({ ...prev, status: 'rejected' }));
      setRejectOpen(false);
    } catch {} finally { setIsSubmitting(false); }
  };

  const handleBlock = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/blocked-users', { blocked_user_id: request?.user_id });
      setBlockOpen(false);
    } catch {} finally { setIsSubmitting(false); }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-48 w-full rounded-2xl" /></div>;
  }

  if (!request) {
    return <div className="text-center py-16"><h2 className="text-xl font-bold text-foreground">Request not found</h2></div>;
  }

  const s = STATUS_COLORS[request.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
  const canRespond = request.status === 'sent';

  return (
    <PageTransition>
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted hover:text-foreground bg-surface-elevated border border-border rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {request.subject || 'Request'}
              </h1>
              <p className="text-muted text-sm">Sent on {formatDate(request.created_at)}</p>
            </div>
          </div>
          <Badge className={cn(s.bg, s.text)}>{s.label}</Badge>
        </motion.div>

        {request.status === 'sent' && request.expires_at && (
          <SLACountdown expiresAt={request.expires_at} />
        )}

        {/* Request details */}
        <div className="bg-surface-elevated border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-semibold text-foreground">Request details</h2>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={request.user_name || 'User'} size="md" />
            <div>
              <p className="font-medium text-foreground">{request.user_name || 'User'}</p>
              <p className="text-xs text-muted">Sent on {formatDate(request.created_at)}</p>
            </div>
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{request.message}</p>
        </div>

        {/* Payment Coordination Chat */}
        {['payment_coordination', 'coordination_expired', 'engaged', 'accepted', 'closed'].includes(request.status) && (
          <PaymentCoordination
            requestId={requestId}
            requestStatus={request.status}
            coordinationExpiresAt={request.coordination_expires_at}
            userPaymentConfirmed={request.user_payment_confirmed}
            expertPaymentConfirmed={request.expert_payment_confirmed}
            isExpertView={true}
            onStatusChange={(s) => setRequest((prev: any) => ({ ...prev, status: s }))}
          />
        )}

        {/* Full conversation (shown for engaged/accepted/closed requests) */}
        {['engaged', 'accepted', 'closed'].includes(request.status) && (
          <Conversation
            requestId={requestId}
            requestStatus={request.status}
            canClose
            onClose={() => setRequest((prev: any) => ({ ...prev, status: 'closed' }))}
          />
        )}

        {/* Action buttons */}
        {canRespond && (
          <div className="flex gap-3 flex-wrap sticky bottom-16 md:bottom-0 bg-background/90 backdrop-blur-xl py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 border-t border-border md:border-0 md:bg-transparent md:static md:backdrop-blur-none">
            <Button onClick={() => setAcceptOpen(true)} className="flex-1" leftIcon={<Check className="w-4 h-4" />}>
              Accept
            </Button>
            <Button variant="danger" onClick={() => setRejectOpen(true)} className="flex-1" leftIcon={<X className="w-4 h-4" />}>
              Reject
            </Button>
            <Button variant="ghost" onClick={() => setBlockOpen(true)} size="sm" leftIcon={<ShieldBan className="w-4 h-4" />}>
              Block
            </Button>
          </div>
        )}

        {/* Accept modal */}
        <Modal open={acceptOpen} onClose={() => setAcceptOpen(false)} title="Accept Request">
          <div className="space-y-4">
            <Textarea label="Response Note" placeholder="Any message for the user..." value={responseNote} onChange={(e) => setResponseNote(e.target.value)} rows={3} />
            <Input label="Contact Terms" placeholder="e.g., Available via Zoom on weekdays" value={contactTerms} onChange={(e) => setContactTerms(e.target.value)} />
            <Select
              label="Interaction Mode"
              options={INTERACTION_MODES.map((m) => ({ value: m.value, label: m.label }))}
              value={interactionMode}
              onChange={(e) => setInteractionMode(e.target.value)}
            />
            <Input label="Indicated Price (optional)" type="number" placeholder="e.g., 999" value={indicatedPrice} onChange={(e) => setIndicatedPrice(e.target.value)} hint="In major currency units" />
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setAcceptOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAccept} isLoading={isSubmitting} className="flex-1">Accept</Button>
            </div>
          </div>
        </Modal>

        {/* Reject modal */}
        <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Request">
          <div className="space-y-4">
            <Textarea label="Reason (optional)" placeholder="Why are you rejecting this request?" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} />
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setRejectOpen(false)} className="flex-1">Cancel</Button>
              <Button variant="danger" onClick={handleReject} isLoading={isSubmitting} className="flex-1">Reject</Button>
            </div>
          </div>
        </Modal>

        {/* Block modal */}
        <Modal open={blockOpen} onClose={() => setBlockOpen(false)} title="Block User?" size="sm">
          <p className="text-sm text-muted mb-4">This user will no longer be able to send you requests.</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setBlockOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={handleBlock} isLoading={isSubmitting} className="flex-1">Block User</Button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
