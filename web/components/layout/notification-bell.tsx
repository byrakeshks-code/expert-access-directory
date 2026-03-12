'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const { profile } = useAuth();

  const href = profile?.role === 'expert'
    ? '/expert/notifications'
    : profile?.role === 'admin'
      ? '/admin/dashboard'
      : '/notifications';

  return (
    <Link
      href={href}
      className="relative p-2 rounded-xl hover:bg-surface transition-colors"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="w-5 h-5 text-muted" />
      {unreadCount > 0 && (
        <span
          className={cn(
            'absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center',
            'bg-error text-white text-[10px] font-bold rounded-full px-1',
          )}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
