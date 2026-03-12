'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  items: SidebarItem[];
  title?: string;
}

export function Sidebar({ items, title }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-surface-elevated/50 min-h-[calc(100vh-4rem)]">
      {title && (
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xs font-bold text-muted uppercase tracking-widest">{title}</h2>
        </div>
      )}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-gradient-to-r from-primary/10 to-secondary/5 text-primary border border-primary/10'
                  : 'text-muted hover:bg-surface hover:text-foreground',
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0', active && 'stroke-[2.5]')} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
