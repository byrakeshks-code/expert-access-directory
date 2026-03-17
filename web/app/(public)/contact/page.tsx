'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/shared/page-transition';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Globe,
  Shield,
  FileText,
  RotateCcw,
  Building2,
} from 'lucide-react';

const contactDetails = [
  {
    icon: Mail,
    label: 'Email',
    value: 'info@loop-ex.com',
    href: 'mailto:info@loop-ex.com',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+91 6363643136',
    href: 'tel:+916363643136',
  },
  {
    icon: MapPin,
    label: 'Address',
    value:
      '2nd Floor, No.4, Kalleshwara Mansion, Opp. to South Indian Bank, Near Indian Oil Petrol Pump, Chandapura Main Road, Anekal, Karnataka 562106',
  },
  {
    icon: Clock,
    label: 'Business Hours',
    value: 'Monday \u2013 Saturday, 10:00 AM \u2013 6:00 PM IST',
  },
  {
    icon: Globe,
    label: 'Website',
    value: 'https://loop-ex.com',
    href: 'https://loop-ex.com',
  },
];

const policyLinks = [
  { icon: FileText, label: 'Terms and Conditions', href: '/terms' },
  { icon: Shield, label: 'Privacy Policy', href: '/privacy' },
  { icon: RotateCcw, label: 'Refund and Cancellation Policy', href: '/refund-policy' },
];

export default function ContactPage() {
  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold text-foreground"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Contact Us
            </h1>
          </div>
          <p className="text-sm text-muted mb-10 ml-[52px]">
            Have a question or need assistance? Reach out to us through any of the channels below.
          </p>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Contact Details */}
            <div className="space-y-5">
              <div className="bg-surface-elevated border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-5">Get in Touch</h2>
                <div className="space-y-5">
                  {contactDetails.map((item) => (
                    <div key={item.label} className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-0.5">
                          {item.label}
                        </p>
                        {item.href ? (
                          <a
                            href={item.href}
                            className="text-sm text-foreground font-medium hover:text-primary transition-colors"
                          >
                            {item.value}
                          </a>
                        ) : (
                          <p className="text-sm text-foreground font-medium leading-relaxed">
                            {item.value}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Policies */}
              <div className="bg-surface-elevated border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Our Policies</h2>
                <div className="space-y-3">
                  {policyLinks.map((p) => (
                    <Link
                      key={p.href}
                      href={p.href}
                      className="flex items-center gap-3 text-sm text-muted hover:text-primary transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <p.icon className="w-4 h-4 text-primary" />
                      </div>
                      {p.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column: Map + About */}
            <div className="space-y-5">
              {/* Map */}
              <div className="bg-surface-elevated border border-border rounded-2xl overflow-hidden">
                <iframe
                  title="Loop-Ex Office Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3890.051!2d77.6827!3d12.8074!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDQ4JzI2LjYiTiA3N8KwNDAnNTcuNyJF!5e0!3m2!1sen!2sin!4v1710000000000!5m2!1sen!2sin&q=Kalleshwara+Mansion+Chandapura+Main+Road+Anekal+Karnataka+562106"
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

            </div>
          </div>

          {/* About the Business — full width */}
          <div className="bg-surface-elevated border border-border rounded-2xl p-6 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">About Loop-Ex</h2>
            </div>
            <p className="text-sm text-muted leading-relaxed mb-4">
              Loop-Ex is an online platform that connects users with verified domain experts
              across Legal, Real Estate, Technology, Finance, Healthcare, and more. We operate
              on a connection-based model &mdash; users pay a one-time Platform Connection Fee
              to initiate communication with a listed expert.
            </p>
            <p className="text-sm text-muted leading-relaxed">
              We do not provide professional advice or consultation ourselves. Our role is
              limited to facilitating the initial connection. All professional engagements,
              fees, and deliverables are agreed upon directly between the user and the expert.
            </p>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
