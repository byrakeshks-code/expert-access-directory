'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';
import { CreditCard } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = () => {
    setLoading(true);
    api
      .get<any>('/admin/payments')
      .then((res) => setPayments(res.data?.data || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (row: any) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{row.users?.full_name || '—'}</p>
          <p className="text-xs text-gray-400">{row.users?.email || ''}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: any) => {
        const symbol = row.currency === 'INR' ? '₹' : row.currency === 'USD' ? '$' : row.currency;
        return `${symbol}${((row.amount_minor || 0) / 100).toLocaleString()}`;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => <StatusBadge status={row.status || 'pending'} />,
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (row: any) => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        description="View and track payment transactions"
      />
      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        emptyContent={
          <EmptyState
            icon={CreditCard}
            title="No payments recorded"
            description="Payment records will appear here when users complete transactions."
          />
        }
      />
    </div>
  );
}
