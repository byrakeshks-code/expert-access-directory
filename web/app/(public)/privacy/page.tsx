'use client';

import { motion } from 'framer-motion';
import { PageTransition } from '@/components/shared/page-transition';
import { Shield } from 'lucide-react';

const sections = [
  {
    title: '1. Information We Collect',
    bullets: [
      'User Data: Name, email address, and contact details provided during registration.',
      'Transaction Data: We collect details of the Platform Fee paid via Razorpay (transaction ID, amount). We do not store your credit card or bank details on our servers.',
      'Communication Data: Inquiries sent through the platform to enable the connection.',
      'Uploaded Documents: If you choose to use our \u201CProof of Payment\u201D feature for your offline records, we store those files securely on your behalf.',
    ],
  },
  {
    title: '2. How We Use Your Information',
    bullets: [
      'To facilitate the connection between you and the expert.',
      'To process refunds via Razorpay if the 48-hour response window is missed.',
      'To maintain records of service charge agreements for your future reference.',
    ],
  },
  {
    title: '3. Third-Party Sharing',
    bullets: [
      'Experts: Your contact details and inquiry are shared with the expert you choose to connect with.',
      'Payment Gateways: Your payment information is processed by Razorpay, a secure third-party payment aggregator.',
      'No Selling of Data: We do not sell your personal data to third-party marketing companies.',
    ],
  },
  {
    title: '4. Data Security',
    content:
      'We implement industry-standard security measures to protect your information. However, since transactions for expert services happen \u201Coffline\u201D or outside our platform, Loop-Ex is not responsible for the security of data shared directly between the user and the expert via external channels (WhatsApp, Email, etc.).',
  },
  {
    title: '5. User Rights',
    content:
      'You have the right to request the deletion of your account and personal data at any time, provided there are no pending disputes or active 48-hour refund windows.',
  },
  {
    title: '6. Cookies',
    content:
      'Our website uses cookies to enhance user experience and analyze site traffic to improve our listing services.',
  },
];

export default function PrivacyPage() {
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
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold text-foreground"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Privacy Policy
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
