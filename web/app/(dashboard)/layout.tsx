'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, getRoleDashboard } from '@/lib/auth';
import { TopBar } from '@/components/layout/top-bar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { Home, FileText, Bell, CreditCard, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const sidebarItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/requests', label: 'My Requests', icon: FileText },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/refunds', label: 'Refunds', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const bottomNavItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/requests', label: 'Requests', icon: FileText },
  { href: '/notifications', label: 'Alerts', icon: Bell },
  { href: '/refunds', label: 'Refunds', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading, isAdmin, isExpert } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login?redirect=' + encodeURIComponent(pathname || '/dashboard'));
      return;
    }

    if (isAdmin || isExpert) {
      router.replace(getRoleDashboard(profile?.role));
    }
  }, [isLoading, user, profile, isAdmin, isExpert, router, pathname]);

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

  if (!user || isAdmin || isExpert) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <div className="flex flex-1">
        <Sidebar items={sidebarItems} title="Dashboard" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
      <BottomNav items={bottomNavItems} />
    </div>
  );
}
