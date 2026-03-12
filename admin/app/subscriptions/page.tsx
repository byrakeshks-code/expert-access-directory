'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { EditModal, FieldDef } from '@/components/edit-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { api } from '@/lib/api';
import { Pencil, Check, X as XIcon, Plus, Trash2, RotateCcw, CreditCard } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { TableSkeleton } from '@/components/table-skeleton';

const featureKeys = [
  'analytics',
  'priority_search',
  'featured_homepage',
  'custom_profile_url',
  'email_notifications',
  'priority_support',
] as const;

const featureLabels: { key: string; label: string }[] = [
  { key: 'analytics', label: 'Analytics Dashboard' },
  { key: 'priority_search', label: 'Priority Search Placement' },
  { key: 'featured_homepage', label: 'Featured on Homepage' },
  { key: 'custom_profile_url', label: 'Custom Profile URL' },
  { key: 'email_notifications', label: 'Email Notifications' },
  { key: 'priority_support', label: 'Priority Support' },
];

const getEditTierFields = (): FieldDef[] => [
  { key: 'id', label: 'Tier ID', type: 'readonly' },
  { key: 'display_name', label: 'Display Name', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'price_monthly_minor', label: 'Monthly Price', type: 'number', help: 'Price in selected currency (e.g. 799)' },
  { key: 'price_yearly_minor', label: 'Yearly Price', type: 'number', help: 'Price in selected currency (e.g. 7999)' },
  { key: 'currency', label: 'Currency', type: 'select', options: [
    { value: 'INR', label: 'INR' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' },
  ]},
  { key: 'max_requests_per_day', label: 'Max Requests/Day', type: 'number' },
  { key: 'search_boost', label: 'Search Boost', type: 'number', help: 'Multiplier for search ranking (1.0 = no boost)' },
  { key: 'badge_label', label: 'Badge Label', type: 'text', help: 'Text shown on expert profile (leave empty for none)' },
  { key: 'is_active', label: 'Active', type: 'toggle' },
  ...featureKeys.map((k) => ({
    key: `feature_${k}`,
    label: featureLabels.find((fl) => fl.key === k)?.label || k,
    type: 'toggle' as const,
  })),
];

const allTierIds = ['starter', 'pro', 'elite'];

function formatPrice(amount: number, currency: string) {
  if (amount === 0) return 'Free';
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
  return `${symbol}${amount.toLocaleString()}`;
}

export default function SubscriptionsPage() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTier, setEditTier] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTier, setDeleteTier] = useState<any | null>(null);

  const fetchTiers = () => {
    setLoading(true);
    api
      .get<any>('/subscriptions/tiers')
      .then((res) => setTiers(res.data?.data || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  const usedIds = tiers.map((t) => t.id);
  const availableIds = allTierIds.filter((id) => !usedIds.includes(id));

  const getCreateFields = (): FieldDef[] => [
    { key: 'id', label: 'Tier ID', type: 'select', required: true, options: availableIds.map((id) => ({ value: id, label: id.charAt(0).toUpperCase() + id.slice(1) })) },
    { key: 'display_name', label: 'Display Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'price_monthly_minor', label: 'Monthly Price', type: 'number' },
    { key: 'price_yearly_minor', label: 'Yearly Price', type: 'number' },
    { key: 'currency', label: 'Currency', type: 'select', options: [
      { value: 'INR', label: 'INR' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' },
    ]},
    { key: 'max_requests_per_day', label: 'Max Requests/Day', type: 'number' },
    { key: 'search_boost', label: 'Search Boost', type: 'number' },
    { key: 'badge_label', label: 'Badge Label', type: 'text' },
    ...featureKeys.map((k) => ({
      key: `feature_${k}`,
      label: featureLabels.find((fl) => fl.key === k)?.label || k,
      type: 'toggle' as const,
    })),
  ];

  const handleEditSave = async (values: Record<string, any>) => {
    if (!editTier) return;
    const { id, created_at, updated_at, ...rest } = values;
    const features: Record<string, boolean> = {};
    const editable: Record<string, any> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (k.startsWith('feature_')) {
        features[k.replace('feature_', '')] = !!v;
      } else {
        editable[k] = v;
      }
    }
    editable.features = features;
    await api.patch(`/admin/subscription-tiers/${editTier.id}`, editable);
    fetchTiers();
  };

  const handleCreateSave = async (values: Record<string, any>) => {
    const { ...rest } = values;
    const features: Record<string, boolean> = {};
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (k.startsWith('feature_')) {
        features[k.replace('feature_', '')] = !!v;
      } else {
        payload[k] = v;
      }
    }
    payload.features = features;
    payload.is_active = true;
    await api.post('/admin/subscription-tiers', payload);
    fetchTiers();
  };

  const handleDeactivate = async () => {
    if (!deleteTier) return;
    await api.delete(`/admin/subscription-tiers/${deleteTier.id}`);
    setDeleteTier(null);
    fetchTiers();
  };

  const handleReactivate = async (tierId: string) => {
    await api.post(`/admin/subscription-tiers/${tierId}/reactivate`);
    fetchTiers();
  };

  const flattenTierForEdit = (tier: any) => {
    const features = typeof tier.features === 'string' ? JSON.parse(tier.features) : tier.features || {};
    const flat: Record<string, any> = { ...tier };
    for (const k of featureKeys) {
      flat[`feature_${k}`] = !!features[k];
    }
    return flat;
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Subscription Tiers" description="Manage Starter, Pro, and Elite tier pricing and features" />
        <TableSkeleton rows={3} columns={4} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Subscription Tiers"
        description="Manage Starter, Pro, and Elite tier pricing and features"
        action={
          <button
            onClick={() => setShowCreate(true)}
            disabled={availableIds.length === 0}
            title={availableIds.length === 0 ? 'All tier slots (starter, pro, elite) are in use' : 'Create a new tier'}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> Add Tier
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {tiers.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-gray-200">
            <EmptyState
              icon={CreditCard}
              title="No subscription tiers defined"
              description="Add your first tier (Starter, Pro, or Elite) to get started."
            />
          </div>
        )}
        {tiers.map((tier) => {
          const features = typeof tier.features === 'string' ? JSON.parse(tier.features) : tier.features || {};
          const inactive = !tier.is_active;

          return (
            <div
              key={tier.id}
              className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden relative ${
                inactive ? 'border-gray-200 opacity-60' :
                tier.id === 'elite' ? 'border-purple-300' :
                tier.id === 'pro' ? 'border-blue-300' :
                'border-gray-200'
              }`}
            >
              {inactive && (
                <div className="absolute top-3 right-3 bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full z-10">
                  Inactive
                </div>
              )}

              {/* Header */}
              <div className={`px-6 py-5 ${
                inactive ? 'bg-gray-50' :
                tier.id === 'elite' ? 'bg-gradient-to-r from-purple-50 to-purple-100' :
                tier.id === 'pro' ? 'bg-gradient-to-r from-blue-50 to-blue-100' :
                'bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{tier.display_name}</h3>
                      {tier.badge_label && !inactive && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          tier.id === 'elite' ? 'bg-purple-200 text-purple-800' :
                          tier.id === 'pro' ? 'bg-blue-200 text-blue-800' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {tier.badge_label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{tier.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditTier(tier)}
                      className="p-2 rounded-lg hover:bg-white/60 transition-colors"
                      title="Edit tier"
                    >
                      <Pencil className="w-4 h-4 text-gray-600" />
                    </button>
                    {inactive ? (
                      <button
                        onClick={() => handleReactivate(tier.id)}
                        className="p-2 rounded-lg hover:bg-green-50 transition-colors"
                        title="Reactivate tier"
                      >
                        <RotateCcw className="w-4 h-4 text-green-600" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeleteTier(tier)}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Deactivate tier"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(tier.price_monthly_minor, tier.currency)}
                  </span>
                  {tier.price_monthly_minor > 0 && (
                    <span className="text-sm text-gray-500">/month</span>
                  )}
                </div>
                {tier.price_yearly_minor > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    or {formatPrice(tier.price_yearly_minor, tier.currency)}/year
                    {tier.price_monthly_minor > 0 && (
                      <span className="text-green-600 ml-1">
                        (save {Math.round((1 - tier.price_yearly_minor / (tier.price_monthly_minor * 12)) * 100)}%)
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Limits */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Requests/Day</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {tier.max_requests_per_day >= 999 ? 'Unlimited' : tier.max_requests_per_day}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Search Boost</p>
                    <p className="text-sm font-semibold text-gray-900">{tier.search_boost}x</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="px-6 py-4">
                <p className="text-xs text-gray-400 uppercase mb-3">Features</p>
                <div className="space-y-2">
                  {featureLabels.map((f) => (
                    <div key={f.key} className="flex items-center gap-2">
                      {features[f.key] ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <XIcon className="w-4 h-4 text-gray-300" />
                      )}
                      <span className={`text-sm ${features[f.key] ? 'text-gray-700' : 'text-gray-400'}`}>
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Tier Modal */}
      <EditModal
        open={!!editTier}
        title={`Edit Tier — ${editTier?.display_name || ''}`}
        fields={getEditTierFields()}
        initialValues={editTier ? flattenTierForEdit(editTier) : {}}
        onClose={() => setEditTier(null)}
        onSave={handleEditSave}
      />

      {/* Create Tier Modal */}
      <EditModal
        open={showCreate}
        title="Add Subscription Tier"
        fields={getCreateFields()}
        initialValues={{ currency: 'INR', price_monthly_minor: 0, price_yearly_minor: 0, max_requests_per_day: 5, search_boost: 1 }}
        onClose={() => setShowCreate(false)}
        onSave={handleCreateSave}
        saveLabel="Create Tier"
      />

      {/* Deactivate Confirmation */}
      <ConfirmDialog
        open={!!deleteTier}
        title="Deactivate Tier"
        message={`This will deactivate the "${deleteTier?.display_name}" tier. Existing subscribers will keep access until their subscription ends. You can reactivate it later.`}
        confirmLabel="Deactivate"
        variant="danger"
        onClose={() => setDeleteTier(null)}
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
