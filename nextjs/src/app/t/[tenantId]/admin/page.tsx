'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface DashboardData {
  stats: {
    totalBrands: number;
    totalLocations: number;
    totalMenus: number;
    totalItems: number;
    todayChatSessions: number;
    monthlyChatSessions: number;
  };
}

// Icons
const Icons = {
  building: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
  location: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  ),
  menu: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  ),
  book: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  plus: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  sections: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  ),
  rocket: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
  eye: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  chat: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  ),
  chart: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  arrow: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
};

export default function RestaurantAdminDashboard() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashRes = await fetch('/api/admin/dashboard');
        if (dashRes.ok) {
          const dashData = await dashRes.json();
          setDashboard(dashData);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const stats = [
    { label: 'Brands', value: dashboard?.stats.totalBrands || 0, icon: Icons.building, color: 'bg-indigo-50 text-indigo-600', href: `/t/${tenantId}/admin/brands` },
    { label: 'Locations', value: dashboard?.stats.totalLocations || 0, icon: Icons.location, color: 'bg-emerald-50 text-emerald-600', href: `/t/${tenantId}/admin/locations` },
    { label: 'Menus', value: dashboard?.stats.totalMenus || 0, icon: Icons.menu, color: 'bg-amber-50 text-amber-600', href: `/t/${tenantId}/admin/menus` },
    { label: 'Menu Items', value: dashboard?.stats.totalItems || 0, icon: Icons.book, color: 'bg-violet-50 text-violet-600', href: `/t/${tenantId}/admin/items` },
  ];

  const quickActions = [
    { label: 'Add New Item', description: 'Create a new menu item', href: `/t/${tenantId}/admin/items`, icon: Icons.plus },
    { label: 'Manage Sections', description: 'Organize your menu sections', href: `/t/${tenantId}/admin/sections`, icon: Icons.sections },
    { label: 'Manage Menus', description: 'Create and publish menus', href: `/t/${tenantId}/admin/menus`, icon: Icons.rocket },
    { label: 'View Live Menu', description: 'See your public menu', href: `/t/${tenantId}/menu`, icon: Icons.eye, external: true },
  ];

  const steps = [
    { title: 'Create a Brand', desc: 'Set up your restaurant brand with logo and details', done: (dashboard?.stats.totalBrands || 0) > 0 },
    { title: 'Add a Menu', desc: 'Create menus like Lunch or Dinner', done: (dashboard?.stats.totalMenus || 0) > 0 },
    { title: 'Create Sections', desc: 'Organize items into sections like Appetizers, Main Courses', done: false },
    { title: 'Add Menu Items', desc: 'Add dishes with prices, descriptions, allergens and dietary info', done: (dashboard?.stats.totalItems || 0) > 0 },
    { title: 'Publish Your Menu', desc: 'Set your menu to published status for customers to see', done: false },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-semibold mb-2">Welcome to your Menu Dashboard</h1>
        <p className="text-indigo-100 text-sm">Manage your restaurant menu, items, and settings all in one place.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-lg p-5 border border-[#E5E7EB] hover:border-indigo-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`w-11 h-11 rounded-lg flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </span>
              <span className="text-[#D1D5DB] group-hover:text-indigo-400 transition-colors">
                {Icons.arrow}
              </span>
            </div>
            <p className="text-3xl font-semibold text-[#111827]">{stat.value}</p>
            <p className="text-sm text-[#6B7280] mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Chat Sessions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-5 border border-[#E5E7EB]">
          <div className="flex items-center gap-4">
            <span className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              {Icons.chat}
            </span>
            <div>
              <p className="text-sm text-[#6B7280]">Chat Sessions Today</p>
              <p className="text-2xl font-semibold text-[#111827]">{dashboard?.stats.todayChatSessions || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-5 border border-[#E5E7EB]">
          <div className="flex items-center gap-4">
            <span className="w-11 h-11 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              {Icons.chart}
            </span>
            <div>
              <p className="text-sm text-[#6B7280]">Chat Sessions This Month</p>
              <p className="text-2xl font-semibold text-[#111827]">{dashboard?.stats.monthlyChatSessions || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-[#111827] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              target={action.external ? '_blank' : undefined}
              className="bg-white rounded-lg p-5 border border-[#E5E7EB] hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <span className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-3">
                {action.icon}
              </span>
              <h3 className="font-medium text-[#111827] group-hover:text-indigo-600 transition-colors">{action.label}</h3>
              <p className="text-sm text-[#6B7280] mt-1">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting Started Guide */}
      <div className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
        <h2 className="text-base font-semibold text-[#111827] mb-4">Getting Started</h2>
        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div key={step.title} className="flex items-start gap-4">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                step.done 
                  ? 'bg-emerald-100 text-emerald-600' 
                  : 'bg-indigo-100 text-indigo-600'
              }`}>
                {step.done ? Icons.check : idx + 1}
              </span>
              <div>
                <h3 className={`font-medium ${step.done ? 'text-[#6B7280] line-through' : 'text-[#111827]'}`}>
                  {step.title}
                </h3>
                <p className="text-sm text-[#6B7280]">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
