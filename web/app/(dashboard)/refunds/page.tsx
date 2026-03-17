'use client';

import { useEffect, useState, useMemo } from 'react';
import { CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { formatDate, formatFee, cn, toArray } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { PageTransition } from '@/components/shared/page-transition';

interface Refund {
  id: string;
  amount_minor: number;
  currency: string;
  status: string;
  reason?: string;
  created_at: string;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 8;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(refunds.length / PAGE_SIZE);
  const paged = useMemo(() => refunds.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [refunds, page]);

  useEffect(() => {
    api.get<any>('/refunds')
      .then((res) => setRefunds(toArray(res)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <motion.div
        className="space-y-6"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1
              className="text-2xl font-extrabold text-foreground"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Refunds
            </h1>
            <p className="text-muted text-sm">Track your refund status</p>
          </div>
        </motion.div>

        {loading ? (
          <ListSkeleton rows={4} />
        ) : refunds.length === 0 ? (
          <motion.div variants={fadeUp}>
            <EmptyState
              icon={<CreditCard className="w-8 h-8" />}
              title="No refunds"
              description="You don't have any refunds yet."
            />
          </motion.div>
        ) : (
          <>
            <motion.div variants={fadeUp} className="space-y-3">
              {paged.map((refund) => {
                const s = STATUS_COLORS[refund.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
                return (
                  <div
                    key={refund.id}
                    className="bg-surface-elevated border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.bg)}>
                          <CreditCard className={cn('w-5 h-5', s.text)} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {formatFee(refund.amount_minor, refund.currency)}
                          </p>
                          <p className="text-xs text-muted">{formatDate(refund.created_at)}</p>
                        </div>
                      </div>
                      <Badge className={cn(s.bg, s.text)}>{s.label}</Badge>
                    </div>
                    {refund.reason && (
                      <p className="text-sm text-muted mt-3 ml-13">{refund.reason}</p>
                    )}
                  </div>
                );
              })}
            </motion.div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </motion.div>
    </PageTransition>
  );
}
