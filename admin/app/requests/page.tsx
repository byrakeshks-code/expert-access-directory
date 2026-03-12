'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { EditModal, FieldDef } from '@/components/edit-modal';
import { api } from '@/lib/api';
import { Pencil, Send, MessageSquare, Lock, X } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

const requestEditFields: FieldDef[] = [
  { key: 'id', label: 'Request ID', type: 'readonly' },
  { key: 'subject', label: 'Subject', type: 'text', required: true },
  { key: 'message', label: 'Message', type: 'textarea' },
  { key: 'status', label: 'Status', type: 'select', required: true, options: [
    { value: 'pending', label: 'Pending' },
    { value: 'sent', label: 'Sent' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'payment_coordination', label: 'Payment Coordination' },
    { value: 'engaged', label: 'Engaged' },
    { value: 'coordination_expired', label: 'Coordination Expired' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'closed', label: 'Closed' },
  ]},
];

interface Message {
  id: string;
  sender_id: string;
  body: string;
  message_type?: string;
  metadata?: Record<string, any>;
  attachment_url?: string;
  created_at: string;
  users?: { full_name: string; avatar_url?: string };
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [editReq, setEditReq] = useState<any | null>(null);

  // Conversation viewer state
  const [chatReq, setChatReq] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  const fetchRequests = () => {
    setLoading(true);
    const endpoint = filter
      ? `/admin/requests?status=${filter}`
      : '/admin/requests';
    api
      .get<any>(endpoint)
      .then((res) => setRequests(res.data?.data || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleEditSave = async (values: Record<string, any>) => {
    if (!editReq) return;
    const { id, created_at, updated_at, users, experts, user_id, expert_id, payment_id, ...editable } = values;
    await api.patch(`/admin/requests/${editReq.id}`, editable);
    fetchRequests();
  };

  const openChat = async (row: any) => {
    setChatReq(row);
    setMsgLoading(true);
    try {
      const res = await api.get<any>(`/admin/requests/${row.id}/messages`);
      const msgs = Array.isArray(res) ? res : (res.data || []);
      setMessages(msgs);
    } catch {
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  };

  const handleAdminClose = async () => {
    if (!chatReq) return;
    setClosing(true);
    try {
      await api.post(`/admin/requests/${chatReq.id}/close`);
      setChatReq((prev: any) => ({ ...prev, status: 'closed' }));
      fetchRequests();
    } catch {} finally {
      setClosing(false);
    }
  };

  const columns = [
    { key: 'subject', header: 'Subject' },
    {
      key: 'user',
      header: 'From',
      render: (row: any) => row.users?.full_name || '—',
    },
    {
      key: 'expert',
      header: 'To Expert',
      render: (row: any) => row.experts?.headline || row.experts?.users?.full_name || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => <StatusBadge status={row.status} />,
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
        <div className="flex gap-1.5">
          <button
            onClick={() => setEditReq(row)}
            className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
          {['payment_coordination', 'engaged', 'accepted', 'closed', 'coordination_expired'].includes(row.status) && (
            <button
              onClick={() => openChat(row)}
              className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3" /> Chat
            </button>
          )}
          {row.status === 'payment_coordination' && (
            <button
              onClick={async () => { await api.post(`/admin/requests/${row.id}/force-engage`); fetchRequests(); }}
              className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
            >
              Force Engage
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Requests"
        description="All access requests across the platform — admin can override status and fields"
        action={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="payment_coordination">Payment Coordination</option>
            <option value="engaged">Engaged</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="coordination_expired">Coordination Expired</option>
            <option value="cancelled">Cancelled</option>
            <option value="closed">Closed</option>
          </select>
        }
      />
      <DataTable
        columns={columns}
        data={requests}
        loading={loading}
        emptyContent={
          <EmptyState
            icon={Send}
            title="No access requests yet"
            description="Access requests will appear here when users reach out to experts."
          />
        }
      />

      {/* Edit Request Modal */}
      <EditModal
        open={!!editReq}
        title={`Edit Request — ${editReq?.subject || ''}`}
        fields={requestEditFields}
        initialValues={editReq || {}}
        onClose={() => setEditReq(null)}
        onSave={handleEditSave}
      />

      {/* Conversation Viewer Modal */}
      {chatReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">Conversation: {chatReq.subject || 'Request'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {chatReq.users?.full_name || 'User'} ↔ {chatReq.experts?.headline || chatReq.experts?.users?.full_name || 'Expert'}
                  {chatReq.status === 'closed' && <span className="ml-2 text-gray-400">(Closed)</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {['accepted', 'engaged'].includes(chatReq.status) && (
                  <button
                    onClick={handleAdminClose}
                    disabled={closing}
                    className="text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <Lock className="w-3 h-3" /> {closing ? 'Closing...' : 'Close Conversation'}
                  </button>
                )}
                <button onClick={() => setChatReq(null)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[200px]">
              {msgLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No messages in this conversation.</p>
              ) : (
                messages.map((msg) => {
                  if (msg.message_type === 'system') {
                    return (
                      <div key={msg.id} className="flex justify-center py-1">
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{msg.body}</span>
                      </div>
                    );
                  }

                  const isExpert = msg.sender_id !== chatReq.user_id;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isExpert ? 'flex-row-reverse' : ''}`}>
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-gray-600">
                        {(msg.users?.full_name || '?')[0].toUpperCase()}
                      </div>
                      <div className={`max-w-[75%]`}>
                        {msg.message_type === 'payment_details' && msg.metadata ? (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm space-y-1">
                            <p className="font-semibold text-amber-800 text-xs">Payment Details</p>
                            <p className="text-amber-900">{msg.metadata.fee_currency} {msg.metadata.fee_amount} via {msg.metadata.payment_method}</p>
                            <p className="text-amber-700 text-xs font-mono break-all">{msg.metadata.payment_details}</p>
                          </div>
                        ) : msg.message_type === 'payment_receipt' ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-sm">
                            <p className="font-semibold text-blue-800 text-xs">Receipt</p>
                            {msg.attachment_url && (
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">
                                View Receipt
                              </a>
                            )}
                          </div>
                        ) : msg.message_type === 'payment_confirmed' || msg.message_type === 'receipt_verified' ? (
                          <div className={`${msg.message_type === 'receipt_verified' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-blue-50 border-blue-200 text-blue-800'} border rounded-xl px-3 py-2 text-xs font-medium`}>
                            {msg.body}
                          </div>
                        ) : (
                          <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-line break-words ${
                            isExpert ? 'bg-purple-100 text-purple-900 rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                          }`}>
                            {msg.body}
                          </div>
                        )}
                        <p className={`text-[10px] text-gray-400 mt-0.5 px-1 ${isExpert ? 'text-right' : ''}`}>
                          {msg.users?.full_name} · {new Date(msg.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer info */}
            <div className="px-5 py-3 border-t bg-gray-50 rounded-b-xl">
              <p className="text-xs text-gray-500 text-center">
                Admin view only — messages are between the user and expert.
                {chatReq.status === 'closed' && ' This conversation is closed.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
