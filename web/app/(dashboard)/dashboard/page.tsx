'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Bell, CreditCard, Search, ArrowRight, Clock, Sparkles, Star, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, cn, toArray } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition } from '@/components/shared/page-transition';
import { StaggerContainer, StaggerItem } from '@/components/shared/page-transition';

export default function UserDashboard() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/requests?limit=5')
      .then((res) => setRequests(toArray(res)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeRequests = requests.filter((r) => ['pending', 'sent', 'payment_coordination'].includes(r.status)).length;
  const completedRequests = requests.filter((r) => ['accepted', 'engaged', 'closed'].includes(r.status)).length;

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Page header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-secondary p-6 sm:p-8">
          <div className="absolute inset-0 opacity-15">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          </div>
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Dashboard
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-white/70 text-sm mt-1">Here&apos;s your activity overview</p>
          </div>
        </div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-4">
          {[
            { icon: FileText, label: 'Total Requests', value: requests.length, color: 'text-primary', bg: 'bg-primary/10' },
            { icon: Clock, label: 'Active', value: activeRequests, color: 'text-warning', bg: 'bg-warning/10' },
            { icon: CheckCircle, label: 'Completed', value: completedRequests, color: 'text-success', bg: 'bg-success/10' },
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

        {/* Quick actions */}
        <div className="flex gap-3 flex-wrap">
          <Link href="/search">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]">
              <Search className="w-4 h-4" /> Find Expert
            </button>
          </Link>
          <Link href="/requests">
            <Button variant="outline" leftIcon={<FileText className="w-4 h-4" />}>View All Requests</Button>
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
            <Link href="/requests" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
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
              <p className="text-muted text-sm">No requests yet. Start by finding an expert!</p>
            </div>
          ) : (
            <StaggerContainer className="space-y-3">
              {requests.slice(0, 5).map((req) => {
                const s = STATUS_COLORS[req.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
                return (
                  <StaggerItem key={req.id}>
                    <Link href={`/requests/${req.id}`}>
                      <div className="bg-surface-elevated border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', s.bg)}>
                          <FileText className={cn('w-4 h-4', s.text)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{req.subject || 'Untitled'}</p>
                          <p className="text-xs text-muted">{formatDate(req.created_at)}</p>
                        </div>
                        <Badge className={cn(s.bg, s.text)} size="sm">{s.label}</Badge>
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
