import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: {
    default: 'Expert Access Directory — Find the Right Expert',
    template: '%s | Expert Access',
  },
  description: 'Find verified experts for your query. Secure payments, guaranteed responses, and trusted professionals.',
  keywords: ['expert', 'consultation', 'directory', 'professional advice', 'find expert'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'),
  openGraph: {
    type: 'website',
    title: 'Expert Access Directory',
    description: 'Find the right expert for your query. Verified professionals, secure payments.',
    siteName: 'Expert Access Directory',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Expert Access Directory',
    description: 'Find the right expert for your query.',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#4F46E5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
