'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgo, cn, toArray } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { PageTransition } from '@/components/shared/page-transition';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export default function ExpertNotificationsPage() {
  const { markAllRead, fetchUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/notifications')
      .then((res) => setNotifications(toArray(res)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      fetchUnreadCount();
    } catch {}
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(notifications.length / PAGE_SIZE);
  const paged = useMemo(() => notifications.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [notifications, page]);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <PageTransition>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Notifications
                </h1>
                {unreadCount > 0 && <p className="text-sm text-muted">{unreadCount} unread</p>}
              </div>
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead} leftIcon={<CheckCheck className="w-4 h-4" />}>
                Mark all read
              </Button>
            )}
          </div>
        </motion.div>

        {loading ? (
          <ListSkeleton rows={6} />
        ) : notifications.length === 0 ? (
          <EmptyState icon={<Bell className="w-8 h-8" />} title="No notifications" description="You're all caught up!" />
        ) : (
          <>
            <div className="space-y-2">
              {paged.map((notif, i) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div
                    className={cn(
                      'bg-surface-elevated border rounded-xl p-4 transition-all cursor-pointer hover:shadow-md',
                      !notif.is_read ? 'border-primary/30 bg-primary-light/20' : 'border-border',
                    )}
                    onClick={() => {
                      if (!notif.is_read) handleMarkRead(notif.id);
                      if (notif.action_url) {
                        const url = notif.action_url.startsWith('/expert/')
                          ? notif.action_url
                          : `/expert${notif.action_url}`;
                        window.location.href = url;
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0',
                        notif.is_read ? 'bg-border' : 'bg-primary',
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm', notif.is_read ? 'text-muted' : 'text-foreground font-semibold')}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted mt-0.5 line-clamp-2">{notif.body}</p>
                        <p className="text-[10px] text-subtle mt-1">{timeAgo(notif.created_at)}</p>
                      </div>
                      {!notif.is_read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id); }}
                          className="p-1.5 rounded-lg hover:bg-surface transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4 text-muted" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </PageTransition>
  );
}
