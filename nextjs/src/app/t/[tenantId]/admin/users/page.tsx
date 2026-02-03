'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
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

interface Location {
  id: string;
  name: string;
  slug: string;
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
  permissions: SystemPermission[];
}

interface SystemPermission {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string;
}

// Password validation
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('One number');
  return { valid: errors.length === 0, errors };
}

// Email validation
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function TenantUsersPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formStep, setFormStep] = useState<'basic' | 'permissions'>('basic');
  
  // Credentials modal state (shown after creating a new user)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newUserCredentials, setNewUserCredentials] = useState<{ email: string; password: string; displayName: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Dynamic roles and permissions from API
  const [systemRoles, setSystemRoles] = useState<SystemRole[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, SystemPermission[]>>({});
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
    phone: '',
    notes: '',
    role: 'menu_editor',
    permissions: [] as string[],
    locationIds: [] as string[],
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  // Helper functions that use dynamic roles
  const getRoleLevel = useCallback((roleSlug: string): number => {
    const role = systemRoles.find(r => r.slug === roleSlug);
    return role?.level ?? 0;
  }, [systemRoles]);

  const canManageUsers = useCallback((roleSlug: string): boolean => {
    const level = getRoleLevel(roleSlug);
    // Users with level >= 80 (manager level) can manage users
    return level >= 80;
  }, [getRoleLevel]);

  const getAssignableRoles = useCallback((currentRoleSlug: string): SystemRole[] => {
    const currentLevel = getRoleLevel(currentRoleSlug);
    // Can only assign roles with lower level than your own
    return systemRoles.filter(r => r.level < currentLevel);
  }, [systemRoles, getRoleLevel]);

  const getRoleBySlug = useCallback((slug: string): SystemRole | undefined => {
    return systemRoles.find(r => r.slug === slug);
  }, [systemRoles]);

  // Get assignable roles based on current user's role
  const assignableRoles = currentUser ? getAssignableRoles(currentUser.role) : [];

  // Fetch roles and permissions from API
  const fetchRolesAndPermissions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        const data = await res.json();
        setSystemRoles(data.roles || []);
        setGroupedPermissions(data.groupedPermissions || {});
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
        // API returns { admin: { id, email, role, ... } }
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

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []);
      }
    } catch {
      console.error('Failed to fetch locations');
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchRolesAndPermissions();
  }, [fetchCurrentUser, fetchRolesAndPermissions]);

  useEffect(() => {
    if (currentUser && hasPermission && systemRoles.length > 0) {
      fetchUsers();
      fetchLocations();
    }
  }, [currentUser, hasPermission, systemRoles, fetchUsers, fetchLocations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';

      const body = { ...formData };
      if (!body.password) delete (body as Record<string, unknown>).password;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // If creating a new user, show credentials modal
        if (!editingUser && formData.password) {
          setNewUserCredentials({
            email: formData.email,
            password: formData.password,
            displayName: formData.displayName || formData.username,
          });
          setShowCredentialsModal(true);
        } else {
          setSuccess(editingUser ? 'User updated successfully' : 'User created successfully');
        }
        setShowModal(false);
        resetForm();
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save user');
      }
    } catch {
      setError('Failed to save user');
    }
  };

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

  const resetForm = () => {
    const defaultRole = systemRoles.find(r => r.isDefault) || systemRoles[0];
    setFormData({
      email: '',
      username: '',
      displayName: '',
      password: '',
      phone: '',
      notes: '',
      role: defaultRole?.slug || 'menu_editor',
      permissions: defaultRole?.permissionKeys || [],
      locationIds: [],
      isActive: true,
    });
    setFormErrors({});
    setFormStep('basic');
    setEditingUser(null);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    const userRole = getRoleBySlug(user.role);
    setFormData({
      email: user.email,
      username: user.username,
      displayName: user.displayName || '',
      password: '',
      phone: (user as unknown as { phone?: string }).phone || '',
      notes: (user as unknown as { notes?: string }).notes || '',
      role: user.role,
      permissions: user.permissions || userRole?.permissionKeys || [],
      locationIds: user.locationIds || [],
      isActive: user.isActive,
    });
    setFormErrors({});
    setFormStep('basic');
    setShowModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    // Set default role to first assignable role
    if (assignableRoles.length > 0) {
      const defaultRole = assignableRoles[0];
      setFormData(prev => ({ 
        ...prev, 
        role: defaultRole.slug,
        permissions: defaultRole.permissionKeys || [],
      }));
    }
    setShowModal(true);
  };

  // Handle role change - update permissions to defaults
  const handleRoleChange = (newRoleSlug: string) => {
    const role = getRoleBySlug(newRoleSlug);
    setFormData(prev => ({
      ...prev,
      role: newRoleSlug,
      permissions: role?.permissionKeys || [],
    }));
  };

  // Toggle permission
  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  // Validate form step
  const validateBasicInfo = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!formData.username) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!editingUser && !formData.password) {
      errors.password = 'Password is required for new users';
    } else if (formData.password) {
      const pwValidation = validatePassword(formData.password);
      if (!pwValidation.valid) {
        errors.password = 'Password: ' + pwValidation.errors.join(', ');
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const toggleLocation = (locationId: string) => {
    setFormData((prev) => ({
      ...prev,
      locationIds: prev.locationIds.includes(locationId)
        ? prev.locationIds.filter((id) => id !== locationId)
        : [...prev.locationIds, locationId],
    }));
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
            You don&apos;t have permission to manage users. Only Owners and Managers can access this page.
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
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          + Add Staff Member
        </button>
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
                      <div className="font-medium text-gray-900">
                        {user.displayName || user.username}
                        {isSelf && <span className="ml-2 text-xs text-teal-600">(You)</span>}
                      </div>
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
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-teal-600 hover:text-teal-800 mr-3"
                        >
                          Edit
                        </button>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Edit Staff Member' : 'Add Staff Member'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b mb-6">
              <button
                type="button"
                onClick={() => setFormStep('basic')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  formStep === 'basic'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                1. Basic Info
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateBasicInfo()) setFormStep('permissions');
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  formStep === 'permissions'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                2. Role & Permissions
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Step 1: Basic Info */}
              {formStep === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          setFormErrors({ ...formErrors, email: '' });
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                          formErrors.email ? 'border-red-500' : ''
                        }`}
                        placeholder="user@restaurant.com"
                      />
                      {formErrors.email && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => {
                          setFormData({ ...formData, username: e.target.value });
                          setFormErrors({ ...formErrors, username: '' });
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                          formErrors.username ? 'border-red-500' : ''
                        }`}
                        placeholder="johndoe"
                      />
                      {formErrors.username && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password {editingUser ? '(leave empty to keep current)' : <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        setFormErrors({ ...formErrors, password: '' });
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                        formErrors.password ? 'border-red-500' : ''
                      }`}
                      placeholder={editingUser ? '••••••••' : 'Min 8 chars, upper, lower, number'}
                    />
                    {formErrors.password && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
                    )}
                    {!editingUser && (
                      <p className="text-xs text-gray-500 mt-1">
                        Must be at least 8 characters with uppercase, lowercase, and number
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="Any additional notes about this team member..."
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (validateBasicInfo()) setFormStep('permissions');
                      }}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                    >
                      Next: Role & Permissions →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Role & Permissions */}
              {formStep === 'permissions' && (
                <div className="space-y-6">
                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Role <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {assignableRoles.map((role) => {
                        const isSelected = formData.role === role.slug;
                        return (
                          <button
                            key={role.slug}
                            type="button"
                            onClick={() => handleRoleChange(role.slug)}
                            className={`flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all ${
                              isSelected
                                ? `${role.color} border-current`
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="text-2xl">{role.icon}</span>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{role.name}</div>
                              <div className="text-sm text-gray-500">{role.description}</div>
                            </div>
                            {isSelected && (
                              <svg className="w-6 h-6 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      You can only assign roles below your own level ({currentUser?.role ? getRoleBySlug(currentUser.role)?.name : ''})
                    </p>
                  </div>

                  {/* Custom Permissions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Permissions
                      <span className="font-normal text-gray-500 ml-2">(customize access)</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Default permissions are pre-selected based on role. You can customize as needed.
                    </p>
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                      {Object.entries(groupedPermissions).map(([category, perms]) => (
                        <div key={category} className="p-3">
                          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{category}</div>
                          <div className="space-y-2">
                            {perms.map((perm) => (
                              <label key={perm.key} className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={formData.permissions.includes(perm.key)}
                                  onChange={() => togglePermission(perm.key)}
                                  className="h-4 w-4 mt-0.5 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                />
                                <div>
                                  <span className="text-sm font-medium text-gray-700">{perm.label}</span>
                                  <p className="text-xs text-gray-500">{perm.description}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Location Access */}
                  {locations.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location Access
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Leave empty for access to all locations
                      </p>
                      <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-2">
                        {locations.map((location) => (
                          <label key={location.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={formData.locationIds.includes(location.id)}
                              onChange={() => toggleLocation(location.id)}
                              className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">{location.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setFormStep('basic')}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      ← Back
                    </button>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                      >
                        {editingUser ? 'Update Staff Member' : 'Create Staff Member'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal - shown after creating a new user */}
      {showCredentialsModal && newUserCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">User Created Successfully!</h2>
              <p className="text-gray-500 mt-1">
                Share these credentials with <strong>{newUserCredentials.displayName}</strong>
              </p>
            </div>

            <div className="space-y-4">
              {/* Email */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Email</label>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-gray-900">{newUserCredentials.email}</span>
                  <button
                    onClick={() => copyToClipboard(newUserCredentials.email, 'email')}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      copiedField === 'email' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {copiedField === 'email' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Password</label>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-gray-900">{newUserCredentials.password}</span>
                  <button
                    onClick={() => copyToClipboard(newUserCredentials.password, 'password')}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      copiedField === 'password' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {copiedField === 'password' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Copy All Button */}
              <button
                onClick={() => copyToClipboard(
                  `Email: ${newUserCredentials.email}\nPassword: ${newUserCredentials.password}`,
                  'all'
                )}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  copiedField === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                {copiedField === 'all' ? '✓ Copied to Clipboard' : '📋 Copy Email & Password'}
              </button>
            </div>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-gray-400 text-center mb-4">
                ⚠️ This is the only time you can see the password. Make sure to save it.
              </p>
              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  setNewUserCredentials(null);
                  setSuccess('User created successfully');
                }}
                className="w-full py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
    </RequirePermission>
  );
}
