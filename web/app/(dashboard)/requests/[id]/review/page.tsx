'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { StarRating } from '@/components/ui/star-rating';
import { PageTransition } from '@/components/shared/page-transition';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export default function LeaveReviewPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    if (comment.length < 20) {
      setError('Review must be at least 20 characters');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await api.post('/reviews', {
        request_id: requestId,
        rating,
        comment,
      });
      router.push(`/requests/${requestId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <motion.div
        className="max-w-lg mx-auto space-y-6"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted hover:text-foreground bg-surface-elevated border border-border rounded-xl transition-all mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1
                className="text-2xl font-extrabold text-foreground"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Leave a Review
              </h1>
              <p className="text-muted text-sm">Help others by sharing your experience</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="bg-surface-elevated border border-border rounded-2xl p-6"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="px-4 py-3 bg-error-light border border-error/20 rounded-xl text-sm text-error">
                {error}
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-foreground mb-3">Your Rating</p>
              <StarRating rating={rating} interactive onChange={setRating} size="lg" />
            </div>

            <Textarea
              label="Your Review"
              placeholder="Share your experience with this expert. What went well? What could be improved?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              charCount={comment.length}
              maxChars={2000}
              rows={5}
            />

            <Button type="submit" isLoading={isSubmitting} className="w-full" leftIcon={<Send className="w-4 h-4" />}>
              Submit Review
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}
