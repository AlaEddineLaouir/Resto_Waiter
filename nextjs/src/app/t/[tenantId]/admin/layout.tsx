'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { PermissionProvider } from '@/lib/permissions';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions?: string[];
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[]; // Optional: only show to these roles
  permission?: string; // Permission required to see this item
}

interface NavSection {
  title: string;
  items: NavItem[];
  roles?: string[]; // Optional: only show section to these roles
  permissions?: string[]; // Any of these permissions grants access to section
}

// Icons as components for cleaner code
const Icons = {
  home: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  building: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
  location: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  ),
  beaker: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 15.5m14.8-.2l.054.135A2.25 2.25 0 0117.75 18H6.25a2.25 2.25 0 01-2.104-3.065l.054-.135" />
    </svg>
  ),
  clipboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  ),
  clock: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  bars: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  ),
  book: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  adjustments: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
    </svg>
  ),
  eye: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const tenantId = params.tenantId as string;

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/auth/me');
        if (!res.ok) {
          if (!pathname.includes('/login')) {
            router.push(`/t/${tenantId}/admin/login`);
          }
          setLoading(false);
          return;
        }
        const data = await res.json();
        
        // Tenant isolation: verify the session tenant matches the URL tenant
        const sessionTenantSlug = data.tenantSlug || data.admin?.tenant?.slug;
        if (sessionTenantSlug && sessionTenantSlug !== tenantId) {
          // User is logged into a different tenant - redirect to login
          console.warn(`Tenant mismatch: session=${sessionTenantSlug}, url=${tenantId}`);
          if (!pathname.includes('/login')) {
            router.push(`/t/${tenantId}/admin/login`);
          }
          setLoading(false);
          return;
        }
        
        console.log('[DEBUG] Admin data:', data.admin);
        setAdmin(data.admin);
      } catch {
        if (!pathname.includes('/login')) {
          router.push(`/t/${tenantId}/admin/login`);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, tenantId, pathname]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push(`/t/${tenantId}/admin/login`);
  };

  // Don't show sidebar on login page
  if (pathname.includes('/login')) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-sm text-[#6B7280]">Loading...</p>
        </div>
      </div>
    );
  }

  // Get user permissions from admin data
  const userPermissions = admin?.permissions || [];
  
  // Helper to check if user has permission (owner has all permissions)
  const hasPermission = (permission: string): boolean => {
    if (!admin) return false;
    if (admin.role === 'owner') return true;
    return userPermissions.includes(permission);
  };

  const navSections: NavSection[] = [
    {
      title: 'Dashboard',
      items: [
        { name: 'Overview', href: `/t/${tenantId}/admin`, icon: Icons.home, permission: 'dashboard.read' },
      ],
    },
    {
      title: 'Organization',
      permissions: ['brands.read', 'locations.read'],
      items: [
        { name: 'Brands', href: `/t/${tenantId}/admin/brands`, icon: Icons.building, permission: 'brands.read' },
        { name: 'Locations', href: `/t/${tenantId}/admin/locations`, icon: Icons.location, permission: 'locations.read' },
      ],
    },
    {
      title: 'Menu Structure',
      permissions: ['menus.read', 'sections.read', 'items.read', 'ingredients.read'],
      items: [
        { name: 'Menus', href: `/t/${tenantId}/admin/menus`, icon: Icons.clipboard, permission: 'menus.read' },
        { name: 'Sections', href: `/t/${tenantId}/admin/sections`, icon: Icons.bars, permission: 'sections.read' },
        { name: 'Items', href: `/t/${tenantId}/admin/items`, icon: Icons.book, permission: 'items.read' },
        { name: 'Ingredients', href: `/t/${tenantId}/admin/ingredients`, icon: Icons.beaker, permission: 'ingredients.read' },
      ],
    },
    {
      title: 'Customizations',
      permissions: ['option-groups.read'],
      items: [
        { name: 'Option Groups', href: `/t/${tenantId}/admin/option-groups`, icon: Icons.adjustments, permission: 'option-groups.read' },
      ],
    },
    {
      title: 'Team',
      permissions: ['users.read'],
      items: [
        { name: 'Users & Staff', href: `/t/${tenantId}/admin/users`, icon: Icons.users, permission: 'users.read' },
      ],
      roles: ['owner', 'manager'], // Only visible to owners and managers
    },
  ];

  // Filter sections and items based on permissions
  const filteredNavSections = navSections
    .filter((section) => {
      // Role-based check
      if (section.roles && admin && !section.roles.includes(admin.role)) return false;
      // Permission-based check for section
      if (section.permissions && !section.permissions.some(p => hasPermission(p))) return false;
      return true;
    })
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // Role-based check
        if (item.roles && admin && !item.roles.includes(admin.role)) return false;
        // Permission-based check
        if (item.permission && !hasPermission(item.permission)) return false;
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0); // Remove empty sections

  const isActive = (href: string) => {
    if (href === `/t/${tenantId}/admin`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const getPageTitle = () => {
    for (const section of navSections) {
      for (const item of section.items) {
        if (isActive(item.href)) {
          return item.name;
        }
      }
    }
    return 'Dashboard';
  };

  return (
    <PermissionProvider tenantId={tenantId}>
    <div className="min-h-screen bg-[#F9FAFB] flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        } bg-white border-r border-[#E5E7EB] flex flex-col transition-all duration-200 ease-in-out fixed h-full z-30`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">M</span>
            </div>
            {!sidebarCollapsed && (
              <span className="font-semibold text-[#111827] truncate">Menu Admin</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {filteredNavSections.map((section, idx) => (
            <div key={section.title} className={idx > 0 ? 'mt-6' : ''}>
              {!sidebarCollapsed && (
                <h3 className="px-3 mb-2 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                  {section.title}
                </h3>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? 'bg-indigo-50 text-indigo-600'
                            : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]'
                        }`}
                        title={sidebarCollapsed ? item.name : undefined}
                      >
                        <span className={active ? 'text-indigo-600' : 'text-[#9CA3AF]'}>
                          {item.icon}
                        </span>
                        {!sidebarCollapsed && <span>{item.name}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-[#E5E7EB]">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] rounded-lg transition-colors"
          >
            {sidebarCollapsed ? Icons.chevronRight : Icons.chevronLeft}
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* User Section */}
        {admin && (
          <div className="p-3 border-t border-[#E5E7EB]">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-medium text-sm">
                  {admin.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111827] truncate">
                    {admin.username || admin.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-[#6B7280] truncate capitalize">{admin.role}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen ${sidebarCollapsed ? 'ml-[72px]' : 'ml-64'} transition-all duration-200`}>
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-[#111827]">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden md:block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                {Icons.search}
              </span>
              <input
                type="text"
                placeholder="Search..."
                className="w-64 pl-10 pr-4 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[#F9FAFB]"
              />
            </div>

            <div className="h-6 w-px bg-[#E5E7EB]"></div>

            {/* View Menu */}
            <Link
              href={`/t/${tenantId}/menu`}
              target="_blank"
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] rounded-lg transition-colors"
            >
              {Icons.eye}
              <span className="hidden sm:inline">View Menu</span>
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              {Icons.logout}
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
    </PermissionProvider>
  );
}
