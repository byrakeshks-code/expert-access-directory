'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export function useNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get<{ count: number }>('/notifications/unread-count');
      setUnreadCount(data.count ?? 0);
    } catch {
      // Silently fail on polling errors
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();
    intervalRef.current = setInterval(fetchUnreadCount, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, fetchUnreadCount]);

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/notifications/read-all');
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }, []);

  return { unreadCount, fetchUnreadCount, markAllRead };
}
