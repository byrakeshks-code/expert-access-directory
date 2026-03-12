'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { EditModal, FieldDef } from '@/components/edit-modal';
import { api } from '@/lib/api';
import { Pencil, Plus, KeyRound, Users } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

const editUserFields: FieldDef[] = [
  { key: 'id', label: 'User ID', type: 'readonly' },
  { key: 'email', label: 'Email', type: 'text', required: true },
  { key: 'full_name', label: 'Full Name', type: 'text', required: true },
  { key: 'role', label: 'Role', type: 'select', options: [
    { value: 'user', label: 'User' },
    { value: 'expert', label: 'Expert' },
    { value: 'admin', label: 'Admin' },
  ]},
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'country_code', label: 'Country Code', type: 'select', options: [
    { value: 'IN', label: 'India (IN)' },
    { value: 'US', label: 'United States (US)' },
    { value: 'GB', label: 'United Kingdom (GB)' },
    { value: 'CA', label: 'Canada (CA)' },
    { value: 'AU', label: 'Australia (AU)' },
    { value: 'DE', label: 'Germany (DE)' },
    { value: 'FR', label: 'France (FR)' },
    { value: 'SG', label: 'Singapore (SG)' },
    { value: 'AE', label: 'UAE (AE)' },
  ]},
  { key: 'timezone', label: 'Timezone', type: 'select', options: [
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
    { value: 'America/New_York', label: 'America/New_York (EST)' },
    { value: 'America/Chicago', label: 'America/Chicago (CST)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
    { value: 'Europe/London', label: 'Europe/London (GMT)' },
    { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney (AEDT)' },
  ]},
  { key: 'preferred_lang', label: 'Preferred Language', type: 'select', options: [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
  ]},
  { key: 'avatar_url', label: 'Avatar', type: 'image', bucket: 'avatars', folder: 'users' },
  { key: 'is_active', label: 'Active', type: 'toggle' },
];

const createUserFields: FieldDef[] = [
  { key: 'email', label: 'Email', type: 'text', required: true, placeholder: 'user@example.com' },
  { key: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Min 8 characters' },
  { key: 'full_name', label: 'Full Name', type: 'text', required: true },
  { key: 'role', label: 'Role', type: 'select', options: [
    { value: 'user', label: 'User' },
    { value: 'expert', label: 'Expert' },
    { value: 'admin', label: 'Admin' },
  ]},
  { key: 'phone', label: 'Phone', type: 'text', placeholder: '+91-9000000000' },
  { key: 'country_code', label: 'Country Code', type: 'select', options: [
    { value: 'IN', label: 'India (IN)' },
    { value: 'US', label: 'United States (US)' },
    { value: 'GB', label: 'United Kingdom (GB)' },
    { value: 'CA', label: 'Canada (CA)' },
    { value: 'AU', label: 'Australia (AU)' },
  ]},
  { key: 'timezone', label: 'Timezone', type: 'select', options: [
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
    { value: 'America/New_York', label: 'America/New_York (EST)' },
    { value: 'Europe/London', label: 'Europe/London (GMT)' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  ]},
  { key: 'preferred_lang', label: 'Preferred Language', type: 'select', options: [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
  ]},
];

const resetPasswordFields: FieldDef[] = [
  { key: 'new_password', label: 'New Password', type: 'password', required: true, placeholder: 'Enter new password (min 8 chars)' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [resetPwUser, setResetPwUser] = useState<any | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    api
      .get<any>('/admin/users')
      .then((res) => setUsers(res.data?.data || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (values: Record<string, any>) => {
    if (!editUser) return;
    const { id, created_at, updated_at, ...editable } = values;
    await api.patch(`/admin/users/${editUser.id}`, editable);
    fetchUsers();
  };

  const handleCreate = async (values: Record<string, any>) => {
    await api.post('/admin/users', values);
    fetchUsers();
  };

  const handleResetPassword = async (values: Record<string, any>) => {
    if (!resetPwUser) return;
    await api.post(`/admin/users/${resetPwUser.id}/reset-password`, { new_password: values.new_password });
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await api.patch(`/admin/users/${id}`, { is_active: !isActive });
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, is_active: !isActive } : u)),
    );
  };

  const columns = [
    { key: 'full_name', header: 'Name' },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (row: any) => {
        const expertStatus = Array.isArray(row.experts)
          ? row.experts[0]?.verification_status
          : row.experts?.verification_status;

        if (row.role === 'admin') {
          return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Admin</span>;
        }

        if (row.role === 'expert') {
          const label =
            expertStatus === 'verified' ? 'Expert' :
            expertStatus === 'rejected' ? 'Expert (Rejected)' :
            expertStatus === 'under_review' ? 'Expert (Review)' :
            'Expert (Pending)';
          const colors =
            expertStatus === 'verified' ? 'bg-blue-100 text-blue-700' :
            expertStatus === 'rejected' ? 'bg-red-100 text-red-700' :
            'bg-amber-100 text-amber-700';
          return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors}`}>{label}</span>;
        }

        return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">User</span>;
      },
    },
    { key: 'country_code', header: 'Country' },
    {
      key: 'is_active',
      header: 'Status',
      render: (row: any) => (
        <StatusBadge status={row.is_active ? 'active' : 'suspended'} />
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (row: any) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setEditUser(row)}
            className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={() => setResetPwUser(row)}
            className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors flex items-center gap-1"
          >
            <KeyRound className="w-3 h-3" /> Reset PW
          </button>
          <button
            onClick={() => toggleActive(row.id, row.is_active)}
            className={`text-xs px-3 py-1 rounded-md transition-colors ${
              row.is_active
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {row.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="User Management"
        description="View and manage platform users"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create User
          </button>
        }
      />
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyContent={
          <EmptyState
            icon={Users}
            title="No users found"
            description="Users will appear here once they create an account."
          />
        }
      />

      {/* Edit User Modal */}
      <EditModal
        open={!!editUser}
        title={`Edit User — ${editUser?.full_name || ''}`}
        fields={editUserFields}
        initialValues={editUser || {}}
        onClose={() => setEditUser(null)}
        onSave={handleSave}
      />

      {/* Create User Modal */}
      <EditModal
        open={showCreate}
        title="Create User"
        fields={createUserFields}
        initialValues={{ role: 'user', country_code: 'IN', timezone: 'Asia/Kolkata', preferred_lang: 'en' }}
        onClose={() => setShowCreate(false)}
        onSave={handleCreate}
        saveLabel="Create User"
      />

      {/* Reset Password Modal */}
      <EditModal
        open={!!resetPwUser}
        title={`Reset Password — ${resetPwUser?.full_name || ''}`}
        fields={resetPasswordFields}
        initialValues={{ new_password: '' }}
        onClose={() => setResetPwUser(null)}
        onSave={handleResetPassword}
        saveLabel="Reset Password"
      />
    </div>
  );
}
