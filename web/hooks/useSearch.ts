'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface SearchFilters {
  query: string;
  mode: 'query' | 'name';
  domain_id?: string;
  sub_problem_ids?: string[];
  country?: string;
  language?: string;
  tag?: string;
  min_fee?: number;
  max_fee?: number;
  min_rating?: number;
  available_only?: boolean;
  sort?: string;
}

export interface SearchResult {
  id: string;
  expert_id?: string;
  user_id: string;
  headline: string;
  bio: string;
  access_fee_minor: number;
  access_fee_currency: string;
  is_available: boolean;
  verification_status: string;
  current_tier: string;
  avg_rating: number;
  total_reviews: number;
  years_experience: number;
  city: string;
  country: string;
  avatar_url?: string;
  full_name: string;
  primary_domain_name?: string;
  primary_domain?: string;
  specializations?: string[];
  sub_problems?: string[];
  tags?: string[];
  rating_avg?: number;
  review_count?: number;
  years_of_experience?: number;
}

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  mode: 'query',
};

export function useSearch() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Request counter to ignore stale responses
  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const buildQueryString = useCallback((f: SearchFilters, p: number) => {
    const params = new URLSearchParams();
    if (f.query) params.set('q', f.query);
    if (f.mode === 'name') params.set('mode', 'name');
    if (f.domain_id) params.set('domain', f.domain_id);
    if (f.country) params.set('country', f.country);
    if (f.language) params.set('language', f.language);
    if (f.tag) params.set('tag', f.tag);
    if (f.sort) params.set('sort', f.sort);
    params.set('page', String(p));
    params.set('limit', '12');
    return params.toString();
  }, []);

  const fetchResults = useCallback(
    async (f: SearchFilters, pageNum: number, append = false) => {
      // Increment request counter; capture this request's ID
      const currentRequestId = ++requestIdRef.current;

      setIsLoading(true);
      try {
        const qs = buildQueryString(f, pageNum);
        const raw = await api.get<any>(`/search/experts?${qs}`);

        // If a newer request was fired while this one was in flight, discard
        if (currentRequestId !== requestIdRef.current) return;

        // API client auto-unwraps { success, data }, so raw is { data: [...], meta } or [...]
        let rawHits: any[] = [];
        let meta: any = {};

        if (Array.isArray(raw)) {
          rawHits = raw;
        } else if (raw && typeof raw === 'object') {
          rawHits = Array.isArray(raw.data) ? raw.data : raw.hits || [];
          meta = raw.meta || {};
        }

        // Normalize field names from backend
        const hits: SearchResult[] = rawHits.map((h: any) => ({
          ...h,
          id: h.id || h.expert_id,
          avg_rating: h.avg_rating ?? h.rating_avg ?? 0,
          total_reviews: h.total_reviews ?? h.review_count ?? 0,
          years_experience: h.years_experience ?? h.years_of_experience ?? 0,
          primary_domain_name: h.primary_domain_name || h.primary_domain || '',
          specializations: h.specializations || h.sub_problems || [],
          tags: h.tags || [],
        }));

        // Client-side post-filtering for params the backend doesn't support
        let filtered = hits;
        if (f.min_fee !== undefined && f.min_fee > 0) {
          filtered = filtered.filter((h) => (h.access_fee_minor ?? 0) >= f.min_fee!);
        }
        if (f.max_fee !== undefined && f.max_fee < 50000) {
          filtered = filtered.filter((h) => (h.access_fee_minor ?? 0) <= f.max_fee!);
        }
        if (f.min_rating !== undefined && f.min_rating > 0) {
          filtered = filtered.filter((h) => (h.avg_rating ?? 0) >= f.min_rating!);
        }
        if (f.available_only) {
          filtered = filtered.filter((h) => h.is_available);
        }

        const totalHits = meta.total || filtered.length;

        // Deduplicate by id so React keys stay unique (API can return same expert across pages)
        const dedupeById = (items: SearchResult[]) => {
          const seen = new Set<string>();
          return items.filter((r) => {
            const id = r.id;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        };
        const uniqueFiltered = dedupeById(filtered);

        // Double-check we're still the latest request before setting state
        if (currentRequestId !== requestIdRef.current) return;

        if (append) {
          setResults((prev) => dedupeById([...prev, ...uniqueFiltered]));
        } else {
          setResults(uniqueFiltered);
        }
        setTotal(totalHits);
        setHasMore(rawHits.length === 12);
      } catch (err: any) {
        if (currentRequestId !== requestIdRef.current) return;
        console.error('Search failed:', err);
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [buildQueryString],
  );

  // Use a ref to always have the latest fetchResults without recreating the debounce
  const fetchResultsRef = useRef(fetchResults);
  fetchResultsRef.current = fetchResults;

  // Debounced search triggered by filter changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setPage(1);
      fetchResultsRef.current(filters, 1, false);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filters]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchResults(filters, nextPage, true);
    }
  }, [isLoading, hasMore, page, filters, fetchResults]);

  const updateFilter = useCallback((update: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...update }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    filters,
    results,
    isLoading,
    hasMore,
    total,
    loadMore,
    updateFilter,
    resetFilters,
    setFilters,
  };
}
