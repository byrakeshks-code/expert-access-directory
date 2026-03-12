'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, X, Eye, Camera, User } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { PageTransition } from '@/components/shared/page-transition';
import { cn, toArray } from '@/lib/utils';

interface Domain { id: string; name: string; }
interface SubProblem { id: string; label?: string; name?: string; }

export default function ExpertProfilePage() {
  const { expertProfile, refreshProfile } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [subProblems, setSubProblems] = useState<SubProblem[]>([]);
  const [currentSpecs, setCurrentSpecs] = useState<SubProblem[]>([]);

  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [domainId, setDomainId] = useState('');
  const [fee, setFee] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [isAvailable, setIsAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<any>('/domains').then((res) => setDomains(toArray(res))).catch(() => {});
  }, []);

  useEffect(() => {
    if (expertProfile) {
      setHeadline(expertProfile.headline || '');
      setBio(expertProfile.bio || '');
      setDomainId(expertProfile.primary_domain_id || '');
      setFee(String(expertProfile.access_fee_minor || 49));
      setCurrency(expertProfile.access_fee_currency || 'INR');
      setIsAvailable(expertProfile.is_available);
    }
  }, [expertProfile]);

  useEffect(() => {
    if (domainId) {
      api.get<any>(`/domains/${domainId}/sub-problems`)
        .then((res) => setSubProblems(toArray(res)))
        .catch(() => setSubProblems([]));
    }
  }, [domainId]);

  useEffect(() => {
    if (expertProfile?.id) {
      api.get<any>(`/experts/me/specializations`)
        .then((res) => setCurrentSpecs(toArray(res)))
        .catch(() => {});
    }
  }, [expertProfile?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await api.patch('/experts/me', {
        headline,
        bio,
        primary_domain_id: domainId,
      });
      await api.put('/experts/me/access-fee', {
        access_fee_minor: Math.round(Number(fee)) || 0,
        access_fee_currency: currency,
      });
      await api.put('/experts/me/availability', { is_available: isAvailable });
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSpec = async (spId: string) => {
    try {
      await api.post('/experts/me/specializations', { sub_problem_id: spId });
      const sp = subProblems.find((s) => s.id === spId);
      if (sp) setCurrentSpecs((prev) => [...prev, sp]);
    } catch {}
  };

  const handleRemoveSpec = async (spId: string) => {
    try {
      await api.delete(`/experts/me/specializations/${spId}`);
      setCurrentSpecs((prev) => prev.filter((s) => s.id !== spId));
    } catch {}
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Edit Profile</h1>
              <p className="text-muted text-sm">Update your expert profile</p>
            </div>
          </div>
          {expertProfile?.id && (
            <a href={`/experts/${expertProfile.id}`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" leftIcon={<Eye className="w-4 h-4" />}>View Public</Button>
            </a>
          )}
        </div>

        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-surface-elevated border border-border rounded-2xl p-6 flex items-center gap-4">
          <div className="relative">
            <Avatar name={expertProfile?.headline || 'Expert'} src={expertProfile?.avatar_url} size="xl" />
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:opacity-90 transition-opacity">
              <Camera className="w-4 h-4 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);
                try {
                  await api.upload('/users/me/avatar', formData);
                  await refreshProfile();
                } catch {}
              }} />
            </label>
          </div>
          <div>
            <p className="font-semibold text-foreground">{expertProfile?.headline || 'Your Profile'}</p>
            <p className="text-sm text-muted">Click the camera icon to update your photo</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface-elevated border border-border rounded-2xl p-6">
          <form onSubmit={handleSave} className="space-y-5">
            {error && <div className="px-4 py-3 bg-error-light border border-error/20 rounded-xl text-sm text-error">{error}</div>}
            {success && <div className="px-4 py-3 bg-success-light border border-success/20 rounded-xl text-sm text-success">Profile updated!</div>}

            <Input label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g., Senior Tax Consultant" />
            <Textarea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} charCount={bio.length} maxChars={2000} rows={4} />
            <Select label="Primary Domain" options={domains.map((d) => ({ value: d.id, label: d.name }))} value={domainId} onChange={(e) => setDomainId(e.target.value)} />

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Input label="Access Fee" type="number" placeholder="e.g. 2999" value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
              <Select label="Currency" options={[{ value: 'INR', label: 'INR' }, { value: 'USD', label: 'USD' }]} value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="w-5 h-5 rounded-md border-border text-primary focus:ring-primary" />
              <span className="text-sm font-medium text-foreground">Available for requests</span>
            </label>

            <Button type="submit" isLoading={saving} className="w-full" leftIcon={<Save className="w-4 h-4" />}>
              Save Changes
            </Button>
          </form>
        </motion.div>

        {/* Specializations */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-surface-elevated border border-border rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Specializations</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {currentSpecs.map((spec) => (
              <Badge key={spec.id} variant="info" className="flex items-center gap-1">
                {spec.label || spec.name}
                <button onClick={() => handleRemoveSpec(spec.id)} className="hover:text-error">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {currentSpecs.length === 0 && <p className="text-sm text-muted">No specializations added</p>}
          </div>

          {subProblems.length > 0 && (
            <div>
              <p className="text-xs text-muted mb-2">Add from this domain:</p>
              <div className="flex flex-wrap gap-2">
                {subProblems
                  .filter((sp) => !currentSpecs.some((c) => c.id === sp.id))
                  .map((sp) => (
                    <button
                      key={sp.id}
                      onClick={() => handleAddSpec(sp.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border border-dashed border-border text-muted hover:border-primary hover:text-primary transition-all"
                    >
                      <Plus className="w-3 h-3" /> {sp.label || sp.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </PageTransition>
  );
}
