'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { AuthGuard } from './auth-guard';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <AuthGuard>
      {isLoginPage ? (
        <>{children}</>
      ) : (
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 p-8">{children}</main>
        </div>
      )}
    </AuthGuard>
  );
}
