'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, ArrowRight, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, cn, toArray } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { PageTransition } from '@/components/shared/page-transition';
import { StaggerContainer, StaggerItem } from '@/components/shared/page-transition';

interface RequestItem {
  id: string;
  expert_id: string;
  subject: string;
  status: string;
  created_at: string;
  expires_at?: string;
  expert_name?: string;
  expert_headline?: string;
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    api.get<any>('/requests')
      .then((res) => setRequests(toArray(res)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const PAGE_SIZE = 8;
  const [page, setPage] = useState(0);
  const filteredRequests = tab === 'all' ? requests : requests.filter((r) => r.status === tab);
  const totalPages = Math.ceil(filteredRequests.length / PAGE_SIZE);
  const paged = useMemo(() => filteredRequests.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filteredRequests, page]);
  const statusCounts: Record<string, number> = {};
  requests.forEach((r) => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });

  const tabs = [
    { value: 'all', label: 'All', count: requests.length },
    { value: 'sent', label: 'Sent', count: statusCounts['sent'] || 0 },
    { value: 'payment_coordination', label: 'Coordination', count: statusCounts['payment_coordination'] || 0 },
    { value: 'engaged', label: 'Engaged', count: statusCounts['engaged'] || 0 },
    { value: 'pending', label: 'Pending', count: statusCounts['pending'] || 0 },
    { value: 'rejected', label: 'Rejected', count: statusCounts['rejected'] || 0 },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  My Requests
                </h1>
                <p className="text-muted text-sm">Track your expert access requests</p>
              </div>
            </div>
            <Link href="/search">
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]">
                <Search className="w-4 h-4" /> Find Expert
              </button>
            </Link>
          </div>
        </motion.div>

        <Tabs tabs={tabs} value={tab} onChange={(v) => { setTab(v); setPage(0); }} />

        {loading ? (
          <ListSkeleton rows={5} />
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="No requests yet"
            description="Find an expert and send your first request."
            action={<Link href="/search"><Button>Find Experts</Button></Link>}
          />
        ) : (
          <>
            <StaggerContainer className="space-y-3">
              {paged.map((request) => {
                const statusStyle = STATUS_COLORS[request.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
                return (
                  <StaggerItem key={request.id}>
                    <Link href={`/requests/${request.id}`}>
                      <div className="bg-surface-elevated border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', statusStyle.bg)}>
                          <FileText className={cn('w-5 h-5', statusStyle.text)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{request.subject || 'Untitled Request'}</p>
                          <p className="text-xs text-muted mt-0.5">
                            {request.expert_name && `To: ${request.expert_name} · `}
                            {formatDate(request.created_at)}
                          </p>
                        </div>
                        <Badge className={cn(statusStyle.bg, statusStyle.text)}>{statusStyle.label}</Badge>
                        <ArrowRight className="w-4 h-4 text-muted flex-shrink-0" />
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </PageTransition>
  );
}
