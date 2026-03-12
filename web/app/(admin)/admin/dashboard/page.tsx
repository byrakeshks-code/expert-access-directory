'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition } from '@/components/shared/page-transition';
import {
  Users, UserCheck, FileText, CreditCard, RotateCcw, Shield,
  FolderOpen, Star, Settings, Image, BookOpen, ArrowRight, ExternalLink,
  LayoutDashboard,
} from 'lucide-react';

interface Metrics {
  total_experts: number;
  total_requests: number;
  total_revenue_minor: number;
  total_refunds: number;
  pending_verifications: number;
}

const quickLinks = [
  { href: '/admin/users', label: 'Manage Users', icon: Users, desc: 'View, edit, create users' },
  { href: '/admin/experts', label: 'Manage Experts', icon: Shield, desc: 'Verify, edit experts' },
  { href: '/admin/requests', label: 'Manage Requests', icon: FileText, desc: 'View requests & chat' },
  { href: '/admin/domains', label: 'Domains', icon: FolderOpen, desc: 'Domains & guidance areas' },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard, desc: 'Payment records' },
  { href: '/admin/reviews', label: 'Reviews', icon: Star, desc: 'Moderate reviews' },
  { href: '/admin/media', label: 'Media Manager', icon: Image, desc: 'Upload & manage files' },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: BookOpen, desc: 'Activity history' },
  { href: '/admin/config', label: 'Platform Config', icon: Settings, desc: 'Settings & toggles' },
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: Metrics }>('/admin/dashboard/metrics')
      .then((res) => {
        const d = (res as any)?.data ?? res;
        setMetrics(d);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (amount: number) =>
    `₹${(amount || 0).toLocaleString('en-IN')}`;

  return (
    <PageTransition>
      <motion.div
        className="space-y-8"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Gradient header banner */}
        <motion.div
          variants={fadeUp}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary p-6 shadow-lg shadow-primary/20"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9zdmc+')] opacity-50" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1
                className="text-2xl font-extrabold text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Admin Dashboard
              </h1>
              <p className="text-white/70 text-sm">Platform overview and management</p>
            </div>
          </div>
        </motion.div>

        {/* Metrics */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : metrics ? (
          <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard icon={UserCheck} label="Total Experts" value={metrics.total_experts} />
            <MetricCard icon={FileText} label="Total Requests" value={metrics.total_requests} />
            <MetricCard icon={CreditCard} label="Total Revenue" value={formatCurrency(metrics.total_revenue_minor)} />
            <MetricCard icon={RotateCcw} label="Total Refunds" value={metrics.total_refunds} />
            <MetricCard icon={Shield} label="Pending Verifications" value={metrics.pending_verifications} accent />
          </motion.div>
        ) : (
          <div className="bg-surface-elevated border border-border rounded-2xl p-4 text-error text-sm">Failed to load metrics</div>
        )}

        {/* Quick Links */}
        <motion.div variants={fadeUp}>
          <h2 className="text-lg font-semibold text-foreground mb-4">Management</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}>
                  <div className="bg-surface-elevated border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all group cursor-pointer h-full">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{link.label}</span>
                          <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-muted mt-0.5">{link.desc}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* Link to full admin panel */}
        <motion.div
          variants={fadeUp}
          className="bg-surface-elevated border border-dashed border-border rounded-2xl p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Full Admin Panel</p>
              <p className="text-xs text-muted">Access the dedicated admin panel with all management features</p>
            </div>
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
            >
              Open <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="bg-surface-elevated border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-gradient-to-br from-warning/20 to-orange-500/10' : 'bg-gradient-to-br from-primary/10 to-secondary/10'}`}>
          <Icon className={`w-5 h-5 ${accent ? 'text-warning' : 'text-primary'}`} />
        </div>
        <div>
          <p className="text-xs text-muted">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
