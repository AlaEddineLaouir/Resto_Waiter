'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCustomerAuth } from '@/lib/customer-auth-context';

interface GuestHeaderProps {
  tenantSlug: string;
  restaurantName: string;
  currentPage?: 'home' | 'menu' | 'account' | 'orders' | 'chat';
  locationSlug?: string;
}

export default function GuestHeader({
  tenantSlug,
  restaurantName,
  currentPage,
  locationSlug,
}: GuestHeaderProps) {
  const { customer, loading, logout } = useCustomerAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const basePath = `/t/${tenantSlug}`;

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Restaurant Name */}
          <Link
            href={basePath}
            className="font-bold text-lg text-gray-900 hover:text-amber-600 transition-colors truncate max-w-[200px]"
          >
            {restaurantName}
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              href={basePath}
              active={currentPage === 'home'}
            >
              Home
            </NavLink>
            {locationSlug && (
              <NavLink
                href={`${basePath}/l/${locationSlug}/menu`}
                active={currentPage === 'menu'}
              >
                Menu
              </NavLink>
            )}
            <NavLink
              href={`${basePath}/chat`}
              active={currentPage === 'chat'}
            >
              💬 AI Assistant
            </NavLink>
          </nav>

          {/* Account Area */}
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
            ) : customer ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-medium transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold">
                    {(customer.name || customer.email)[0].toUpperCase()}
                  </span>
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {customer.name || customer.email.split('@')[0]}
                  </span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                      <div className="px-3 py-2 border-b border-gray-50">
                        <p className="text-xs text-gray-500">Signed in as</p>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {customer.email}
                        </p>
                      </div>
                      <Link
                        href={`${basePath}/account`}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        👤 My Account
                      </Link>
                      <Link
                        href={`${basePath}/account/orders`}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        📋 Order History
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href={`${basePath}/account/login`}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href={`${basePath}/account/register`}
                  className="px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1.5 text-gray-500 hover:text-gray-700"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-amber-50 text-amber-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {children}
    </Link>
  );
}
