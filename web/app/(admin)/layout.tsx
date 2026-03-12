'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getSavedRole, getRoleDashboard } from '@/lib/auth';
import { TopBar } from '@/components/layout/top-bar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { Home, Users, FileText, CreditCard, Settings, Shield, Star, FolderOpen, Image, BookOpen, ClipboardList } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const sidebarItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/experts', label: 'Experts', icon: Shield },
  { href: '/admin/requests', label: 'Requests', icon: FileText },
  { href: '/admin/domains', label: 'Domains', icon: FolderOpen },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/media', label: 'Media', icon: Image },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: BookOpen },
  { href: '/admin/config', label: 'Config', icon: Settings },
];

const bottomNavItems = [
  { href: '/admin/dashboard', label: 'Home', icon: Home },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/experts', label: 'Experts', icon: Shield },
  { href: '/admin/requests', label: 'Requests', icon: FileText },
  { href: '/admin/config', label: 'Config', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      const savedRole = getSavedRole();
      if (savedRole === 'admin') return;
      router.replace('/login?redirect=/admin/dashboard');
      return;
    }

    if (!isAdmin) {
      router.replace(getRoleDashboard(profile?.role));
    }
  }, [isLoading, user, profile, isAdmin, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-sm px-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    const savedRole = getSavedRole();
    if (savedRole === 'admin') {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="space-y-4 w-full max-w-sm px-4">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </div>
      );
    }
    return null;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <div className="flex flex-1">
        <Sidebar items={sidebarItems} title="Admin Panel" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
      <BottomNav items={bottomNavItems} />
    </div>
  );
}
