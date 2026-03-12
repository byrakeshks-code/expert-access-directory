'use client';
import { AdminRedirect } from '../admin-redirect';
export default function AdminAuditLogsPage() {
  return <AdminRedirect title="Audit Logs" description="Platform activity and change history" adminPath="/audit-logs" />;
}
