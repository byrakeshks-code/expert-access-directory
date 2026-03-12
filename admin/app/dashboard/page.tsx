'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { api } from '@/lib/api';
import { Users, UserCheck, FileText, CreditCard, RotateCcw } from 'lucide-react';

interface Metrics {
  total_experts: number;
  total_requests: number;
  total_revenue_minor: number;
  total_refunds: number;
  pending_verifications: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: Metrics }>('/admin/dashboard/metrics')
      .then((res) => setMetrics(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (minor: number) => {
    return `₹${(minor / 100).toLocaleString('en-IN')}`;
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Platform overview and key metrics"
      />

      {loading ? (
        <div className="text-gray-400">Loading metrics...</div>
      ) : metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <StatCard
            label="Total Experts"
            value={metrics.total_experts}
            icon={<UserCheck className="w-5 h-5" />}
          />
          <StatCard
            label="Total Requests"
            value={metrics.total_requests}
            icon={<FileText className="w-5 h-5" />}
          />
          <StatCard
            label="Total Revenue"
            value={formatCurrency(metrics.total_revenue_minor)}
            icon={<CreditCard className="w-5 h-5" />}
          />
          <StatCard
            label="Total Refunds"
            value={metrics.total_refunds}
            icon={<RotateCcw className="w-5 h-5" />}
          />
          <StatCard
            label="Pending Verifications"
            value={metrics.pending_verifications}
            icon={<Users className="w-5 h-5" />}
          />
        </div>
      ) : (
        <div className="text-red-500">Failed to load metrics</div>
      )}
    </div>
  );
}
