'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Globe, Save, Camera, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { PageTransition } from '@/components/shared/page-transition';

export default function ExpertSettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setTimezone(profile.timezone || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess(false);
    try {
      await api.patch('/users/me', { full_name: fullName, phone, timezone });
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.upload('/users/me/avatar', formData);
      await refreshProfile();
    } catch {}
  };

  return (
    <PageTransition>
      <div className="max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Profile Settings
              </h1>
              <p className="text-muted text-sm">Manage your account information</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-surface-elevated border border-border rounded-2xl p-6 flex items-center gap-5">
            <div className="relative">
              <Avatar name={profile?.full_name || 'User'} src={profile?.avatar_url} size="xl" />
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:opacity-90 transition-opacity">
                <Camera className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <div>
              <p className="font-bold text-foreground">{profile?.full_name}</p>
              <p className="text-sm text-muted">{profile?.email}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="bg-surface-elevated border border-border rounded-2xl p-6">
            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="px-4 py-3 bg-error-light border border-error/20 rounded-xl text-sm text-error">{error}</div>
              )}
              {success && (
                <div className="px-4 py-3 bg-success-light border border-success/20 rounded-xl text-sm text-success">Profile updated successfully!</div>
              )}
              <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} leftIcon={<User className="w-4 h-4" />} />
              <Input label="Email" value={profile?.email || ''} disabled leftIcon={<Mail className="w-4 h-4" />} hint="Email cannot be changed" />
              <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} leftIcon={<Phone className="w-4 h-4" />} placeholder="+91 98765 43210" />
              <Input label="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} leftIcon={<Globe className="w-4 h-4" />} placeholder="Asia/Kolkata" />
              <Button type="submit" isLoading={saving} className="w-full" leftIcon={<Save className="w-4 h-4" />}>Save Changes</Button>
            </form>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
