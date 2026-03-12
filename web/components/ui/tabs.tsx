'use client';

import { cn } from '@/lib/utils';

interface Tab {
  value: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 p-1 bg-surface rounded-xl overflow-x-auto', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap',
            'min-h-[36px]',
            value === tab.value
              ? 'bg-surface-elevated text-foreground shadow-sm'
              : 'text-muted hover:text-foreground',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full',
                value === tab.value ? 'bg-primary text-white' : 'bg-border text-muted',
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
