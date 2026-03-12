'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { StarRating } from '@/components/ui/star-rating';
import { RangeSlider } from '@/components/ui/range-slider';
import { api } from '@/lib/api';
import { formatFee, cn, toArray } from '@/lib/utils';
import type { SearchFilters } from '@/hooks/useSearch';

interface Domain {
  id: string;
  name: string;
}

interface SubProblem {
  id: string;
  label: string;
  slug: string;
}

interface FilterPanelProps {
  filters: SearchFilters;
  onUpdate: (update: Partial<SearchFilters>) => void;
  onReset: () => void;
  className?: string;
  hideHeader?: boolean;
}

export function FilterPanel({ filters, onUpdate, onReset, className, hideHeader }: FilterPanelProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [subProblems, setSubProblems] = useState<SubProblem[]>([]);
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);

  useEffect(() => {
    api.get<any>('/domains').then((res) => {
      setDomains(toArray(res));
    }).catch(() => {});
    api.get<any>('/search/facets').then((res) => {
      const facetTags = res?.tags || [];
      setTags(Array.isArray(facetTags) ? facetTags : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (filters.domain_id) {
      api.get<any>(`/domains/${filters.domain_id}/sub-problems`).then((res) => {
        setSubProblems(toArray(res));
      }).catch(() => setSubProblems([]));
    } else {
      setSubProblems([]);
    }
  }, [filters.domain_id]);

  return (
    <div className={cn('space-y-6', className)}>
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Filters</h3>
          <button onClick={onReset} className="text-xs text-primary hover:underline">
            Reset all
          </button>
        </div>
      )}

      {/* Domain */}
      <div>
        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Domain</p>
        <Select
          options={domains.map((d) => ({ value: d.id, label: d.name }))}
          placeholder="All domains"
          value={filters.domain_id || ''}
          onChange={(e) => onUpdate({ domain_id: e.target.value || undefined, sub_problem_ids: [] })}
        />
      </div>

      {/* Guidance areas */}
      {subProblems.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Specialization</p>
          <div className="flex flex-wrap gap-1.5">
            {subProblems.map((sp) => {
              const selected = filters.sub_problem_ids?.includes(sp.id);
              return (
                <button
                  key={sp.id}
                  onClick={() => {
                    const current = filters.sub_problem_ids || [];
                    const next = selected
                      ? current.filter((id) => id !== sp.id)
                      : [...current, sp.id];
                    onUpdate({ sub_problem_ids: next });
                  }}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
                    selected
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-background text-muted border-border hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {sp.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {tags.map((t) => {
              const selected = (filters as any).tag === t.tag;
              return (
                <button
                  key={t.tag}
                  onClick={() => onUpdate({ tag: selected ? undefined : t.tag } as any)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
                    selected
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-background text-muted border-border hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {t.tag} <span className="opacity-60">({t.count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="h-px bg-border" />

      {/* Fee range */}
      <div>
        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Access Fee Range</p>
        <RangeSlider
          min={0}
          max={50000}
          step={100}
          value={[filters.min_fee || 0, filters.max_fee || 50000]}
          onChange={([min, max]) => onUpdate({ min_fee: min, max_fee: max })}
          formatLabel={(v) => formatFee(v, 'INR')}
        />
      </div>

      <div className="h-px bg-border" />

      {/* Minimum rating */}
      <div>
        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Minimum Rating</p>
        <StarRating
          rating={filters.min_rating || 0}
          interactive
          onChange={(r) => onUpdate({ min_rating: r })}
          size="md"
        />
      </div>

      <div className="h-px bg-border" />

      {/* Availability */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className={cn(
          'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
          filters.available_only
            ? 'bg-primary border-primary'
            : 'border-border group-hover:border-primary/40',
        )}>
          {filters.available_only && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <input
          type="checkbox"
          checked={filters.available_only || false}
          onChange={(e) => onUpdate({ available_only: e.target.checked || undefined })}
          className="sr-only"
        />
        <span className="text-sm font-medium text-foreground">Available only</span>
      </label>
    </div>
  );
}
