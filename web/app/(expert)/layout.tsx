'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, getSavedRole, getRoleDashboard } from '@/lib/auth';
import { TopBar } from '@/components/layout/top-bar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { Home, FileText, User, CreditCard, Star, ShieldBan, BadgeCheck, Bell, Settings, AlertTriangle, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

const OPEN_PATHS = ['/expert/apply'];

const sidebarItems = [
  { href: '/expert/dashboard', label: 'Dashboard', icon: Home },
  { href: '/expert/requests', label: 'Requests', icon: FileText },
  { href: '/expert/notifications', label: 'Notifications', icon: Bell },
  { href: '/expert/profile', label: 'Edit Profile', icon: User },
  // { href: '/expert/subscription', label: 'Subscription', icon: CreditCard }, // Hidden: subscription module disabled for now
  { href: '/expert/reviews', label: 'Reviews', icon: Star },
  { href: '/expert/verification', label: 'Verification', icon: BadgeCheck },
  { href: '/expert/blocked', label: 'Blocked Users', icon: ShieldBan },
  { href: '/expert/settings', label: 'Settings', icon: Settings },
];

const bottomNavItems = [
  { href: '/expert/dashboard', label: 'Home', icon: Home },
  { href: '/expert/requests', label: 'Requests', icon: FileText },
  { href: '/expert/notifications', label: 'Alerts', icon: Bell },
  { href: '/expert/profile', label: 'Profile', icon: User },
  { href: '/expert/settings', label: 'Settings', icon: Settings },
];

export default function ExpertLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading, isExpert, expertProfile, isVerified } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isOpenPath = OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      if (isOpenPath) {
        router.replace('/login?redirect=' + encodeURIComponent(pathname));
        return;
      }
      const savedRole = getSavedRole();
      if (savedRole === 'expert') return;
      router.replace('/login?redirect=/expert/dashboard');
      return;
    }

    if (!isExpert && !isOpenPath) {
      router.replace(getRoleDashboard(profile?.role));
    }
  }, [isLoading, user, profile, isExpert, isOpenPath, router, pathname]);

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
    if (isOpenPath) return null;
    const savedRole = getSavedRole();
    if (savedRole === 'expert') {
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

  if (isOpenPath) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    );
  }

  if (!isExpert) return null;

  const showPendingBanner = isExpert && expertProfile && !isVerified;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      {showPendingBanner && (
        <div className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium ${
          expertProfile.verification_status === 'rejected'
            ? 'bg-error-light text-error border-b border-error/20'
            : 'bg-warning-light text-warning border-b border-warning/20'
        }`}>
          {expertProfile.verification_status === 'rejected' ? (
            <>
              <XCircle className="w-3.5 h-3.5" />
              <span>Your expert application was not approved.</span>
              <Link href="/expert/profile" className="underline font-semibold">Review profile</Link>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Your account is pending admin approval.</span>
              <Link href="/expert/verification" className="underline font-semibold">Upload documents</Link>
            </>
          )}
        </div>
      )}
      <div className="flex flex-1">
        <Sidebar items={sidebarItems} title="Expert Panel" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
      <BottomNav items={bottomNavItems} />
    </div>
  );
}
