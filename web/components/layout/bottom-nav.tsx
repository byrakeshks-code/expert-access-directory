'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface BottomNavProps {
  items: NavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 min-w-[56px] py-1 px-2 rounded-xl transition-colors',
                active ? 'text-primary' : 'text-muted hover:text-foreground',
              )}
            >
              <Icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
