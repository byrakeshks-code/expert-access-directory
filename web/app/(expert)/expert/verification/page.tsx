'use client';

import { useEffect, useState } from 'react';
import { FileText, CheckCircle, Clock, XCircle, Upload, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, cn, toArray } from '@/lib/utils';
import { VERIFICATION_STATUS_COLORS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from '@/components/ui/skeleton';
import { PageTransition } from '@/components/shared/page-transition';

interface VerificationDoc {
  id: string;
  doc_type: string;
  file_url: string;
  status: string;
  reviewer_notes?: string;
  created_at: string;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export default function VerificationPage() {
  const { expertProfile } = useAuth();
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/experts/me/documents')
      .then((res) => setDocs(toArray(res)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusConfig = {
    pending: { icon: Clock, color: 'text-warning' },
    approved: { icon: CheckCircle, color: 'text-success' },
    rejected: { icon: XCircle, color: 'text-error' },
  };

  const verificationStatus = expertProfile?.verification_status || 'pending';
  const vColors = VERIFICATION_STATUS_COLORS[verificationStatus as keyof typeof VERIFICATION_STATUS_COLORS] || VERIFICATION_STATUS_COLORS.pending;

  const handleReUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('document', file);
    formData.append('doc_type', 'portfolio');
    try {
      const newDoc = await api.upload<VerificationDoc>('/experts/me/documents', formData);
      setDocs((prev) => [...prev, newDoc]);
    } catch {}
  };

  return (
    <PageTransition>
      <motion.div
        className="max-w-2xl mx-auto space-y-6"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1
              className="text-2xl font-extrabold text-foreground"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Verification Status
            </h1>
            <p className="text-muted text-sm">Track your expert verification progress</p>
          </div>
        </motion.div>

        {/* Current status */}
        <motion.div
          variants={fadeUp}
          className="bg-surface-elevated border border-border rounded-2xl p-4 flex items-center gap-4"
        >
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', vColors.bg)}>
            {verificationStatus === 'verified' ? (
              <CheckCircle className={cn('w-6 h-6', vColors.text)} />
            ) : verificationStatus === 'rejected' ? (
              <XCircle className={cn('w-6 h-6', vColors.text)} />
            ) : (
              <Clock className={cn('w-6 h-6', vColors.text)} />
            )}
          </div>
          <div>
            <Badge className={cn(vColors.bg, vColors.text)}>{vColors.label}</Badge>
            <p className="text-sm text-muted mt-1">
              {verificationStatus === 'verified'
                ? 'Your profile is verified and visible to users.'
                : verificationStatus === 'rejected'
                ? 'Your application was rejected. Please review the notes below.'
                : 'Your application is being reviewed by our team.'}
            </p>
          </div>
        </motion.div>

        {/* Documents list */}
        <motion.div variants={fadeUp}>
          <h2 className="text-lg font-semibold text-foreground mb-4">Submitted Documents</h2>
          {loading ? (
            <ListSkeleton rows={3} />
          ) : docs.length === 0 ? (
            <div className="bg-surface-elevated border border-border rounded-2xl text-center py-8">
              <FileText className="w-8 h-8 text-muted mx-auto mb-2" />
              <p className="text-muted">No documents submitted yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => {
                const config = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.pending;
                const Icon = config.icon;
                return (
                  <div
                    key={doc.id}
                    className="bg-surface-elevated border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={cn('w-5 h-5 mt-0.5', config.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground capitalize">{(doc.doc_type || 'document').replace(/_/g, ' ')}</p>
                          <span className="text-xs text-muted">{formatDate(doc.created_at)}</span>
                        </div>
                        {doc.reviewer_notes && (
                          <div className="flex items-start gap-2 mt-2 px-3 py-2 bg-warning-light rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-warning">{doc.reviewer_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Re-upload */}
        {verificationStatus === 'rejected' && (
          <motion.div
            variants={fadeUp}
            className="bg-surface-elevated border border-border rounded-2xl p-6"
          >
            <h3 className="text-sm font-semibold text-foreground mb-3">Upload New Document</h3>
            <label className="flex items-center justify-center border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary transition-colors">
              <Upload className="w-6 h-6 text-muted mr-2" />
              <span className="text-sm text-muted">Click to upload</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleReUpload} />
            </label>
          </motion.div>
        )}
      </motion.div>
    </PageTransition>
  );
}
