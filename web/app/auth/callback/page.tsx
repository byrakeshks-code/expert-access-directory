'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getRoleDashboard } from '@/lib/auth';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Auth callback page. With Firebase Auth, Google sign-in uses a popup
 * so this page mainly acts as a fallback redirect target.
 */
export default function AuthCallbackPage() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (user && profile) {
      router.replace(getRoleDashboard(profile.role));
    } else if (!user) {
      router.replace('/login');
    }
  }, [isLoading, user, profile, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-4 w-full max-w-sm px-4 text-center">
        <Skeleton className="h-8 w-48 mx-auto" />
        <p className="text-sm text-muted">Signing you in...</p>
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
    </div>
  );
}
