'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FolderTree,
  FileText,
  FileCheck,
  CreditCard,
  RotateCcw,
  Star,
  Crown,
  Settings,
  ScrollText,
  Image,
  LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/experts', label: 'Experts', icon: UserCheck },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/domains', label: 'Domains', icon: FolderTree },
  { href: '/verification-docs', label: 'Verification Docs', icon: FileCheck },
  { href: '/requests', label: 'Requests', icon: FileText },
  { href: '/refunds', label: 'Refunds', icon: RotateCcw },
  { href: '/reviews', label: 'Reviews', icon: Star },
  // { href: '/subscriptions', label: 'Subscriptions', icon: Crown }, // Hidden: subscription module disabled for now
  { href: '/media', label: 'Media Manager', icon: Image },
  { href: '/config', label: 'Config', icon: Settings },
  { href: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-lg font-bold tracking-tight">Expert Access</h1>
        <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white border-r-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-2 py-2 text-sm text-gray-400 hover:text-white w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
