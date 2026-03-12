'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { EditModal, FieldDef } from '@/components/edit-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { api } from '@/lib/api';
import { Pencil, FileText } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

const docEditFields: FieldDef[] = [
  { key: 'id', label: 'Document ID', type: 'readonly' },
  { key: 'document_type', label: 'Document Type', type: 'select', required: true, options: [
    { value: 'id_proof', label: 'ID Proof' },
    { value: 'degree', label: 'Degree' },
    { value: 'license', label: 'License' },
    { value: 'portfolio', label: 'Portfolio' },
    { value: 'other', label: 'Other' },
  ]},
  { key: 'file_url', label: 'File URL', type: 'text', required: true },
  { key: 'status', label: 'Status', type: 'select', required: true, options: [
    { value: 'pending', label: 'Pending' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
  ]},
  { key: 'reviewer_notes', label: 'Reviewer Notes', type: 'textarea' },
];

export default function VerificationDocsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const [approveDoc, setApproveDoc] = useState<any | null>(null);
  const [rejectDoc, setRejectDoc] = useState<any | null>(null);
  const [editDoc, setEditDoc] = useState<any | null>(null);

  const fetchDocs = () => {
    setLoading(true);
    const endpoint = filter
      ? `/admin/verification-documents?status=${filter}`
      : '/admin/verification-documents';
    api
      .get<any>(endpoint)
      .then((res) => setDocs(res.data?.data || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
  }, [filter]);

  const handleApprove = async (notes?: string) => {
    if (!approveDoc) return;
    await api.patch(`/admin/verification-documents/${approveDoc.id}`, {
      status: 'verified',
      reviewer_notes: notes || 'Approved',
    });
    fetchDocs();
  };

  const handleReject = async (notes?: string) => {
    if (!rejectDoc) return;
    await api.patch(`/admin/verification-documents/${rejectDoc.id}`, {
      status: 'rejected',
      reviewer_notes: notes || 'Rejected',
    });
    fetchDocs();
  };

  const handleEditSave = async (values: Record<string, any>) => {
    if (!editDoc) return;
    const { id, expert_id, experts, created_at, reviewed_by, reviewed_at, ...editable } = values;
    await api.patch(`/admin/verification-documents/${editDoc.id}`, editable);
    fetchDocs();
  };

  const columns = [
    {
      key: 'expert_name',
      header: 'Expert',
      render: (row: any) => (
        <div>
          <p className="text-sm font-medium text-gray-900">
            {row.experts?.users?.full_name || '—'}
          </p>
          <p className="text-xs text-gray-400">{row.experts?.users?.email || ''}</p>
        </div>
      ),
    },
    {
      key: 'document_type',
      header: 'Type',
      render: (row: any) => (
        <span className="text-sm capitalize">{row.document_type?.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'file_url',
      header: 'File',
      render: (row: any) => (
        <a
          href={row.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          View Document
        </a>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      key: 'reviewer_notes',
      header: 'Notes',
      render: (row: any) => (
        <span className="text-sm text-gray-500 block max-w-xs truncate" title={row.reviewer_notes}>
          {row.reviewer_notes || '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Uploaded',
      render: (row: any) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setEditDoc(row)}
            className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
          {['pending', 'under_review'].includes(row.status) && (
            <>
              <button
                onClick={() => setApproveDoc(row)}
                className="text-xs px-2.5 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => setRejectDoc(row)}
                className="text-xs px-2.5 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Reject
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
        title="Verification Documents"
        description="Review and manage expert verification documents"
        action={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        }
      />
      <DataTable
        columns={columns}
        data={docs}
        loading={loading}
        emptyContent={
          <EmptyState
            icon={FileText}
            title="No verification documents"
            description="Documents will appear here when experts upload their verification files."
          />
        }
      />

      {/* Edit Document Modal */}
      <EditModal
        open={!!editDoc}
        title={`Edit Document — ${editDoc?.experts?.users?.full_name || ''}`}
        fields={docEditFields}
        initialValues={editDoc || {}}
        onClose={() => setEditDoc(null)}
        onSave={handleEditSave}
      />

      {/* Approve Confirm */}
      <ConfirmDialog
        open={!!approveDoc}
        title="Approve Document"
        message={`Approve the ${approveDoc?.document_type?.replace('_', ' ')} document from ${approveDoc?.experts?.users?.full_name || 'this expert'}?`}
        confirmLabel="Approve"
        variant="info"
        showNotes
        notesLabel="Reviewer Notes"
        notesPlaceholder="Optional approval notes..."
        onClose={() => setApproveDoc(null)}
        onConfirm={handleApprove}
      />

      {/* Reject Confirm */}
      <ConfirmDialog
        open={!!rejectDoc}
        title="Reject Document"
        message={`Reject the ${rejectDoc?.document_type?.replace('_', ' ')} document from ${rejectDoc?.experts?.users?.full_name || 'this expert'}? The expert will be notified.`}
        confirmLabel="Reject"
        variant="danger"
        showNotes
        notesLabel="Rejection Reason"
        notesPlaceholder="Reason for rejection..."
        onClose={() => setRejectDoc(null)}
        onConfirm={handleReject}
      />
    </div>
  );
}
