'use client';
import { AdminRedirect } from '../admin-redirect';
export default function AdminUsersPage() {
  return <AdminRedirect title="User Management" description="View, edit, and create user accounts" adminPath="/users" />;
}
