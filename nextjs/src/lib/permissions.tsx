'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Types
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  role: string;
  permissions?: string[];
  locationIds?: string[];
}

export interface SystemRole {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  level: number;
  permissionKeys: string[];
}

export interface SystemPermission {
  id: string;
  key: string;
  label: string;
  description: string;
  category: string;
}

interface PermissionContextType {
  user: AdminUser | null;
  permissions: string[];
  roles: SystemRole[];
  loading: boolean;
  error: string | null;
  
  // Permission checks
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  
  // Entity-based permission checks
  canRead: (entity: string) => boolean;
  canCreate: (entity: string) => boolean;
  canUpdate: (entity: string) => boolean;
  canDelete: (entity: string) => boolean;
  
  // Role checks
  getRoleLevel: () => number;
  isAdmin: () => boolean;
  isManager: () => boolean;
  
  // Refresh
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

interface PermissionProviderProps {
  children: ReactNode;
  tenantId: string;
}

export function PermissionProvider({ children, tenantId }: PermissionProviderProps) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserAndPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch current user
      const userRes = await fetch('/api/admin/auth/me');
      if (!userRes.ok) {
        setUser(null);
        setPermissions([]);
        return;
      }
      
      const userData = await userRes.json();
      const currentUser = userData.admin;
      
      if (!currentUser) {
        setUser(null);
        setPermissions([]);
        return;
      }

      // Fetch roles for role level info
      const rolesRes = await fetch('/api/admin/roles');
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.roles || []);
      }
      
      // Use the permissions returned from /me endpoint
      // These are already the effective permissions (custom or role defaults)
      const effectivePermissions = currentUser.permissions || [];
      
      setUser(currentUser);
      setPermissions(effectivePermissions);
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
      setError('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserAndPermissions();
  }, [fetchUserAndPermissions, tenantId]);

  // Refresh permissions when window gets focus (in case admin changed them)
  useEffect(() => {
    const handleFocus = () => {
      fetchUserAndPermissions();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchUserAndPermissions]);

  // Also refresh every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUserAndPermissions();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchUserAndPermissions]);

  // Permission check functions
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    // Admins have all permissions
    if (user.role === 'admin') return true;
    return permissions.includes(permission);
  }, [user, permissions]);

  const hasAnyPermission = useCallback((perms: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return perms.some(p => permissions.includes(p));
  }, [user, permissions]);

  const hasAllPermissions = useCallback((perms: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return perms.every(p => permissions.includes(p));
  }, [user, permissions]);

  // Entity-based shortcuts
  const canRead = useCallback((entity: string): boolean => {
    return hasPermission(`${entity}.read`);
  }, [hasPermission]);

  const canCreate = useCallback((entity: string): boolean => {
    return hasPermission(`${entity}.create`);
  }, [hasPermission]);

  const canUpdate = useCallback((entity: string): boolean => {
    return hasPermission(`${entity}.update`);
  }, [hasPermission]);

  const canDelete = useCallback((entity: string): boolean => {
    return hasPermission(`${entity}.delete`);
  }, [hasPermission]);

  // Role checks
  const getRoleLevel = useCallback((): number => {
    if (!user) return 0;
    const role = roles.find(r => r.slug === user.role);
    return role?.level || 0;
  }, [user, roles]);

  const isAdmin = useCallback((): boolean => {
    return user?.role === 'admin';
  }, [user]);

  const isManager = useCallback((): boolean => {
    return user?.role === 'admin' || user?.role === 'manager';
  }, [user]);

  const value: PermissionContextType = {
    user,
    permissions,
    roles,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    getRoleLevel,
    isAdmin,
    isManager,
    refreshPermissions: fetchUserAndPermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

// Hook to use permissions
export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

// Higher-order component for permission-protected pages
interface RequirePermissionProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  entity?: string;
  action?: 'read' | 'create' | 'update' | 'delete';
  fallback?: ReactNode;
  children: ReactNode;
}

export function RequirePermission({
  permission,
  permissions,
  requireAll = false,
  entity,
  action = 'read',
  fallback,
  children,
}: RequirePermissionProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading, user } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return fallback || <AccessDenied message="Please log in to access this page." />;
  }

  // Check permissions
  let hasAccess = false;

  if (entity) {
    hasAccess = hasPermission(`${entity}.${action}`);
  } else if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  } else {
    hasAccess = true; // No permission required
  }

  if (!hasAccess) {
    return fallback || <AccessDenied entity={entity} action={action} />;
  }

  return <>{children}</>;
}

// Access denied component
interface AccessDeniedProps {
  message?: string;
  entity?: string;
  action?: string;
}

export function AccessDenied({ message, entity, action }: AccessDeniedProps) {
  const { user } = usePermissions();

  const defaultMessage = entity && action
    ? `You don't have permission to ${action} ${entity}.`
    : message || "You don't have permission to access this page.";

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center max-w-lg mx-auto my-8">
      <div className="text-yellow-600 text-5xl mb-4">🔒</div>
      <h2 className="text-xl font-bold text-yellow-800 mb-2">Access Restricted</h2>
      <p className="text-yellow-700">{defaultMessage}</p>
      {user && (
        <p className="text-yellow-600 text-sm mt-3">
          Your current role: <span className="font-medium capitalize">{user.role.replace('_', ' ')}</span>
        </p>
      )}
      <p className="text-yellow-600 text-xs mt-2">
        Contact your administrator if you need access.
      </p>
    </div>
  );
}

// Inline permission check component (for hiding buttons, etc.)
interface CanProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  entity?: string;
  action?: 'read' | 'create' | 'update' | 'delete';
  children: ReactNode;
  fallback?: ReactNode;
}

export function Can({ permission, permissions, requireAll = false, entity, action = 'read', children, fallback = null }: CanProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, user, loading } = usePermissions();

  if (loading || !user) return <>{fallback}</>;

  let hasAccess = false;

  if (entity) {
    hasAccess = hasPermission(`${entity}.${action}`);
  } else if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
