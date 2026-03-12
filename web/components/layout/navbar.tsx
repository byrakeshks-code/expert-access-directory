'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Search, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const { user, profile, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">EA</span>
            </div>
            <span className="font-bold text-foreground hidden sm:block">Expert Access</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/search" className="text-sm text-muted hover:text-foreground transition-colors flex items-center gap-1.5">
              <Search className="w-4 h-4" />
              Find Experts
            </Link>
            {!isLoading && !user && (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Log in</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
            {!isLoading && user && (
              <Link href={profile?.role === 'expert' ? '/expert/dashboard' : '/dashboard'}>
                <Button variant="outline" size="sm">Dashboard</Button>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-surface transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              <Link
                href="/search"
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted hover:bg-surface transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <Search className="w-4 h-4" />
                Find Experts
              </Link>
              {!isLoading && !user && (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full">Log in</Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </>
              )}
              {!isLoading && user && (
                <Link href={profile?.role === 'expert' ? '/expert/dashboard' : '/dashboard'} onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full">Dashboard</Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
