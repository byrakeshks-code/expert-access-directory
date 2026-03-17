'use client';

import Link from 'next/link';

const footerLinks = [
  {
    title: 'Platform',
    links: [
      { label: 'Find Experts', href: '/search' },
      { label: 'Become an Expert', href: '/expert/apply' },
      // { label: 'Pricing', href: '/#pricing' }, // Hidden: subscription module disabled for now
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '#' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'FAQ', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Refund Policy', href: '/refund-policy' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-surface border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="Loop Ex" className="w-8 h-8 rounded-lg object-contain" />
              <span className="font-bold text-foreground">Loop Ex</span>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              Find the right expert for your query. Verified professionals, secure payments, guaranteed responses.
            </p>
          </div>

          {/* Links */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold text-foreground mb-3">{group.title}</h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-sm text-subtle">
            &copy; {new Date().getFullYear()} Loop Ex. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
