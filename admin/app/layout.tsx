import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { AdminShell } from '@/components/admin-shell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Expert Access Directory — Admin',
  description: 'Admin panel for the Expert Access Directory Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <AdminShell>{children}</AdminShell>
        </Providers>
      </body>
    </html>
  );
}
