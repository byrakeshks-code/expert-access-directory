'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { EditModal, FieldDef } from '@/components/edit-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { api } from '@/lib/api';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';

interface SubProblem {
  id: number;
  domain_id: number;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

interface Domain {
  id: number;
  name: string;
  slug: string;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const domainFields: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'slug', label: 'Slug', type: 'text', required: true },
  { key: 'icon_url', label: 'Icon', type: 'image', bucket: 'media', folder: 'domains' },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'is_active', label: 'Active', type: 'toggle' },
];

const subProblemFields: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'slug', label: 'Slug', type: 'text', required: true },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'is_active', label: 'Active', type: 'toggle' },
];

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [subProblems, setSubProblems] = useState<Record<number, SubProblem[]>>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  // Modal state
  const [editDomain, setEditDomain] = useState<Domain | null>(null);
  const [createDomainOpen, setCreateDomainOpen] = useState(false);
  const [editSubProblem, setEditSubProblem] = useState<SubProblem | null>(null);
  const [createSubProblemFor, setCreateSubProblemFor] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'domain' | 'sub-problem'; id: number; name: string } | null>(null);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>('/domains');
      setDomains(res.data?.data || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubProblems = async (domainId: number) => {
    try {
      const res = await api.get<any>(`/domains/${domainId}/sub-problems`);
      const subs = res.data?.data || res.data || [];
      setSubProblems((prev) => ({ ...prev, [domainId]: subs }));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const toggleExpand = (domainId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
        if (!subProblems[domainId]) {
          fetchSubProblems(domainId);
        }
      }
      return next;
    });
  };

  const handleCreateDomain = async (values: Record<string, any>) => {
    await api.post('/admin/domains', values);
    fetchDomains();
  };

  const handleUpdateDomain = async (values: Record<string, any>) => {
    if (!editDomain) return;
    await api.patch(`/admin/domains/${editDomain.id}`, values);
    fetchDomains();
  };

  const handleCreateSubProblem = async (values: Record<string, any>) => {
    if (createSubProblemFor === null) return;
    await api.post(`/admin/domains/${createSubProblemFor}/sub-problems`, values);
    fetchSubProblems(createSubProblemFor);
  };

  const handleUpdateSubProblem = async (values: Record<string, any>) => {
    if (!editSubProblem) return;
    await api.patch(`/admin/sub-problems/${editSubProblem.id}`, values);
    fetchSubProblems(editSubProblem.domain_id);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'domain') {
      await api.delete(`/admin/domains/${deleteTarget.id}`);
      fetchDomains();
    } else {
      await api.delete(`/admin/sub-problems/${deleteTarget.id}`);
      // Refresh the parent domain's sub-problems
      const sp = Object.entries(subProblems).find(([, subs]) =>
        subs.some((s) => s.id === deleteTarget.id),
      );
      if (sp) fetchSubProblems(Number(sp[0]));
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Domain Taxonomy" description="Manage domains and guidance areas" />
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Domain Taxonomy"
        description="Manage domains and guidance areas"
        action={
          <button
            onClick={() => setCreateDomainOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Domain
          </button>
        }
      />

      <div className="space-y-3">
        {domains.map((domain) => (
          <div key={domain.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Domain Row */}
            <div className="flex items-center justify-between px-6 py-4">
              <button
                onClick={() => toggleExpand(domain.id)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                {expanded.has(domain.id) ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{domain.name}</span>
                    <span className="text-xs text-gray-400 font-mono">{domain.slug}</span>
                    {!domain.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Order: {domain.sort_order} &middot; {subProblems[domain.id]?.length ?? '...'} guidance areas
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCreateSubProblemFor(domain.id);
                    if (!expanded.has(domain.id)) toggleExpand(domain.id);
                  }}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Guidance area
                </button>
                <button
                  onClick={() => setEditDomain(domain)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Edit domain"
                >
                  <Pencil className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => setDeleteTarget({ type: 'domain', id: domain.id, name: domain.name })}
                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  title="Delete domain"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>

            {/* Guidance areas */}
            {expanded.has(domain.id) && (
              <div className="border-t border-gray-100 bg-gray-50 px-6 py-3">
                {!subProblems[domain.id] ? (
                  <p className="text-sm text-gray-400 py-2">Loading guidance areas...</p>
                ) : subProblems[domain.id].length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">No guidance areas yet</p>
                ) : (
                  <div className="space-y-2">
                    {subProblems[domain.id].map((sp) => (
                      <div
                        key={sp.id}
                        className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          <div>
                            <span className="text-sm font-medium text-gray-800">{sp.name}</span>
                            <span className="text-xs text-gray-400 font-mono ml-2">{sp.slug}</span>
                            {!sp.is_active && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 ml-2">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditSubProblem(sp)}
                            className="p-1 rounded hover:bg-gray-100 transition-colors"
                            title="Edit guidance area"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'sub-problem', id: sp.id, name: sp.name })}
                            className="p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete guidance area"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {domains.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            No domains found
          </div>
        )}
      </div>

      {/* Create Domain Modal */}
      <EditModal
        open={createDomainOpen}
        title="Create Domain"
        fields={domainFields}
        initialValues={{ name: '', slug: '', icon_url: '', sort_order: 0, is_active: true }}
        onClose={() => setCreateDomainOpen(false)}
        onSave={handleCreateDomain}
      />

      {/* Edit Domain Modal */}
      <EditModal
        open={!!editDomain}
        title="Edit Domain"
        fields={domainFields}
        initialValues={editDomain || {}}
        onClose={() => setEditDomain(null)}
        onSave={handleUpdateDomain}
      />

      {/* Create Guidance area Modal */}
      <EditModal
        open={createSubProblemFor !== null}
        title={`Add Guidance area to "${domains.find((d) => d.id === createSubProblemFor)?.name ?? ''}"`}
        fields={subProblemFields.filter((f) => f.key !== 'is_active')}
        initialValues={{ name: '', slug: '', sort_order: 0 }}
        onClose={() => setCreateSubProblemFor(null)}
        onSave={handleCreateSubProblem}
      />

      {/* Edit Guidance area Modal */}
      <EditModal
        open={!!editSubProblem}
        title="Edit Guidance area"
        fields={subProblemFields}
        initialValues={editSubProblem || {}}
        onClose={() => setEditSubProblem(null)}
        onSave={handleUpdateSubProblem}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.type === 'domain' ? 'Domain' : 'Guidance area'}`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
