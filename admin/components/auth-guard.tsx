'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    if (pathname === '/login') {
      setStatus('authenticated');
      return;
    }

    const token = localStorage.getItem('admin_token');
    if (!token) {
      setStatus('unauthenticated');
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    api
      .get<{ id: string; role: string }>('/users/me')
      .then((user) => {
        const role = (user as any)?.role ?? (user as any)?.data?.role;
        if (role !== 'admin') {
          localStorage.removeItem('admin_token');
          setStatus('unauthenticated');
          router.replace('/login');
          return;
        }
        setStatus('authenticated');
      })
      .catch(() => {
        localStorage.removeItem('admin_token');
        setStatus('unauthenticated');
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      });
  }, [pathname, router]);

  if (status === 'loading' && pathname !== '/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}
