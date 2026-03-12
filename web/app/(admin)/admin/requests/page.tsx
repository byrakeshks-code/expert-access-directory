'use client';
import { AdminRedirect } from '../admin-redirect';
export default function AdminRequestsPage() {
  return <AdminRedirect title="Request Management" description="View all access requests, conversations, and actions" adminPath="/requests" />;
}
