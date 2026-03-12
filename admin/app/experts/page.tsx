'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { EditModal, FieldDef } from '@/components/edit-modal';

import { api } from '@/lib/api';
import { ChevronDown, ChevronUp, Pencil, Plus, KeyRound, UserPlus, FileText, ExternalLink, X } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

interface DomainOption {
  id: number;
  name: string;
}

interface Specialization {
  id: string;
  sub_problems: { name: string; slug: string; domains: { name: string } };
}

interface VerificationDoc {
  id: string;
  document_type: string;
  file_url: string;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
}

let domainCache: DomainOption[] | null = null;
let domainMapCache: Record<string, string> = {};

const loadDomains = async (): Promise<DomainOption[]> => {
  if (domainCache) return domainCache;
  try {
    const res = await api.get<any>('/domains');
    const raw = Array.isArray(res) ? res : (res.data?.data || res.data || []);
    domainCache = raw;
    domainMapCache = {};
    for (const d of raw) {
      domainMapCache[String(d.id)] = d.name;
      domainMapCache[d.name] = d.name;
    }
    return raw;
  } catch {
    return [];
  }
};

const resolveDomainName = (val: any): string => {
  if (!val) return '—';
  const s = String(val);
  return domainMapCache[s] || s;
};

const fetchDomainOptions = async () => {
  const domains = await loadDomains();
  return domains.map((d: any) => ({ value: d.name, label: d.name }));
};

const fetchTagSuggestions = async (): Promise<string[]> => {
  try {
    const res = await api.get<any>('/admin/tags');
    const tags = Array.isArray(res) ? res : (res.data?.data || res.data || []);
    return tags.map((t: any) => t.tag || t);
  } catch {
    return [];
  }
};

const getEditExpertFields = (): FieldDef[] => [
  { key: 'headline', label: 'Headline', type: 'text', required: true },
  { key: 'bio', label: 'Bio', type: 'textarea' },
  { key: 'primary_domain', label: 'Primary Domain', type: 'select', asyncOptions: fetchDomainOptions },
  { key: 'verification_status', label: 'Verification Status', type: 'select', options: [
    { value: 'pending', label: 'Pending' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'suspended', label: 'Suspended' },
  ]},
  { key: 'access_fee_minor', label: 'Access Fee', type: 'number', help: 'Price in selected currency (e.g. 2499)' },
  { key: 'access_fee_currency', label: 'Currency', type: 'select', options: [
    { value: 'INR', label: 'INR' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' },
  ]},
  { key: 'current_tier', label: 'Tier', type: 'select', options: [
    { value: 'starter', label: 'Starter' }, { value: 'pro', label: 'Pro' }, { value: 'elite', label: 'Elite' },
  ]},
  { key: 'is_available', label: 'Available', type: 'toggle' },
  { key: 'max_requests_per_day', label: 'Max Requests/Day', type: 'number' },
  { key: 'years_of_experience', label: 'Years of Experience', type: 'number' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'country', label: 'Country', type: 'text' },
  { key: 'languages', label: 'Languages (comma-separated)', type: 'text', help: 'e.g. en,hi,ta' },
  { key: 'avatar_url', label: 'Avatar', type: 'image', bucket: 'avatars', folder: 'experts' },
  { key: 'linkedin_url', label: 'LinkedIn URL', type: 'text' },
  { key: 'website_url', label: 'Website URL', type: 'text' },
  { key: 'tags', label: 'Search Tags (admin only)', type: 'tags', asyncSuggestions: fetchTagSuggestions, help: 'Tags improve search discoverability. Press Enter or comma to add.' },
];

const getCreateExpertFields = (): FieldDef[] => [
  { key: 'email', label: 'Email', type: 'text', required: true, placeholder: 'expert@example.com' },
  { key: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Min 8 characters' },
  { key: 'full_name', label: 'Full Name', type: 'text', required: true },
  { key: 'phone', label: 'Phone', type: 'text', placeholder: '+91-9000000000' },
  { key: 'country_code', label: 'Country Code', type: 'text', placeholder: 'IN' },
  { key: 'headline', label: 'Headline', type: 'text', required: true, placeholder: 'Expert tagline' },
  { key: 'bio', label: 'Bio', type: 'textarea' },
  { key: 'primary_domain', label: 'Primary Domain', type: 'select', asyncOptions: fetchDomainOptions },
  { key: 'years_of_experience', label: 'Years of Experience', type: 'number' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'country', label: 'Country', type: 'text', placeholder: 'India' },
  { key: 'access_fee_minor', label: 'Access Fee', type: 'number', help: 'Price in selected currency' },
  { key: 'access_fee_currency', label: 'Currency', type: 'select', options: [
    { value: 'INR', label: 'INR' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' },
  ]},
  { key: 'languages', label: 'Languages (comma-separated)', type: 'text', help: 'e.g. en,hi', placeholder: 'en' },
  { key: 'linkedin_url', label: 'LinkedIn URL', type: 'text' },
  { key: 'website_url', label: 'Website URL', type: 'text' },
];

const resetPasswordFields: FieldDef[] = [
  { key: 'new_password', label: 'New Password', type: 'password', required: true, placeholder: 'Enter new password (min 8 chars)' },
];

export default function ExpertsPage() {
  const [experts, setExperts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Modals
  const [editExpert, setEditExpert] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [resetPwExpert, setResetPwExpert] = useState<any | null>(null);

  // Detail view state
  const [detailId, setDetailId] = useState<string | null>(null);
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit modal docs
  const [editDocs, setEditDocs] = useState<VerificationDoc[]>([]);

  useEffect(() => {
    if (editExpert?.id) {
      api.get<any>(`/admin/verification-documents?expert_id=${editExpert.id}&limit=50`)
        .then((res) => {
          const arr = res.data?.data || res.data || res || [];
          setEditDocs(Array.isArray(arr) ? arr : []);
        })
        .catch(() => setEditDocs([]));
    } else {
      setEditDocs([]);
    }
  }, [editExpert?.id]);

  const fetchExperts = useCallback(() => {
    setLoading(true);
    const endpoint = filter ? `/admin/experts?status=${filter}` : '/admin/experts';
    api
      .get<any>(endpoint)
      .then((res) => setExperts(res.data?.data || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    loadDomains();
    fetchExperts();
  }, [fetchExperts]);

  const handleVerify = async (id: string) => {
    await api.post(`/admin/experts/${id}/verify`);
    fetchExperts();
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason (optional):');
    await api.post(`/admin/experts/${id}/reject`, { reason });
    fetchExperts();
  };

  const handleEditSave = async (values: Record<string, any>) => {
    if (!editExpert) return;
    // Only send fields that are defined in the edit form — not joined/system fields
    const validKeys = getEditExpertFields().map((f) => f.key);
    const payload: Record<string, any> = {};
    for (const key of validKeys) {
      if (key in values) payload[key] = values[key];
    }
    if (typeof payload.languages === 'string') {
      payload.languages = payload.languages.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    await api.patch(`/admin/experts/${editExpert.id}`, payload);
    fetchExperts();
  };

  const handleCreateSave = async (values: Record<string, any>) => {
    const payload = { ...values };
    if (typeof payload.languages === 'string') {
      payload.languages = payload.languages.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    await api.post('/admin/experts', payload);
    fetchExperts();
  };

  const handleResetPassword = async (values: Record<string, any>) => {
    if (!resetPwExpert) return;
    await api.post(`/admin/users/${resetPwExpert.user_id}/reset-password`, { new_password: values.new_password });
  };

  const toggleDetail = async (expertId: string) => {
    if (detailId === expertId) {
      setDetailId(null);
      return;
    }
    setDetailId(expertId);
    setDetailLoading(true);
    try {
      const [specsResult, docsResult] = await Promise.allSettled([
        api.get<any>(`/admin/experts/${expertId}/specializations`),
        api.get<any>(`/admin/verification-documents?expert_id=${expertId}&limit=100`),
      ]);

      if (specsResult.status === 'fulfilled') {
        const res = specsResult.value;
        const arr = res.data?.data || res.data || res || [];
        setSpecs(Array.isArray(arr) ? arr : []);
      } else {
        console.error('Failed to load specializations:', specsResult.reason);
        setSpecs([]);
      }

      if (docsResult.status === 'fulfilled') {
        const res = docsResult.value;
        const arr = res.data?.data || res.data || res || [];
        setDocs(Array.isArray(arr) ? arr : []);
      } else {
        console.error('Failed to load documents:', docsResult.reason);
        setDocs([]);
      }
    } catch (e) {
      console.error('toggleDetail error:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      key: 'users',
      header: 'Name',
      render: (row: any) => row.users?.full_name || '—',
    },
    {
      key: 'headline',
      header: 'Headline',
      render: (row: any) => (
        <span className="block max-w-xs truncate" title={row.headline}>
          {row.headline}
        </span>
      ),
    },
    {
      key: 'primary_domain',
      header: 'Domain',
      render: (row: any) => resolveDomainName(row.primary_domain),
    },
    {
      key: 'current_tier',
      header: 'Tier',
      render: (row: any) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          row.current_tier === 'elite' ? 'bg-purple-100 text-purple-700' :
          row.current_tier === 'pro' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {row.current_tier?.charAt(0).toUpperCase() + row.current_tier?.slice(1)}
        </span>
      ),
    },
    {
      key: 'access_fee',
      header: 'Fee',
      render: (row: any) =>
        `${row.access_fee_currency} ${(row.access_fee_minor || 0).toLocaleString()}`,
    },
    {
      key: 'tags',
      header: 'Tags',
      render: (row: any) => {
        const tags: string[] = row.tags || [];
        if (tags.length === 0) return <span className="text-xs text-gray-400">—</span>;
        return (
          <div className="flex gap-1 flex-wrap max-w-[180px]">
            {tags.slice(0, 2).map((t: string) => (
              <span key={t} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded-full">{t}</span>
            ))}
            {tags.length > 2 && <span className="text-[10px] text-gray-400">+{tags.length - 2}</span>}
          </div>
        );
      },
    },
    {
      key: 'verification_status',
      header: 'Status',
      render: (row: any) => <StatusBadge status={row.verification_status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => toggleDetail(row.id)}
            className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1"
          >
            {detailId === row.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            View
          </button>
          <button
            onClick={() => setEditExpert(row)}
            className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={() => setResetPwExpert(row)}
            className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors flex items-center gap-1"
          >
            <KeyRound className="w-3 h-3" /> Reset PW
          </button>
          {['pending', 'under_review'].includes(row.verification_status) && (
            <>
              <button
                onClick={() => handleVerify(row.id)}
                className="text-xs px-2.5 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(row.id)}
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
        title="Expert Management"
        description="Verify, manage, and monitor expert profiles"
        action={
          <div className="flex items-center gap-3">
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
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Expert
            </button>
          </div>
        }
      />
      <DataTable
        columns={columns}
        data={experts}
        loading={loading}
        emptyContent={
          <EmptyState
            icon={UserPlus}
            title="No experts registered yet"
            description="Experts will appear here once they sign up and complete their profiles."
          />
        }
      />

      {/* Detail Modal (Specializations + Docs) */}
      {detailId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDetailId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
            {/* Header */}
            {(() => {
              const expert = experts.find((e: any) => e.id === detailId);
              return (
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3 min-w-0">
                    {expert?.avatar_url && (
                      <img src={expert.avatar_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900 truncate">{expert?.users?.full_name || 'Expert Details'}</h2>
                      <p className="text-xs text-gray-500 truncate">{expert?.headline}</p>
                    </div>
                  </div>
                  <button onClick={() => setDetailId(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              );
            })()}

            {/* Scrollable Body */}
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">
              {detailLoading ? (
                <p className="text-sm text-gray-400 animate-pulse py-8 text-center">Loading details...</p>
              ) : (
                <>
                  {/* Quick Info Chips */}
                  {(() => {
                    const expert = experts.find((e: any) => e.id === detailId);
                    if (!expert) return null;
                    return (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                          {resolveDomainName(expert.primary_domain)}
                        </span>
                        {(expert.city || expert.country) && (
                          <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                            {expert.city}{expert.city && expert.country ? ', ' : ''}{expert.country}
                          </span>
                        )}
                        {expert.years_of_experience > 0 && (
                          <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                            {expert.years_of_experience} yrs experience
                          </span>
                        )}
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          expert.current_tier === 'elite' ? 'bg-purple-50 text-purple-700' :
                          expert.current_tier === 'pro' ? 'bg-blue-50 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {expert.current_tier?.charAt(0).toUpperCase() + expert.current_tier?.slice(1)} tier
                        </span>
                        <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                          {expert.access_fee_currency} {(expert.access_fee_minor || 0).toLocaleString()} fee
                        </span>
                      </div>
                    );
                  })()}

                  {/* Tags */}
                  {(() => {
                    const expert = experts.find((e: any) => e.id === detailId);
                    const expertTags: string[] = expert?.tags || [];
                    return expertTags.length > 0 ? (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags ({expertTags.length})</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {expertTags.map((tag: string) => (
                            <span key={tag} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">{tag}</span>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Specializations */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Specializations ({specs.length})</h3>
                    {specs.length === 0 ? (
                      <p className="text-sm text-gray-400">No specializations linked</p>
                    ) : (
                      <div className="space-y-1.5">
                        {specs.map((s) => (
                          <div key={s.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                            <span className="text-sm text-gray-800">{s.sub_problems?.name}</span>
                            <span className="text-xs text-gray-400">({s.sub_problems?.domains?.name})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Verification Documents */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Verification Documents ({docs.length})</h3>
                    {docs.length === 0 ? (
                      <p className="text-sm text-gray-400">No documents uploaded</p>
                    ) : (
                      <div className="space-y-3">
                        {docs.map((d) => (
                          <div key={d.id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                            {d.file_url && /\.(jpe?g|png|gif|webp)$/i.test(d.file_url) && (
                              <div className="relative w-full h-40 bg-gray-100">
                                <img
                                  src={d.file_url}
                                  alt={d.document_type}
                                  className="w-full h-full object-contain"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </div>
                            )}
                            <div className="px-3 py-2.5 flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-700 capitalize">{d.document_type.replace(/_/g, ' ')}</span>
                                <StatusBadge status={d.status} />
                              </div>
                              <div className="flex items-center gap-2">
                                {d.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={async () => {
                                        await api.patch(`/admin/verification-documents/${d.id}`, { status: 'approved' });
                                        toggleDetail(detailId!);
                                      }}
                                      className="text-xs px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={async () => {
                                        const notes = prompt('Rejection reason (optional):');
                                        await api.patch(`/admin/verification-documents/${d.id}`, { status: 'rejected', reviewer_notes: notes });
                                        toggleDetail(detailId!);
                                      }}
                                      className="text-xs px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                <a
                                  href={d.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" /> Open
                                </a>
                              </div>
                            </div>
                            {d.reviewer_notes && (
                              <div className="px-3 pb-2.5">
                                <p className="text-xs text-gray-500 italic">Note: {d.reviewer_notes}</p>
                              </div>
                            )}
                            <div className="px-3 pb-2">
                              <p className="text-[10px] text-gray-400">Uploaded {new Date(d.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setDetailId(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expert Modal */}
      <EditModal
        open={!!editExpert}
        title={`Edit Expert — ${editExpert?.users?.full_name || ''}`}
        fields={getEditExpertFields()}
        initialValues={editExpert ? {
          ...editExpert,
          primary_domain: resolveDomainName(editExpert.primary_domain),
          languages: Array.isArray(editExpert.languages) ? editExpert.languages.join(', ') : editExpert.languages || '',
        } : {}}
        onClose={() => setEditExpert(null)}
        onSave={handleEditSave}
      >
        {editDocs.length > 0 && (
          <div className="pt-4 mt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              Verification Documents ({editDocs.length})
            </h3>
            <div className="space-y-3">
              {editDocs.map((d) => (
                <div key={d.id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                  {d.file_url && /\.(jpe?g|png|gif|webp)$/i.test(d.file_url) && (
                    <div className="relative w-full h-32 bg-gray-100">
                      <img
                        src={d.file_url}
                        alt={d.document_type}
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-700 capitalize">{d.document_type.replace(/_/g, ' ')}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                  </div>
                  {d.reviewer_notes && (
                    <p className="px-3 pb-2 text-[10px] text-gray-500 italic">Note: {d.reviewer_notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </EditModal>

      {/* Create Expert Modal */}
      <EditModal
        open={showCreate}
        title="Create Expert"
        fields={getCreateExpertFields()}
        initialValues={{ country_code: 'IN', access_fee_currency: 'INR', languages: 'en' }}
        onClose={() => setShowCreate(false)}
        onSave={handleCreateSave}
        saveLabel="Create Expert"
      />

      {/* Reset Password Modal */}
      <EditModal
        open={!!resetPwExpert}
        title={`Reset Password — ${resetPwExpert?.users?.full_name || ''}`}
        fields={resetPasswordFields}
        initialValues={{ new_password: '' }}
        onClose={() => setResetPwExpert(null)}
        onSave={handleResetPassword}
        saveLabel="Reset Password"
      />
    </div>
  );
}
