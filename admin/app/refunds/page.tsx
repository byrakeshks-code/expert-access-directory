'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { EditModal, FieldDef } from '@/components/edit-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { api } from '@/lib/api';
import { Pencil, RotateCcw } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

const refundEditFields: FieldDef[] = [
  { key: 'id', label: 'Refund ID', type: 'readonly' },
  { key: 'amount_minor', label: 'Amount', type: 'number', required: true, help: 'Refund amount in selected currency' },
  { key: 'currency', label: 'Currency', type: 'select', options: [
    { value: 'INR', label: 'INR' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' },
  ]},
  { key: 'reason', label: 'Reason', type: 'select', options: [
    { value: 'auto_expired', label: 'Auto Expired' },
    { value: 'expert_rejected', label: 'Expert Rejected' },
    { value: 'user_cancelled', label: 'User Cancelled' },
    { value: 'admin_initiated', label: 'Admin Initiated' },
  ]},
  { key: 'status', label: 'Status', type: 'select', required: true, options: [
    { value: 'requested', label: 'Requested' },
    { value: 'approved', label: 'Approved' },
    { value: 'processed', label: 'Processed' },
    { value: 'denied', label: 'Denied' },
  ]},
  { key: 'gateway_refund_id', label: 'Gateway Refund ID', type: 'text', placeholder: 'Gateway reference ID' },
];

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const [processRefund, setProcessRefund] = useState<any | null>(null);
  const [denyRefund, setDenyRefund] = useState<any | null>(null);
  const [editRefund, setEditRefund] = useState<any | null>(null);

  const fetchRefunds = () => {
    setLoading(true);
    const endpoint = filter
      ? `/admin/refunds?status=${filter}`
      : '/admin/refunds';
    api
      .get<any>(endpoint)
      .then((res) => setRefunds(res.data?.data || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRefunds();
  }, [filter]);

  const handleProcess = async () => {
    if (!processRefund) return;
    await api.patch(`/admin/refunds/${processRefund.id}`, { status: 'processed' });
    fetchRefunds();
  };

  const handleDeny = async () => {
    if (!denyRefund) return;
    await api.patch(`/admin/refunds/${denyRefund.id}`, { status: 'denied' });
    fetchRefunds();
  };

  const handleEditSave = async (values: Record<string, any>) => {
    if (!editRefund) return;
    const { id, access_payment_id, request_id, user_id, users, access_payments, created_at, updated_at, processed_at, ...editable } = values;
    await api.patch(`/admin/refunds/${editRefund.id}`, editable);
    fetchRefunds();
  };

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
        return `${symbol}${(row.amount_minor / 100).toLocaleString()}`;
      },
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row: any) => (
        <span className="text-sm capitalize">{row.reason?.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      key: 'gateway_refund_id',
      header: 'Gateway Ref',
      render: (row: any) => (
        <span className="text-xs text-gray-500 font-mono">{row.gateway_refund_id || '—'}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (row: any) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setEditRefund(row)}
            className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
          {row.status === 'requested' && (
            <>
              <button
                onClick={() => setProcessRefund(row)}
                className="text-xs px-2.5 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Process
              </button>
              <button
                onClick={() => setDenyRefund(row)}
                className="text-xs px-2.5 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Deny
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Refunds"
        description="Track and manage refund requests"
        action={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Statuses</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="processed">Processed</option>
            <option value="denied">Denied</option>
          </select>
        }
      />
      <DataTable
        columns={columns}
        data={refunds}
        loading={loading}
        emptyContent={
          <EmptyState
            icon={RotateCcw}
            title="No refunds processed"
            description="Refund requests will appear here when users request a refund."
          />
        }
      />

      {/* Edit Refund Modal */}
      <EditModal
        open={!!editRefund}
        title={`Edit Refund — ${editRefund?.users?.full_name || ''}`}
        fields={refundEditFields}
        initialValues={editRefund || {}}
        onClose={() => setEditRefund(null)}
        onSave={handleEditSave}
      />

      {/* Process Confirm */}
      <ConfirmDialog
        open={!!processRefund}
        title="Process Refund"
        message={`Process refund of ${processRefund?.currency} ${((processRefund?.amount_minor || 0) / 100).toLocaleString()} for ${processRefund?.users?.full_name || 'this user'}? The amount will be returned to their original payment method.`}
        confirmLabel="Process Refund"
        variant="info"
        onClose={() => setProcessRefund(null)}
        onConfirm={handleProcess}
      />

      {/* Deny Confirm */}
      <ConfirmDialog
        open={!!denyRefund}
        title="Deny Refund"
        message={`Deny refund of ${denyRefund?.currency} ${((denyRefund?.amount_minor || 0) / 100).toLocaleString()} for ${denyRefund?.users?.full_name || 'this user'}?`}
        confirmLabel="Deny Refund"
        variant="danger"
        onClose={() => setDenyRefund(null)}
        onConfirm={handleDeny}
      />
    </div>
  );
}
