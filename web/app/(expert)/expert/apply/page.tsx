'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Upload, CheckCircle, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/shared/page-transition';
import { cn, toArray } from '@/lib/utils';

interface Domain {
  id: string;
  name: string;
}

interface SubProblem {
  id: string;
  label?: string;
  name?: string;
  slug: string;
}

type Step = 0 | 1 | 2 | 3 | 4;

export default function ExpertApplyPage() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [subProblems, setSubProblems] = useState<SubProblem[]>([]);

  // Form state
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [domainId, setDomainId] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [languages, setLanguages] = useState('');
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [fee, setFee] = useState('49');
  const [currency, setCurrency] = useState('INR');
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    api.get<any>('/domains')
      .then((res) => setDomains(toArray(res)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (domainId) {
      api.get<any>(`/domains/${domainId}/sub-problems`)
        .then((res) => setSubProblems(toArray(res)))
        .catch(() => setSubProblems([]));
    }
  }, [domainId]);

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const selectedDomain = domains.find((d) => String(d.id) === domainId);
      await api.post('/experts/apply', {
        headline,
        bio,
        primary_domain: selectedDomain?.name || domainId,
        years_of_experience: Number(yearsExp) || 0,
        city,
        country,
        languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
        access_fee_minor: Math.round(Number(fee)) || 0,
        access_fee_currency: currency,
      });

      // Add specializations (batch)
      if (selectedSpecs.length > 0) {
        await api.post('/experts/me/specializations', {
          sub_problem_ids: selectedSpecs.map(Number),
        }).catch(() => {});
      }

      // Upload documents
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', 'portfolio');
        await api.upload('/experts/me/documents', formData).catch(() => {});
      }

      await refreshProfile();
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Application failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = ['Profile', 'Specializations', 'Pricing', 'Documents', 'Done'];

  return (
    <PageTransition>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Become an Expert</h1>
            <p className="text-muted text-sm">Complete your application in a few steps</p>
          </div>
        </div>

        {/* Progress bar */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-2">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div key={i} className={cn('flex-1 h-1.5 rounded-full transition-colors', i <= step ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-border')} />
            ))}
          </div>
          <p className="text-sm text-muted">Step {step + 1} of {steps.length}: {steps[step]}</p>
        </motion.div>

        {error && (
          <div className="px-4 py-3 bg-error-light border border-error/20 rounded-xl text-sm text-error">{error}</div>
        )}

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface-elevated border border-border rounded-2xl p-6">
          <AnimatePresence mode="wait">
            {/* Step 0: Profile basics */}
            {step === 0 && (
              <motion.div key="0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <Input label="Headline" placeholder="e.g., Senior Tax Consultant with 15+ years" value={headline} onChange={(e) => setHeadline(e.target.value)} />
                <Textarea label="Bio" placeholder="Tell potential clients about your expertise..." value={bio} onChange={(e) => setBio(e.target.value)} charCount={bio.length} maxChars={2000} rows={4} />
                <Select label="Primary Domain" options={domains.map((d) => ({ value: d.id, label: d.name }))} placeholder="Select domain" value={domainId} onChange={(e) => setDomainId(e.target.value)} />
                <Input label="Years of Experience" type="number" value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
                  <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <Input label="Languages" placeholder="English, Hindi, Tamil" value={languages} onChange={(e) => setLanguages(e.target.value)} hint="Comma-separated" />
              </motion.div>
            )}

            {/* Step 1: Specializations */}
            {step === 1 && (
              <motion.div key="1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-sm text-muted">Select the guidance areas you can help with:</p>
                {subProblems.length === 0 ? (
                  <p className="text-sm text-subtle py-4 text-center">Select a domain first (go back to step 1)</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {subProblems.map((sp) => {
                      const selected = selectedSpecs.includes(sp.id);
                      return (
                        <button
                          key={sp.id}
                          onClick={() => {
                            setSelectedSpecs((prev) =>
                              selected ? prev.filter((id) => id !== sp.id) : [...prev, sp.id],
                            );
                          }}
                          className={cn(
                            'px-4 py-2 text-sm font-medium rounded-full border transition-all',
                            selected ? 'bg-primary text-white border-primary' : 'bg-transparent text-muted border-border hover:border-muted',
                          )}
                        >
                          {sp.label || sp.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Pricing */}
            {step === 2 && (
              <motion.div key="2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-sm text-muted">Set your one-time access fee:</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Input label="Access Fee (₹)" type="number" placeholder="49" value={fee} onChange={(e) => setFee(e.target.value)} />
                  </div>
                  <Select label="Currency" options={[{ value: 'INR', label: 'INR' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]} value={currency} onChange={(e) => setCurrency(e.target.value)} />
                </div>
                <p className="text-xs text-subtle">This is the one-time fee users pay to access you. Minimum ₹49.</p>
              </motion.div>
            )}

            {/* Step 3: Documents */}
            {step === 3 && (
              <motion.div key="3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-sm text-muted">Upload verification documents (ID, degree, license, portfolio):</p>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-8 cursor-pointer hover:border-primary transition-colors">
                  <Upload className="w-8 h-8 text-muted mb-2" />
                  <span className="text-sm text-muted">Click or drag files here</span>
                  <input type="file" multiple className="hidden" onChange={handleFileAdd} accept="image/*,.pdf" />
                </label>
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-surface rounded-xl">
                        <span className="text-sm text-foreground truncate">{f.name}</span>
                        <button onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted hover:text-error">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Done */}
            {step === 4 && (
              <motion.div key="4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                  <CheckCircle className="w-20 h-20 text-success mx-auto mb-4" />
                </motion.div>
                <h2 className="text-2xl font-bold text-foreground">Application Submitted!</h2>
                <p className="text-muted mt-2 max-w-xs mx-auto">
                  Your application is under review. We&apos;ll notify you once it&apos;s approved.
                </p>
                <Button onClick={() => router.push('/expert/dashboard')} className="mt-6">
                  Go to Dashboard
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Navigation */}
        {step < 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((step - 1) as Step)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            )}
            <div className="flex-1" />
            {step < 3 ? (
              <Button onClick={() => setStep((step + 1) as Step)} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} isLoading={isSubmitting}>
                Submit Application
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
