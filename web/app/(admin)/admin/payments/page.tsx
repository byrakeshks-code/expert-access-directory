'use client';
import { AdminRedirect } from '../admin-redirect';
export default function AdminPaymentsPage() {
  return <AdminRedirect title="Payments" description="View all payment records and transactions" adminPath="/payments" />;
}
