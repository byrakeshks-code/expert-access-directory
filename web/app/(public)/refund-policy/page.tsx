'use client';

import { motion } from 'framer-motion';
import { PageTransition } from '@/components/shared/page-transition';
import { RotateCcw } from 'lucide-react';

const sections = [
  {
    title: '1. The Connection Fee',
    content:
      'The fee paid on our platform is a Platform Connection Fee. This fee is charged solely for the service of facilitating a communication bridge between you (the User) and a listed Expert. This fee does not cover any professional services, consultations, or advice provided by the Expert.',
  },
  {
    title: '2. Refund Eligibility (The 48-Hour Rule)',
    content:
      'We value your time and investment. You are eligible for a full refund of the Platform Connection Fee under the following condition:',
    bullets: [
      'No Response: If the Expert you have contacted fails to send an initial reply/response through the Loop-Ex platform within 48 hours of your successful payment.',
    ],
  },
  {
    title: '3. Non-Refundable Scenarios',
    content:
      'Once a connection is successfully established, the platform fee is considered \u201Cearned\u201D by Loop-Ex. No refunds will be issued in the following cases:',
    bullets: [
      'Expert Responds: As soon as the Expert sends a reply to your inquiry within the 48-hour window, the fee becomes non-refundable.',
      'Disagreement on Fees: Loop-Ex does not intervene in offline service charge negotiations. If you and the Expert cannot agree on professional fees after the connection is made, the platform fee remains non-refundable.',
      'Quality of Service: Since the professional consultation happens offline and outside our intervention, we do not offer refunds based on the quality, accuracy, or outcome of the Expert\u2019s advice.',
      'Change of Mind: Refunds are not provided if you decide you no longer need the consultation after the Expert has already replied.',
    ],
  },
  {
    title: '4. Refund Process',
    bullets: [
      'If no response is received within the 48-hour window, the refund will be processed automatically or can be claimed by contacting our support team.',
      'Refunds are credited back to the original payment method used via Razorpay.',
      'Once initiated, the refund may take 5\u20137 business days to reflect in your account, depending on your bank\u2019s processing time.',
    ],
  },
  {
    title: '5. Cancellation Policy',
    content:
      'Users can cancel their inquiry at any time before the Expert replies. However, a refund will only be triggered if the 48-hour window expires without a response from the Expert. Once an Expert replies, the \u201CLoop\u201D is closed, and the transaction is final.',
  },
];

export default function RefundPolicyPage() {
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
              <RotateCcw className="w-5 h-5 text-primary" />
            </div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold text-foreground"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Refund and Cancellation Policy
            </h1>
          </div>
          <p className="text-sm text-muted mb-2 ml-[52px]">
            Effective Date: 17th March 2026
          </p>
          <p className="text-sm text-muted leading-relaxed mb-8 ml-[52px]">
            At Loop-Ex (https://loop-ex.com/), we strive to provide a seamless connection
            between users and domain experts. Our platform operates on a
            &ldquo;Connection-Based&rdquo; model. Please read our refund policy carefully
            before initiating a payment.
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
