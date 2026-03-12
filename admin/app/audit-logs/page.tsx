'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { api } from '@/lib/api';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<any>('/admin/audit-logs')
      .then((res) => setLogs(res.data?.data || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: 'created_at',
      header: 'Time',
      render: (row: any) => new Date(row.created_at).toLocaleString(),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (row: any) => row.users?.full_name || row.actor_id || 'System',
    },
    { key: 'action', header: 'Action' },
    { key: 'entity', header: 'Entity' },
    {
      key: 'entity_id',
      header: 'Entity ID',
      render: (row: any) =>
        row.entity_id ? `${row.entity_id.slice(0, 8)}...` : '—',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="All platform activity for compliance and debugging"
      />
      <DataTable columns={columns} data={logs} loading={loading} />
    </div>
  );
}
