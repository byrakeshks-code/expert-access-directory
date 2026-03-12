'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Star, Clock, TrendingUp, ArrowRight, User, BadgeCheck, Zap, Check, X, Sparkles, AlertTriangle, XCircle, ClockIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, cn, toArray } from '@/lib/utils';
import { STATUS_COLORS, INTERACTION_MODES } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { Badge, TierBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition } from '@/components/shared/page-transition';
import { StaggerContainer, StaggerItem } from '@/components/shared/page-transition';

export default function ExpertDashboard() {
  const { profile, expertProfile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [actionReqId, setActionReqId] = useState<string | null>(null);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseNote, setResponseNote] = useState('');
  const [contactTerms, setContactTerms] = useState('');
  const [interactionMode, setInteractionMode] = useState('chat');
  const [indicatedPrice, setIndicatedPrice] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    api.get<any>('/requests?limit=5')
      .then((res) => setRequests(toArray(res)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openAccept = (reqId: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setActionReqId(reqId); setResponseNote(''); setContactTerms('');
    setInteractionMode('chat'); setIndicatedPrice(''); setAcceptOpen(true);
  };
  const openReject = (reqId: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setActionReqId(reqId); setRejectionReason(''); setRejectOpen(true);
  };

  const handleAccept = async () => {
    if (!actionReqId) return;
    setIsSubmitting(true);
    try {
      await api.post(`/requests/${actionReqId}/respond`, {
        decision: 'accepted', response_note: responseNote, contact_terms: contactTerms,
        interaction_mode: interactionMode,
        contact_price_indicated: indicatedPrice ? Math.round(Number(indicatedPrice)) : undefined,
      });
      setRequests((prev) => prev.map((r) => r.id === actionReqId ? { ...r, status: 'payment_coordination' } : r));
      setAcceptOpen(false);
    } catch {} finally { setIsSubmitting(false); }
  };

  const handleReject = async () => {
    if (!actionReqId) return;
    setIsSubmitting(true);
    try {
      await api.post(`/requests/${actionReqId}/respond`, { decision: 'rejected', response_note: rejectionReason });
      setRequests((prev) => prev.map((r) => r.id === actionReqId ? { ...r, status: 'rejected' } : r));
      setRejectOpen(false);
    } catch {} finally { setIsSubmitting(false); }
  };

  const pendingRequests = requests.filter((r) => r.status === 'sent').length;

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Page header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-secondary to-primary p-6 sm:p-8">
          <div className="absolute inset-0 opacity-15">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          </div>
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Expert Dashboard
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Welcome, {profile?.full_name?.split(' ')[0] || 'Expert'}
              </h1>
              <p className="text-white/70 text-sm mt-1">Manage your requests and grow your practice</p>
            </div>
            {expertProfile && (
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
                <Zap className="w-4 h-4 text-white" />
                <TierBadge tier={expertProfile.current_tier} className="!bg-white/20 !text-white border border-white/20" />
              </div>
            )}
          </div>
        </div>

        {/* Pending approval banner */}
        {expertProfile && expertProfile.verification_status !== 'verified' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            {expertProfile.verification_status === 'rejected' ? (
              <div className="flex items-start gap-3 rounded-2xl border border-error/30 bg-error-light px-5 py-4">
                <XCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-error">Application Not Approved</p>
                  <p className="text-sm text-error/80 mt-0.5">
                    Your expert application was not approved. Please review your profile details, update any missing information, and resubmit &mdash; or contact support for help.
                  </p>
                  <Link href="/expert/profile" className="inline-flex items-center gap-1 text-sm font-semibold text-error mt-2 hover:underline">
                    Edit Profile <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning-light px-5 py-4">
                <ClockIcon className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-warning">Pending Approval</p>
                  <p className="text-sm text-warning/80 mt-0.5">
                    Your expert profile is awaiting admin review. You&apos;ll be notified once your application is approved. In the meantime, make sure your profile and verification documents are complete.
                  </p>
                  <Link href="/expert/verification" className="inline-flex items-center gap-1 text-sm font-semibold text-warning mt-2 hover:underline">
                    Upload Verification Docs <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: FileText, label: 'Pending', value: pendingRequests, color: 'text-warning', bg: 'bg-warning/10' },
            { icon: Star, label: 'Rating', value: expertProfile?.avg_rating?.toFixed(1) || '0.0', color: 'text-warning', bg: 'bg-warning/10' },
            { icon: TrendingUp, label: 'Reviews', value: expertProfile?.total_reviews || 0, color: 'text-primary', bg: 'bg-primary/10' },
            { icon: Clock, label: 'Experience', value: `${expertProfile?.years_experience || 0}y`, color: 'text-info', bg: 'bg-info/10' },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-elevated border border-border rounded-xl p-4 text-center hover:shadow-md transition-shadow">
              <div className={cn('w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center', stat.bg)}>
                <stat.icon className={cn('w-5 h-5', stat.color)} />
              </div>
              <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Subscription — hidden: subscription module disabled for now
        {expertProfile && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="bg-surface-elevated border border-border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Current Plan</p>
                  <TierBadge tier={expertProfile.current_tier} />
                </div>
              </div>
              <Link href="/expert/subscription">
                <Button variant="outline" size="sm">Manage</Button>
              </Link>
            </div>
          </motion.div>
        )}
        */}

        {/* Quick actions */}
        <div className="flex gap-3 flex-wrap">
          <Link href="/expert/profile">
            <Button variant="outline" leftIcon={<User className="w-4 h-4" />}>Edit Profile</Button>
          </Link>
          <Link href="/expert/requests">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]">
              <FileText className="w-4 h-4" /> View Requests
            </button>
          </Link>
          <Link href="/expert/verification">
            <Button variant="outline" leftIcon={<BadgeCheck className="w-4 h-4" />}>Verification</Button>
          </Link>
        </div>

        {/* Recent requests */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-primary" />
              </div>
              Recent Requests
            </h2>
            <Link href="/expert/requests" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-surface-elevated border border-border rounded-2xl text-center py-10 px-6">
              <FileText className="w-8 h-8 text-muted mx-auto mb-2" />
              <p className="text-muted text-sm">No requests yet</p>
            </div>
          ) : (
            <StaggerContainer className="space-y-3">
              {requests.slice(0, 5).map((req) => {
                const s = STATUS_COLORS[req.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
                const isPending = req.status === 'sent';
                return (
                  <StaggerItem key={req.id}>
                    <Link href={`/expert/requests/${req.id}`}>
                      <div className="bg-surface-elevated border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', s.bg)}>
                            <FileText className={cn('w-4 h-4', s.text)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{req.subject || 'Untitled'}</p>
                            <p className="text-xs text-muted">{formatDate(req.created_at)}</p>
                          </div>
                          <Badge className={cn(s.bg, s.text)} size="sm">{s.label}</Badge>
                        </div>
                        {isPending && (
                          <div className="flex gap-2 mt-3 ml-12">
                            <Button size="sm" onClick={(e) => openAccept(req.id, e)} leftIcon={<Check className="w-3.5 h-3.5" />}>Accept</Button>
                            <Button size="sm" variant="danger" onClick={(e) => openReject(req.id, e)} leftIcon={<X className="w-3.5 h-3.5" />}>Reject</Button>
                          </div>
                        )}
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>

        {/* Accept modal */}
        <Modal open={acceptOpen} onClose={() => setAcceptOpen(false)} title="Accept Request">
          <div className="space-y-4">
            <Textarea label="Response Note" placeholder="Any message for the user..." value={responseNote} onChange={(e) => setResponseNote(e.target.value)} rows={3} />
            <Input label="Contact Terms" placeholder="e.g., Available via Zoom on weekdays" value={contactTerms} onChange={(e) => setContactTerms(e.target.value)} />
            <Select label="Interaction Mode" options={INTERACTION_MODES.map((m) => ({ value: m.value, label: m.label }))} value={interactionMode} onChange={(e) => setInteractionMode(e.target.value)} />
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
