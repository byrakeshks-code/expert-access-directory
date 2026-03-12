'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search as SearchIcon, SlidersHorizontal, X, ArrowUpDown, LayoutGrid, List, Sparkles,
} from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExpertCard } from '@/components/search/expert-card';
import { FilterPanel } from '@/components/search/filter-panel';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ExpertCardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { InfiniteScroll } from '@/components/shared/infinite-scroll';
import { PageTransition } from '@/components/shared/page-transition';
import { StaggerContainer, StaggerItem } from '@/components/shared/page-transition';
import { SORT_OPTIONS } from '@/lib/constants';

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8"><ExpertCardSkeleton /></div>}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { filters, results, isLoading, hasMore, total, loadMore, updateFilter, resetFilters } = useSearch();
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const domain_id = searchParams.get('domain_id');
    const q = searchParams.get('q');
    if (domain_id) updateFilter({ domain_id });
    if (q) updateFilter({ query: q });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeFilterCount = [
    filters.domain_id,
    (filters.sub_problem_ids?.length || 0) > 0,
    filters.min_fee,
    filters.max_fee && filters.max_fee < 50000,
    filters.min_rating,
    filters.available_only,
  ].filter(Boolean).length;

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* ==================== HERO SEARCH HEADER ==================== */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-secondary/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Find Your Expert</span>
              </div>

              {/* Search bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                    <SearchIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    placeholder={filters.mode === 'name' ? 'Search by name...' : 'Describe your query...'}
                    value={filters.query}
                    onChange={(e) => updateFilter({ query: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 text-base text-foreground bg-surface-elevated border border-border rounded-2xl transition-all duration-200 placeholder:text-subtle hover:border-muted focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                  />
                </div>

                {/* Mode toggle */}
                <div className="hidden sm:flex gap-0.5 p-1 bg-surface-elevated border border-border rounded-xl flex-shrink-0">
                  <button
                    onClick={() => updateFilter({ mode: 'query' })}
                    className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                      filters.mode === 'query'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Query
                  </button>
                  <button
                    onClick={() => updateFilter({ mode: 'name' })}
                    className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                      filters.mode === 'name'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Name
                  </button>
                </div>

                {/* Filter button (mobile) */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className="md:hidden flex items-center gap-2 px-4 py-4 bg-surface-elevated border border-border rounded-2xl text-sm font-medium text-foreground hover:border-muted transition-all flex-shrink-0"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {activeFilterCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Results count + sort + filter pills */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted whitespace-nowrap">
                    {isLoading ? 'Searching...' : (
                      <><span className="text-foreground font-bold">{total}</span> expert{total !== 1 ? 's' : ''} found</>
                    )}
                  </p>

                  {/* Active filter pills */}
                  {activeFilterCount > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {filters.domain_id && (
                        <button onClick={() => updateFilter({ domain_id: undefined })} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-lg hover:bg-primary/20 transition-colors">
                          Domain <X className="w-3 h-3" />
                        </button>
                      )}
                      {filters.available_only && (
                        <button onClick={() => updateFilter({ available_only: undefined })} className="inline-flex items-center gap-1 px-2.5 py-1 bg-success/10 text-success text-xs font-medium rounded-lg hover:bg-success/20 transition-colors">
                          Available <X className="w-3 h-3" />
                        </button>
                      )}
                      {filters.min_rating && (
                        <button onClick={() => updateFilter({ min_rating: undefined })} className="inline-flex items-center gap-1 px-2.5 py-1 bg-warning/10 text-warning text-xs font-medium rounded-lg hover:bg-warning/20 transition-colors">
                          {filters.min_rating}+ stars <X className="w-3 h-3" />
                        </button>
                      )}
                      <button onClick={resetFilters} className="text-xs text-primary font-medium hover:underline ml-1">
                        Clear all
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted hidden sm:block" />
                  <select
                    value={filters.sort || 'relevance'}
                    onChange={(e) => updateFilter({ sort: e.target.value })}
                    className="px-3 py-2 text-xs font-medium text-foreground bg-surface-elevated border border-border rounded-lg cursor-pointer hover:border-muted transition-colors outline-none focus:border-primary"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ==================== MAIN CONTENT ==================== */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex gap-8 mt-6">
            {/* ==================== SIDEBAR FILTERS (Desktop) ==================== */}
            <aside className="hidden md:block w-80 lg:w-[340px] flex-shrink-0">
              <div className="sticky top-20">
                <div className="bg-surface-elevated border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Filters</h3>
                    </div>
                    {activeFilterCount > 0 && (
                      <button onClick={resetFilters} className="text-xs text-primary font-medium hover:underline">
                        Reset all
                      </button>
                    )}
                  </div>
                  <FilterPanel
                    filters={filters}
                    onUpdate={updateFilter}
                    onReset={resetFilters}
                    className="!space-y-5"
                    hideHeader
                  />
                </div>
              </div>
            </aside>

            {/* ==================== RESULTS GRID ==================== */}
            <main className="flex-1 min-w-0">
              {isLoading && results.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <ExpertCardSkeleton key={i} />
                  ))}
                </div>
              ) : results.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <EmptyState
                    icon={<SearchIcon className="w-8 h-8" />}
                    title="No experts found"
                    description="Try broadening your search or adjusting filters."
                    action={<Button variant="outline" onClick={resetFilters}>Reset Filters</Button>}
                  />
                </motion.div>
              ) : (
                <InfiniteScroll
                  onLoadMore={loadMore}
                  hasMore={hasMore}
                  isLoading={isLoading}
                  loader={
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <ExpertCardSkeleton key={i} />
                      ))}
                    </div>
                  }
                >
                  <StaggerContainer
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                    animationKey={results.map((r) => r.id).join(',') || 'empty'}
                  >
                    {results.map((expert, index) => (
                      <StaggerItem key={`${expert.id}-${index}`}>
                        <ExpertCard expert={expert} />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </InfiniteScroll>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Mobile filter sheet */}
      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filters" height="full">
        <FilterPanel filters={filters} onUpdate={updateFilter} onReset={resetFilters} />
        <div className="mt-6 pb-4">
          <Button className="w-full" onClick={() => setFilterOpen(false)}>
            Show {total} Result{total !== 1 ? 's' : ''}
          </Button>
        </div>
      </BottomSheet>
    </PageTransition>
  );
}
