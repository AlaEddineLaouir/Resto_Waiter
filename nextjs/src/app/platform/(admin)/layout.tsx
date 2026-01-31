'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/platform/auth/me');
        if (res.ok) {
          const data = await res.json();
          setAdmin(data.admin);
        } else {
          router.push('/platform');
        }
      } catch {
        router.push('/platform');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/platform/auth/logout', { method: 'POST' });
    router.push('/platform');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  const navItems = [
    { href: '/platform/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/platform/restaurants', label: 'Restaurants', icon: '🍽️' },
    { href: '/platform/plans', label: 'Plans', icon: '💳' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold">🍽️ Menu AI</h1>
          <p className="text-slate-400 text-sm mt-1">Platform Admin</p>
        </div>

        <nav className="p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                pathname === item.href
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{admin.name || admin.email}</p>
              <p className="text-slate-400 text-xs">{admin.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-white transition-colors"
              title="Logout"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
