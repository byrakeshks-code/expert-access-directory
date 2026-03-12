'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { EditModal, FieldDef } from '@/components/edit-modal';
import { api } from '@/lib/api';
import { Eye, EyeOff, Star, Pencil } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

const reviewEditFields: FieldDef[] = [
  { key: 'id', label: 'Review ID', type: 'readonly' },
  { key: 'rating', label: 'Rating (1–5)', type: 'number', required: true, help: 'Integer between 1 and 5' },
  { key: 'comment', label: 'Comment', type: 'textarea' },
  { key: 'is_visible', label: 'Visible', type: 'toggle' },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedComment, setExpandedComment] = useState<string | null>(null);
  const [editReview, setEditReview] = useState<any | null>(null);

  const fetchReviews = () => {
    setLoading(true);
    api
      .get<any>('/admin/reviews')
      .then((res) => setReviews(res.data?.data || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const toggleVisibility = async (id: string, currentlyVisible: boolean) => {
    await api.patch(`/admin/reviews/${id}`, { is_visible: !currentlyVisible });
    fetchReviews();
  };

  const handleEditSave = async (values: Record<string, any>) => {
    if (!editReview) return;
    const { id, request_id, user_id, expert_id, users, experts, created_at, ...editable } = values;
    await api.patch(`/admin/reviews/${editReview.id}`, editable);
    fetchReviews();
  };

  const columns = [
    {
      key: 'rating',
      header: 'Rating',
      render: (row: any) => (
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i < row.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
              }`}
            />
          ))}
          <span className="text-xs text-gray-500 ml-1">{row.rating}/5</span>
        </div>
      ),
    },
    {
      key: 'user_name',
      header: 'Reviewer',
      render: (row: any) => row.users?.full_name || '—',
    },
    {
      key: 'expert_name',
      header: 'Expert',
      render: (row: any) => row.experts?.users?.full_name || '—',
    },
    {
      key: 'comment',
      header: 'Comment',
      render: (row: any) => {
        const isExpanded = expandedComment === row.id;
        const text = row.comment || '—';
        const truncated = text.length > 80 ? text.slice(0, 80) + '...' : text;
        return (
          <div>
            <p className="text-sm text-gray-700">{isExpanded ? text : truncated}</p>
            {text.length > 80 && (
              <button
                onClick={() => setExpandedComment(isExpanded ? null : row.id)}
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'is_visible',
      header: 'Visible',
      render: (row: any) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          row.is_visible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {row.is_visible ? 'Visible' : 'Hidden'}
        </span>
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
            onClick={() => setEditReview(row)}
            className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={() => toggleVisibility(row.id, row.is_visible)}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              row.is_visible
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {row.is_visible ? (
              <><EyeOff className="w-3 h-3" /> Hide</>
            ) : (
              <><Eye className="w-3 h-3" /> Show</>
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Review Moderation" description="Moderate user reviews — edit rating, comment, and visibility" />
      <DataTable
        columns={columns}
        data={reviews}
        loading={loading}
        emptyContent={
          <EmptyState
            icon={Star}
            title="No reviews submitted yet"
            description="Reviews will appear here once users rate their expert sessions."
          />
        }
      />

      {/* Edit Review Modal */}
      <EditModal
        open={!!editReview}
        title={`Edit Review — ${editReview?.users?.full_name || ''}`}
        fields={reviewEditFields}
        initialValues={editReview || {}}
        onClose={() => setEditReview(null)}
        onSave={handleEditSave}
      />
    </div>
  );
}
