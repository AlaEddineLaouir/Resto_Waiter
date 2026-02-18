'use client';

import { useEffect, useState, useCallback } from 'react';

interface Permission {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

interface Role {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  level: number;
  isDefault: boolean;
  isActive: boolean;
  permissionKeys: string[];
  permissionDetails: Permission[];
}

const ICONS = ['👑', '📊', '✏️', '🍽️', '👨‍🍳', '🔧', '📋', '👤', '🎯', '⭐'];
const COLORS = [
  { name: 'Purple', value: 'bg-purple-100 text-purple-800 border-purple-300' },
  { name: 'Blue', value: 'bg-blue-100 text-blue-800 border-blue-300' },
  { name: 'Green', value: 'bg-green-100 text-green-800 border-green-300' },
  { name: 'Yellow', value: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { name: 'Orange', value: 'bg-orange-100 text-orange-800 border-orange-300' },
  { name: 'Red', value: 'bg-red-100 text-red-800 border-red-300' },
  { name: 'Teal', value: 'bg-teal-100 text-teal-800 border-teal-300' },
  { name: 'Indigo', value: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');
  
  // Modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  
  // Form state
  const [roleForm, setRoleForm] = useState({
    slug: '',
    name: '',
    description: '',
    icon: '👤',
    color: COLORS[0].value,
    level: 0,
    isDefault: false,
    permissionIds: [] as string[],
  });
  
  const [permissionForm, setPermissionForm] = useState({
    key: '',
    label: '',
    description: '',
    category: '',
    sortOrder: 0,
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/platform/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles);
      }
    } catch (err) {
      console.error('Failed to fetch roles', err);
    }
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch('/api/platform/permissions');
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions);
        setGroupedPermissions(data.grouped);
      }
    } catch (err) {
      console.error('Failed to fetch permissions', err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchRoles(), fetchPermissions()]).finally(() => setLoading(false));
  }, [fetchRoles, fetchPermissions]);

  const resetRoleForm = () => {
    setRoleForm({
      slug: '',
      name: '',
      description: '',
      icon: '👤',
      color: COLORS[0].value,
      level: 0,
      isDefault: false,
      permissionIds: [],
    });
    setEditingRole(null);
  };

  const resetPermissionForm = () => {
    setPermissionForm({
      key: '',
      label: '',
      description: '',
      category: '',
      sortOrder: 0,
    });
    setEditingPermission(null);
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      slug: role.slug,
      name: role.name,
      description: role.description || '',
      icon: role.icon || '👤',
      color: role.color || COLORS[0].value,
      level: role.level,
      isDefault: role.isDefault,
      permissionIds: role.permissionDetails.map((p) => p.id),
    });
    setShowRoleModal(true);
  };

  const openEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    setPermissionForm({
      key: permission.key,
      label: permission.label,
      description: permission.description || '',
      category: permission.category,
      sortOrder: permission.sortOrder,
    });
    setShowPermissionModal(true);
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const url = editingRole ? `/api/platform/roles/${editingRole.id}` : '/api/platform/roles';
      const method = editingRole ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm),
      });
      
      if (res.ok) {
        setSuccess(editingRole ? 'Role updated successfully' : 'Role created successfully');
        setShowRoleModal(false);
        resetRoleForm();
        fetchRoles();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save role');
      }
    } catch {
      setError('Failed to save role');
    }
  };

  const handlePermissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const url = editingPermission 
        ? `/api/platform/permissions/${editingPermission.id}` 
        : '/api/platform/permissions';
      const method = editingPermission ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissionForm),
      });
      
      if (res.ok) {
        setSuccess(editingPermission ? 'Permission updated successfully' : 'Permission created successfully');
        setShowPermissionModal(false);
        resetPermissionForm();
        fetchPermissions();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save permission');
      }
    } catch {
      setError('Failed to save permission');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    
    try {
      const res = await fetch(`/api/platform/roles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Role deleted successfully');
        fetchRoles();
      }
    } catch {
      setError('Failed to delete role');
    }
  };

  const handleDeletePermission = async (id: string) => {
    if (!confirm('Are you sure you want to delete this permission?')) return;
    
    try {
      const res = await fetch(`/api/platform/permissions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Permission deleted successfully');
        fetchPermissions();
      }
    } catch {
      setError('Failed to delete permission');
    }
  };

  const togglePermissionInRole = (permissionId: string) => {
    setRoleForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter((id) => id !== permissionId)
        : [...prev.permissionIds, permissionId],
    }));
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
        <p className="text-gray-600 mt-1">Manage system-wide roles and permissions for restaurant users</p>
      </div>

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

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'roles'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Roles ({roles.length})
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'permissions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Permissions ({permissions.length})
        </button>
      </div>

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                resetRoleForm();
                setShowRoleModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              + Add Role
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div
                key={role.id}
                className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{role.icon || '👤'}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{role.name}</h3>
                      <span className="text-xs text-gray-500">Level: {role.level}</span>
                    </div>
                  </div>
                  {role.isDefault && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Default
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{role.description || 'No description'}</p>
                
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 mb-2">
                    Permissions ({role.permissionKeys.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissionKeys.slice(0, 5).map((key) => (
                      <span
                        key={key}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                      >
                        {key}
                      </span>
                    ))}
                    {role.permissionKeys.length > 5 && (
                      <span className="text-xs text-gray-500">
                        +{role.permissionKeys.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => openEditRole(role)}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {roles.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No roles defined. Click &quot;Add Role&quot; to create one.
            </div>
          )}
        </>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                resetPermissionForm();
                setShowPermissionModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              + Add Permission
            </button>
          </div>

          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="bg-white rounded-xl shadow-sm border divide-y">
                {perms.map((permission) => (
                  <div key={permission.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                          {permission.key}
                        </code>
                        <span className="font-medium text-gray-900">{permission.label}</span>
                      </div>
                      {permission.description && (
                        <p className="text-sm text-gray-500 mt-1">{permission.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditPermission(permission)}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePermission(permission.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {permissions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No permissions defined. Click &quot;Add Permission&quot; to create one.
            </div>
          )}
        </>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingRole ? 'Edit Role' : 'Create Role'}
            </h2>
            
            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={roleForm.slug}
                    onChange={(e) => setRoleForm({ ...roleForm, slug: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g., chef"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g., Menu Editor"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Describe what this role can do..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setRoleForm({ ...roleForm, icon })}
                        className={`w-10 h-10 text-xl rounded-lg border-2 ${
                          roleForm.icon === icon ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Level (higher = more privileges)
                  </label>
                  <input
                    type="number"
                    value={roleForm.level}
                    onChange={(e) => setRoleForm({ ...roleForm, level: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border rounded-lg"
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <select
                    value={roleForm.color}
                    onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    {COLORS.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={roleForm.isDefault}
                    onChange={(e) => setRoleForm({ ...roleForm, isDefault: e.target.checked })}
                    className="h-4 w-4 text-indigo-600"
                  />
                  <span className="text-sm">Default role for new users</span>
                </label>
              </div>

              {/* Permissions Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Permissions
                </label>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category} className="p-3 border-b last:border-b-0">
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        {category}
                      </div>
                      <div className="space-y-2">
                        {perms.map((perm) => (
                          <label key={perm.id} className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={roleForm.permissionIds.includes(perm.id)}
                              onChange={() => togglePermissionInRole(perm.id)}
                              className="h-4 w-4 mt-0.5 text-indigo-600"
                            />
                            <div>
                              <span className="text-sm font-medium">{perm.label}</span>
                              <code className="ml-2 text-xs bg-gray-100 px-1 rounded">{perm.key}</code>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingPermission ? 'Edit Permission' : 'Create Permission'}
            </h2>
            
            <form onSubmit={handlePermissionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={permissionForm.key}
                  onChange={(e) => setPermissionForm({ ...permissionForm, key: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., menu.create"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use format: category.action (e.g., menu.read, orders.update)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={permissionForm.label}
                  onChange={(e) => setPermissionForm({ ...permissionForm, label: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Create Menu Items"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={permissionForm.category}
                  onChange={(e) => setPermissionForm({ ...permissionForm, category: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Menu"
                  list="categories"
                  required
                />
                <datalist id="categories">
                  {Object.keys(groupedPermissions).map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={permissionForm.description}
                  onChange={(e) => setPermissionForm({ ...permissionForm, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Describe what this permission allows..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={permissionForm.sortOrder}
                  onChange={(e) => setPermissionForm({ ...permissionForm, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg"
                  min={0}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPermissionModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingPermission ? 'Update Permission' : 'Create Permission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
