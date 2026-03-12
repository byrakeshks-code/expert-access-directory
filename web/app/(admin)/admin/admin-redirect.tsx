'use client';

import { Card } from '@/components/ui/card';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface AdminRedirectProps {
  title: string;
  description: string;
  adminPath: string;
}

export function AdminRedirect({ title, description, adminPath }: AdminRedirectProps) {
  const fullUrl = `http://localhost:3001${adminPath}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Admin Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-muted mt-1">{description}</p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-foreground mb-4">
          This section is available in the full Admin Panel for detailed management.
        </p>
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
        >
          Open {title} <ExternalLink className="w-4 h-4" />
        </a>
      </Card>
    </div>
  );
}
