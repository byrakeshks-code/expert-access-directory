'use client';

import { useEffect, useState } from 'react';
import { ShieldBan, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { formatDate, cn, toArray } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { PageTransition } from '@/components/shared/page-transition';

interface BlockedUser {
  id: string;
  blocked_user_id: string;
  blocked_user_name?: string;
  blocked_user_email?: string;
  created_at: string;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export default function BlockedUsersPage() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    api.get<any>('/blocked-users')
      .then((res) => setBlockedUsers(toArray(res)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUnblock = async (id: string) => {
    setUnblocking(id);
    try {
      await api.delete(`/blocked-users/${id}`);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {} finally { setUnblocking(null); }
  };

  return (
    <PageTransition>
      <motion.div
        className="max-w-2xl mx-auto space-y-6"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldBan className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1
              className="text-2xl font-extrabold text-foreground"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Blocked Users
            </h1>
            <p className="text-muted text-sm">Manage users you&apos;ve blocked from sending requests</p>
          </div>
        </motion.div>

        {loading ? (
          <ListSkeleton rows={3} />
        ) : blockedUsers.length === 0 ? (
          <motion.div variants={fadeUp}>
            <EmptyState
              icon={<ShieldBan className="w-8 h-8" />}
              title="No blocked users"
              description="Users you block will appear here."
            />
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="space-y-3">
            {blockedUsers.map((user) => (
              <div
                key={user.id}
                className="bg-surface-elevated border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-md hover:border-primary/20 transition-all"
              >
                <Avatar name={user.blocked_user_name || user.blocked_user_email || 'User'} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {user.blocked_user_name || user.blocked_user_email || 'Unknown User'}
                  </p>
                  <p className="text-xs text-muted">Blocked on {formatDate(user.created_at)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnblock(user.id)}
                  isLoading={unblocking === user.id}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  className="text-error"
                >
                  Unblock
                </Button>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </PageTransition>
  );
}
