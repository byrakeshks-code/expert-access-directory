'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showValue?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'w-3.5 h-3.5',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function StarRating({
  rating,
  maxStars = 5,
  size = 'sm',
  interactive = false,
  onChange,
  showValue = false,
  className,
}: StarRatingProps) {
  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      {Array.from({ length: maxStars }).map((_, i) => {
        const filled = i < Math.round(rating);
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(i + 1)}
            className={cn(
              'transition-colors',
              interactive && 'cursor-pointer hover:scale-110',
              !interactive && 'cursor-default',
            )}
          >
            <Star
              className={cn(
                sizeMap[size],
                filled ? 'fill-warning text-warning' : 'fill-none text-border',
              )}
            />
          </button>
        );
      })}
      {showValue && (
        <span className="ml-1.5 text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
