'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, getRoleDashboard } from '@/lib/auth';
import { NotificationBell } from './notification-bell';
import { ThemeToggle } from './theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import { LogOut, Settings, ChevronDown, Shield } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function TopBar() {
  const { profile, logout, isAdmin } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href={getRoleDashboard(profile?.role)} className="flex items-center gap-2 flex-shrink-0">
            <img src="/logo.png" alt="Loop Ex" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-bold text-foreground hidden sm:block">Loop Ex</span>
            {isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium bg-warning-light text-warning px-2 py-0.5 rounded-full">
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />

            {/* Profile dropdown */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface transition-colors"
              >
                <Avatar name={profile?.full_name || 'User'} src={profile?.avatar_url} size="sm" />
                <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                  {profile?.full_name || 'User'}
                </span>
                <ChevronDown className="w-4 h-4 text-muted hidden sm:block" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface-elevated border border-border rounded-xl shadow-lg py-1 z-50">
                  {profile?.role && (
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-xs text-muted capitalize">{profile.role}</p>
                      <p className="text-sm text-foreground truncate">{profile.email}</p>
                    </div>
                  )}
                  {!isAdmin && (
                    <Link
                      href={profile?.role === 'expert' ? '/expert/settings' : '/settings'}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-surface transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4 text-muted" />
                      Settings
                    </Link>
                  )}
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      await logout();
                      router.replace('/login');
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-surface transition-colors w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
