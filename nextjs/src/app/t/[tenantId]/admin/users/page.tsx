'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { RequirePermission, Can } from '@/lib/permissions';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: string;
  permissions: string[];
  locationIds: string[];
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

interface CurrentUser {
  id: string;
  email: string;
  role: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Dynamic role type from API
interface SystemRole {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  level: number;
  isDefault: boolean;
  permissionKeys: string[];
}

export default function TenantUsersPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  // Dynamic roles and permissions from API
  const [systemRoles, setSystemRoles] = useState<SystemRole[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Helper functions that use dynamic roles
  const getRoleLevel = useCallback((roleSlug: string): number => {
    const role = systemRoles.find(r => r.slug === roleSlug);
    return role?.level ?? 0;
  }, [systemRoles]);

  const canManageUsers = useCallback((roleSlug: string): boolean => {
    const level = getRoleLevel(roleSlug);
    return level >= 80;
  }, [getRoleLevel]);

  const getRoleBySlug = useCallback((slug: string): SystemRole | undefined => {
    return systemRoles.find(r => r.slug === slug);
  }, [systemRoles]);

  // Fetch roles from API
  const fetchRolesAndPermissions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        const data = await res.json();
        setSystemRoles(data.roles || []);
      }
    } catch {
      console.error('Failed to fetch roles');
    }
  }, []);

  // Fetch current user info
  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth/me');
      if (res.ok) {
        const data = await res.json();
        const admin = data.admin;
        if (admin) {
          setCurrentUser({
            id: admin.id,
            email: admin.email,
            role: admin.role,
          });
        }
      }
    } catch {
      console.error('Failed to fetch current user');
    }
  }, []);

  // Check permission after we have both currentUser and roles
  useEffect(() => {
    if (currentUser && systemRoles.length > 0) {
      if (!canManageUsers(currentUser.role)) {
        setHasPermission(false);
      }
    }
  }, [currentUser, systemRoles, canManageUsers]);

  const fetchUsers = useCallback(async (page = 1) => {
    if (!hasPermission) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.status === 403) {
        setHasPermission(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch {
      console.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, hasPermission]);

  useEffect(() => {
    fetchCurrentUser();
    fetchRolesAndPermissions();
  }, [fetchCurrentUser, fetchRolesAndPermissions]);

  useEffect(() => {
    if (currentUser && hasPermission && systemRoles.length > 0) {
      fetchUsers();
    }
  }, [currentUser, hasPermission, systemRoles, fetchUsers]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('User deleted successfully');
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete user');
      }
    } catch {
      setError('Failed to delete user');
    }
  };

  return (
    <RequirePermission entity="users" action="read">
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Staff & Users</h1>
        <p className="text-gray-600 mt-1">Manage your restaurant team and their access levels</p>
      </div>

      {/* Permission Check */}
      {!hasPermission && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <div className="text-yellow-600 text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-yellow-800 mb-2">Access Restricted</h2>
          <p className="text-yellow-700">
            You don&apos;t have permission to manage users. Only Admins and Managers can access this page.
          </p>
          <p className="text-yellow-600 text-sm mt-2">
            Your current role: <span className="font-medium">{currentUser?.role ? getRoleBySlug(currentUser.role)?.name || currentUser.role : 'Unknown'}</span>
          </p>
        </div>
      )}

      {hasPermission && (
        <>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">All Roles</option>
            {systemRoles.map((role) => (
              <option key={role.slug} value={role.slug}>{role.name}</option>
            ))}
          </select>
        </div>
        <Can entity="users" action="create">
        <Link
          href={`/t/${tenantId}/admin/users/new`}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          + Add Staff Member
        </Link>
        </Can>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Locations</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => {
                // Check if current user can manage this user (only manage lower roles)
                const canManageThisUser = currentUser && getRoleLevel(currentUser.role) > getRoleLevel(user.role);
                const isSelf = currentUser?.id === user.id;
                const userRoleInfo = getRoleBySlug(user.role);
                const roleColor = userRoleInfo?.color || 'bg-gray-100 text-gray-800';
                
                return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <Link href={`/t/${tenantId}/admin/users/${user.id}`} className="font-medium text-gray-900 hover:text-teal-600 transition-colors">
                        {user.displayName || user.username}
                        {isSelf && <span className="ml-2 text-xs text-teal-600">(You)</span>}
                      </Link>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${roleColor}`}>
                      {userRoleInfo?.name || user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.locationIds?.length > 0 ? (
                      <span className="text-sm text-gray-600">
                        {user.locationIds.length} location{user.locationIds.length > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">All locations</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canManageThisUser ? (
                      <>
                        <Can entity="users" action="update">
                        <Link
                          href={`/t/${tenantId}/admin/users/${user.id}`}
                          className="text-teal-600 hover:text-teal-800 mr-3"
                        >
                          Edit
                        </Link>
                        </Can>
                        <Can entity="users" action="delete">
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                        </Can>
                      </>
                    ) : (
                      <span className="text-gray-400 text-sm">
                        {isSelf ? 'Cannot edit self' : 'Higher role'}
                      </span>
                    )}
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchUsers(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchUsers(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
    </RequirePermission>
  );
}
