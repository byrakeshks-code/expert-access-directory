'use client';
import { AdminRedirect } from '../admin-redirect';
export default function AdminConfigPage() {
  return <AdminRedirect title="Platform Config" description="Manage platform settings and feature toggles" adminPath="/config" />;
}
