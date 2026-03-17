'use client';

import { useEffect, useState, useMemo } from 'react';
import { Star, Flag, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, cn, toArray } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { StarRating } from '@/components/ui/star-rating';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { PageTransition } from '@/components/shared/page-transition';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_name?: string;
  is_flagged?: boolean;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export default function ExpertReviewsPage() {
  const { expertProfile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagTarget, setFlagTarget] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagging, setFlagging] = useState(false);

  useEffect(() => {
    if (!expertProfile?.id) return;
    api.get<any>(`/experts/${expertProfile.id}/reviews`)
      .then((res) => setReviews(toArray(res)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [expertProfile?.id]);

  const PAGE_SIZE = 8;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(reviews.length / PAGE_SIZE);
  const paged = useMemo(() => reviews.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [reviews, page]);

  const handleFlag = async () => {
    if (!flagTarget) return;
    setFlagging(true);
    try {
      await api.post(`/reviews/${flagTarget}/flag`, { reason: flagReason });
      setReviews((prev) => prev.map((r) => r.id === flagTarget ? { ...r, is_flagged: true } : r));
      setFlagOpen(false);
      setFlagReason('');
    } catch {} finally { setFlagging(false); }
  };

  return (
    <PageTransition>
      <motion.div
        className="max-w-2xl mx-auto space-y-6"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <Star className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1
              className="text-2xl font-extrabold text-foreground"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              My Reviews
            </h1>
            <p className="text-muted text-sm">
              {expertProfile?.avg_rating ? `${expertProfile.avg_rating.toFixed(1)} avg rating · ${expertProfile.total_reviews} reviews` : 'No reviews yet'}
            </p>
          </div>
        </motion.div>

        {loading ? (
          <ListSkeleton rows={4} />
        ) : reviews.length === 0 ? (
          <motion.div variants={fadeUp}>
            <EmptyState icon={<Star className="w-8 h-8" />} title="No reviews" description="Reviews will appear here once users rate your service." />
          </motion.div>
        ) : (
          <>
            <motion.div variants={fadeUp} className="space-y-3">
              {paged.map((review) => (
                <div
                  key={review.id}
                  className={cn(
                    'bg-surface-elevated border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all',
                    review.is_flagged && 'border-warning/30'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={review.user_name || 'User'} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{review.user_name || 'Anonymous'}</p>
                        <p className="text-xs text-muted">{formatDate(review.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} />
                      {!review.is_flagged && (
                        <button
                          onClick={() => { setFlagTarget(review.id); setFlagOpen(true); }}
                          className="p-1 rounded-lg hover:bg-surface text-muted hover:text-warning transition-colors"
                          title="Flag for moderation"
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                      )}
                      {review.is_flagged && (
                        <span className="text-xs text-warning font-medium">Flagged</span>
                      )}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted mt-3 leading-relaxed">{review.comment}</p>
                  )}
                </div>
              ))}
            </motion.div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}

        <Modal open={flagOpen} onClose={() => setFlagOpen(false)} title="Flag Review" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-muted">This will flag the review for admin moderation.</p>
            <Textarea
              label="Reason"
              placeholder="Why should this review be reviewed by an admin?"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setFlagOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleFlag} isLoading={flagging} className="flex-1" leftIcon={<Flag className="w-4 h-4" />}>
                Flag Review
              </Button>
            </div>
          </div>
        </Modal>
      </motion.div>
    </PageTransition>
  );
}
