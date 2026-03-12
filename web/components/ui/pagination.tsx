'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i)
    .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
    .reduce<(number | 'ellipsis')[]>((acc, i, idx, arr) => {
      if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
      acc.push(i);
      return acc;
    }, []);

  return (
    <div className={cn('flex items-center justify-center gap-1 pt-6', className)}>
      <button
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="p-2 rounded-xl text-muted hover:bg-surface-elevated hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map((item, idx) =>
        item === 'ellipsis' ? (
          <span key={`e-${idx}`} className="px-1 text-subtle text-sm">...</span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item as number)}
            className={cn(
              'w-9 h-9 rounded-xl text-sm font-medium transition-all',
              page === item
                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                : 'text-muted hover:bg-surface-elevated hover:text-foreground',
            )}
          >
            {(item as number) + 1}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        className="p-2 rounded-xl text-muted hover:bg-surface-elevated hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
