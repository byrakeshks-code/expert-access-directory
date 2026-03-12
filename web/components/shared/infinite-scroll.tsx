'use client';

import { useEffect, useRef } from 'react';

interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  children: React.ReactNode;
  loader?: React.ReactNode;
}

export function InfiniteScroll({ onLoadMore, hasMore, isLoading, children, loader }: InfiniteScrollProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' },
    );

    const current = sentinelRef.current;
    if (current) observer.observe(current);

    return () => {
      if (current) observer.unobserve(current);
    };
  }, [onLoadMore, hasMore, isLoading]);

  return (
    <div>
      {children}
      <div ref={sentinelRef} />
      {isLoading && loader}
    </div>
  );
}
