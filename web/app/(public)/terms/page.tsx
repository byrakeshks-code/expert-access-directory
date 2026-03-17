'use client';

import { motion } from 'framer-motion';
import { PageTransition } from '@/components/shared/page-transition';
import { FileText } from 'lucide-react';

const sections = [
  {
    title: '1. Introduction',
    content: `Welcome to Loop-Ex (https://loop-ex.com/). By accessing our website, you agree to be bound by these Terms and Conditions. Loop-Ex is a listing platform that facilitates connections between users and experts in various domains (Legal, Real Estate, Art, Tech, etc.).`,
  },
  {
    title: '2. Nature of Service',
    content: 'Loop-Ex provides a communication bridge. We charge a "Platform Connection Fee" to enable users to message an expert.',
    bullets: [
      'We do not provide professional advice.',
      'We do not participate in the actual professional services rendered by the expert.',
      'We do not process payments for the expert\u2019s professional services; these are handled offline or via third-party methods agreed upon by both parties.',
    ],
  },
  {
    title: '3. Platform Connection Fee & Payments',
    bullets: [
      'Users must pay a non-refundable (except as noted in Section 4) Platform Fee via Razorpay to initiate contact.',
      'This fee is solely for the \u201Cconnection\u201D and does not contribute toward the expert\u2019s professional service charges.',
    ],
  },
  {
    title: '4. Refund Policy',
    bullets: [
      '48-Hour Window: If the listed expert fails to reply to your initial inquiry within 48 hours of the payment, you are eligible for a full refund of the Platform Fee.',
      'No Refund Post-Reply: Once the expert sends a reply/response through the platform, the connection is considered \u201Cestablished,\u201D and the Platform Fee becomes non-refundable, regardless of whether a business deal is reached.',
    ],
  },
  {
    title: '5. Interaction and Offline Transactions',
    bullets: [
      'Once a reply is received, Loop-Ex ceases to intervene.',
      'Any service charges, project scopes, or professional fees agreed upon between the user and the expert are private contracts.',
      'While our platform allows users to upload \u201CProof of Payment\u201D for record-keeping, Loop-Ex is not responsible for the verification, security, or success of these offline transactions.',
    ],
  },
  {
    title: '6. Limitation of Liability',
    content:
      'Loop-Ex is not liable for any losses, damages, or disputes arising from the professional relationship between the user and the expert. We do not guarantee the quality or accuracy of the expert\u2019s work.',
  },
];

export default function TermsPage() {
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold text-foreground"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Terms and Conditions
            </h1>
          </div>
          <p className="text-sm text-muted mb-8 ml-[52px]">
            Effective Date: 17th March 2026
          </p>

          <div className="space-y-5">
            {sections.map((s) => (
              <div
                key={s.title}
                className="bg-surface-elevated border border-border rounded-2xl p-6"
              >
                <h2 className="text-lg font-bold text-foreground mb-3">{s.title}</h2>
                {s.content && (
                  <p className="text-sm text-muted leading-relaxed">{s.content}</p>
                )}
                {s.bullets && (
                  <ul className="mt-2 space-y-2">
                    {s.bullets.map((b, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted leading-relaxed">
                        <span className="text-primary mt-1 shrink-0">&bull;</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
