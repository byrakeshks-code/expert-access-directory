'use client';

import { motion } from 'framer-motion';
import { PageTransition } from '@/components/shared/page-transition';
import { Shield, FileText, RotateCcw } from 'lucide-react';

const ICONS = {
  shield: Shield,
  file: FileText,
  refund: RotateCcw,
} as const;

type PolicyPageShellProps = {
  title: string;
  icon: keyof typeof ICONS;
  children: React.ReactNode;
};

export function PolicyPageShell({ title, icon, children }: PolicyPageShellProps) {
  const Icon = ICONS[icon];
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold text-foreground"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {title}
            </h1>
          </div>
          <div className="bg-surface-elevated border border-border rounded-2xl p-6 sm:p-8">
            <div className="text-sm text-muted leading-relaxed whitespace-pre-wrap font-sans">
              {children}
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
