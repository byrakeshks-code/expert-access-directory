'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, ArrowRight, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, cn, toArray } from '@/lib/utils';
import { STATUS_COLORS, INTERACTION_MODES } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { PageTransition } from '@/components/shared/page-transition';
import { StaggerContainer, StaggerItem } from '@/components/shared/page-transition';

export default function ExpertRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  // Quick-action modals
  const [actionReqId, setActionReqId] = useState<string | null>(null);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Accept form
  const [responseNote, setResponseNote] = useState('');
  const [contactTerms, setContactTerms] = useState('');
  const [interactionMode, setInteractionMode] = useState('chat');
  const [indicatedPrice, setIndicatedPrice] = useState('');

  // Reject form
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    api.get<any>('/requests')
      .then((res) => setRequests(toArray(res)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openAccept = (reqId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActionReqId(reqId);
    setResponseNote('');
    setContactTerms('');
    setInteractionMode('chat');
    setIndicatedPrice('');
    setAcceptOpen(true);
  };

  const openReject = (reqId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActionReqId(reqId);
    setRejectionReason('');
    setRejectOpen(true);
  };

  const handleAccept = async () => {
    if (!actionReqId) return;
    setIsSubmitting(true);
    try {
      await api.post(`/requests/${actionReqId}/respond`, {
        decision: 'accepted',
        response_note: responseNote,
        contact_terms: contactTerms,
        interaction_mode: interactionMode,
        contact_price_indicated: indicatedPrice ? Math.round(Number(indicatedPrice)) : undefined,
      });
      setRequests((prev) => prev.map((r) => r.id === actionReqId ? { ...r, status: 'payment_coordination' } : r));
      setAcceptOpen(false);
    } catch {} finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!actionReqId) return;
    setIsSubmitting(true);
    try {
      await api.post(`/requests/${actionReqId}/respond`, {
        decision: 'rejected',
        response_note: rejectionReason,
      });
      setRequests((prev) => prev.map((r) => r.id === actionReqId ? { ...r, status: 'rejected' } : r));
      setRejectOpen(false);
    } catch {} finally {
      setIsSubmitting(false);
    }
  };

  const PAGE_SIZE = 8;
  const [page, setPage] = useState(0);
  const filtered = tab === 'all' ? requests : requests.filter((r) => r.status === tab);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);

  const statusCounts: Record<string, number> = {};
  requests.forEach((r) => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });

  return (
    <PageTransition>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Incoming Requests
              </h1>
              <p className="text-muted text-sm">Manage access requests from users</p>
            </div>
          </div>
        </motion.div>

        <Tabs
          tabs={[
            { value: 'all', label: 'All', count: requests.length },
            { value: 'sent', label: 'Pending', count: statusCounts['sent'] || 0 },
            { value: 'payment_coordination', label: 'Coordination', count: statusCounts['payment_coordination'] || 0 },
            { value: 'engaged', label: 'Engaged', count: statusCounts['engaged'] || 0 },
            { value: 'rejected', label: 'Rejected', count: statusCounts['rejected'] || 0 },
          ]}
          value={tab}
          onChange={(v) => { setTab(v); setPage(0); }}
        />

        {loading ? (
          <ListSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<FileText className="w-8 h-8" />} title="No requests" description="You haven't received any requests yet." />
        ) : (
          <>
            <StaggerContainer className="space-y-3">
              {paged.map((req) => {
                const s = STATUS_COLORS[req.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
                const isPending = req.status === 'sent';
                return (
                  <StaggerItem key={req.id}>
                    <Link href={`/expert/requests/${req.id}`}>
                      <div className="bg-surface-elevated border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                            <FileText className={cn('w-5 h-5', s.text)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{req.subject || 'Untitled'}</p>
                            <p className="text-xs text-muted mt-0.5">{formatDate(req.created_at)}</p>
                            {req.message && (
                              <p className="text-xs text-subtle mt-1 line-clamp-1">{req.message}</p>
                            )}
                          </div>
                          <Badge className={cn(s.bg, s.text)}>{s.label}</Badge>
                          {!isPending && <ArrowRight className="w-4 h-4 text-muted flex-shrink-0" />}
                        </div>
                        {isPending && (
                          <div className="flex gap-2 mt-3 ml-14">
                            <Button
                              size="sm"
                              onClick={(e) => openAccept(req.id, e)}
                              leftIcon={<Check className="w-3.5 h-3.5" />}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={(e) => openReject(req.id, e)}
                              leftIcon={<X className="w-3.5 h-3.5" />}
                            >
                              Reject
                            </Button>
                            <div className="flex-1" />
                            <ArrowRight className="w-4 h-4 text-muted self-center flex-shrink-0" />
                          </div>
                        )}
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
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
              <Button onClick={handleAccept} isLoading={isSubmitting} className="flex-1" leftIcon={<Check className="w-4 h-4" />}>Accept</Button>
            </div>
          </div>
        </Modal>

        {/* Reject modal */}
        <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Request">
          <div className="space-y-4">
            <Textarea label="Reason (optional)" placeholder="Why are you rejecting this request?" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} />
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setRejectOpen(false)} className="flex-1">Cancel</Button>
              <Button variant="danger" onClick={handleReject} isLoading={isSubmitting} className="flex-1" leftIcon={<X className="w-4 h-4" />}>Reject</Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
