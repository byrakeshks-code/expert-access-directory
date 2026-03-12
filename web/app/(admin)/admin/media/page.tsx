'use client';
import { AdminRedirect } from '../admin-redirect';
export default function AdminMediaPage() {
  return <AdminRedirect title="Media Manager" description="Upload, rename, and manage platform media files" adminPath="/media" />;
}
