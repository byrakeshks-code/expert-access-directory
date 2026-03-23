'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, getRoleDashboard } from '@/lib/auth';
import { TopBar } from '@/components/layout/top-bar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { Home, FileText, Bell, CreditCard, Settings, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function isDefaultOrEmptyName(name: string | undefined | null): boolean {
  if (!name || !name.trim()) return true;
  if (name.trim().toLowerCase() === 'user') return true;
  return false;
}

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
  const { user, profile, isLoading, isAdmin, isExpert, updateUserProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');

  const needsOnboarding = profile && isDefaultOrEmptyName(profile.full_name);

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = onboardingName.trim();
    if (!name) {
      setOnboardingError('Please enter your name');
      return;
    }
    setOnboardingError('');
    setOnboardingSaving(true);
    try {
      await updateUserProfile({ full_name: name });
      await refreshProfile();
    } catch (err: any) {
      setOnboardingError(err.message || 'Failed to save');
    } finally {
      setOnboardingSaving(false);
    }
  };

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

  if (needsOnboarding) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Welcome!
              </h1>
              <p className="text-sm text-muted">What should we call you?</p>
            </div>
          </div>
          <form onSubmit={handleOnboardingSubmit} className="space-y-4">
            {onboardingError && (
              <div className="px-4 py-3 bg-error-light border border-error/20 rounded-xl text-sm text-error">
                {onboardingError}
              </div>
            )}
            <Input
              label="Your name"
              type="text"
              placeholder="e.g. John Doe"
              value={onboardingName}
              onChange={(e) => setOnboardingName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              autoFocus
            />
            <Button type="submit" isLoading={onboardingSaving} className="w-full">
              Continue
            </Button>
          </form>
        </div>
      </div>
    );
  }

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
