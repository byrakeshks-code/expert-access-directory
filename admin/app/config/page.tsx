'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { EditModal, FieldDef } from '@/components/edit-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { api } from '@/lib/api';
import { Pencil, Plus, Trash2, Settings } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { TableSkeleton } from '@/components/table-skeleton';

interface ConfigItem {
  key: string;
  value: any;
  description: string;
}

const editConfigFields: FieldDef[] = [
  { key: 'key', label: 'Key', type: 'readonly' },
  { key: 'description', label: 'Description', type: 'readonly' },
  { key: 'value', label: 'Value', type: 'textarea', required: true },
];

const createConfigFields: FieldDef[] = [
  { key: 'key', label: 'Key', type: 'text', required: true, placeholder: 'e.g. feature_flag_xyz' },
  { key: 'value', label: 'Value', type: 'textarea', required: true, placeholder: 'Config value' },
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'What this config controls' },
];

export default function ConfigPage() {
  const [config, setConfig] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<ConfigItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ConfigItem | null>(null);

  const fetchConfig = () => {
    setLoading(true);
    api
      .get<any>('/admin/config')
      .then((res) => setConfig(res.data?.data || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleEditSave = async (values: Record<string, any>) => {
    if (!editItem) return;
    await api.patch(`/admin/config/${editItem.key}`, { value: values.value });
    fetchConfig();
  };

  const handleCreateSave = async (values: Record<string, any>) => {
    await api.post('/admin/config', {
      key: values.key,
      value: values.value,
      description: values.description || '',
    });
    fetchConfig();
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    await api.delete(`/admin/config/${deleteItem.key}`);
    setDeleteItem(null);
    fetchConfig();
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Platform Configuration" description="Runtime configuration values" />
        <TableSkeleton rows={4} columns={3} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Platform Configuration"
        description="Runtime configuration values — add, edit, and remove config keys"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Config
          </button>
        }
      />

      <div className="space-y-3">
        {config.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <EmptyState
              icon={Settings}
              title="No configuration entries"
              description="Click &quot;Add Config&quot; to create your first configuration entry."
            />
          </div>
        )}
        {config.map((item) => (
          <div
            key={item.key}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 font-mono text-sm">
                {item.key}
              </p>
              {item.description && (
                <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
              )}
              <p className="text-sm font-semibold text-blue-600 mt-2 break-all">
                {String(item.value)}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setEditItem(item)}
                className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                title="Edit value"
              >
                <Pencil className="w-4 h-4 text-blue-600" />
              </button>
              <button
                onClick={() => setDeleteItem(item)}
                className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Delete config"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Config Modal */}
      <EditModal
        open={!!editItem}
        title={`Edit Config — ${editItem?.key || ''}`}
        fields={editConfigFields}
        initialValues={editItem ? { key: editItem.key, description: editItem.description, value: String(editItem.value) } : {}}
        onClose={() => setEditItem(null)}
        onSave={handleEditSave}
      />

      {/* Create Config Modal */}
      <EditModal
        open={showCreate}
        title="Add Config Entry"
        fields={createConfigFields}
        initialValues={{ key: '', value: '', description: '' }}
        onClose={() => setShowCreate(false)}
        onSave={handleCreateSave}
        saveLabel="Create"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteItem}
        title="Delete Config"
        message={`Are you sure you want to delete the config key "${deleteItem?.key}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
