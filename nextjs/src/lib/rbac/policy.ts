/**
 * Policy Layer - Authorization Decision Functions
 * 
 * This is the core of the authorization system.
 * All permission checks should go through these functions.
 * 
 * IMPORTANT: These functions are designed to be called from SERVER-SIDE code only.
 * Client components should NEVER make authorization decisions.
 */

import { TenantUserRole } from '@prisma/client';
import { PermissionKey } from './permissions';
import { getPermissionsForRole, isRoleHigherThan, getRoleLevel } from './roles';

/**
 * User context for authorization checks
 */
export interface AuthUser {
  id: string;
  email: string;
  role: TenantUserRole | string;
  tenantId: string;
  permissions?: PermissionKey[]; // Can be cached in session
  locationIds?: string[]; // For location-scoped access
}

/**
 * Resource context for ownership/scope checks
 */
export interface Resource {
  tenantId: string;
  locationId?: string;
  ownerId?: string;
}

/**
 * Authorization result with reason
 */
export interface AuthResult {
  allowed: boolean;
  reason?: string;
}

// ============================================================================
// CORE POLICY FUNCTIONS
// ============================================================================

/**
 * Check if user has a specific permission
 * This is the primary authorization function.
 */
export function can(user: AuthUser, permission: PermissionKey): boolean {
  // Use cached permissions if available, otherwise compute from role
  const permissions = user.permissions || getPermissionsForRole(user.role);
  return permissions.includes(permission);
}

/**
 * Check if user has a permission with detailed result
 */
export function canWithReason(user: AuthUser, permission: PermissionKey): AuthResult {
  if (can(user, permission)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `Role '${user.role}' does not have permission '${permission}'`,
  };
}

/**
 * Check if user can access a resource (tenant isolation)
 * CRITICAL: Always check tenant isolation before any operation.
 */
export function canAccessResource(user: AuthUser, resource: Resource): boolean {
  // Tenant isolation - users can only access their own tenant's resources
  return user.tenantId === resource.tenantId;
}

/**
 * Check if user can access a resource AND has the required permission
 */
export function canAccessAndDo(
  user: AuthUser,
  resource: Resource,
  permission: PermissionKey
): AuthResult {
  // First check tenant isolation
  if (!canAccessResource(user, resource)) {
    return {
      allowed: false,
      reason: 'Access denied: Resource belongs to a different tenant',
    };
  }

  // Then check permission
  return canWithReason(user, permission);
}

// ============================================================================
// STAFF MANAGEMENT POLICIES
// ============================================================================

/**
 * Check if user can manage another user based on role hierarchy
 * Users can only manage users with strictly lower roles.
 */
export function canManageUser(
  currentUser: AuthUser,
  targetUserRole: TenantUserRole | string
): boolean {
  // Must have staff.update permission
  if (!can(currentUser, 'staff.update')) {
    return false;
  }

  // Can only manage users with lower roles
  return isRoleHigherThan(currentUser.role, targetUserRole);
}

/**
 * Check if user can assign a specific role
 * Users can only assign roles strictly lower than their own.
 */
export function canAssignRole(
  currentUser: AuthUser,
  targetRole: TenantUserRole | string
): boolean {
  // Must be able to create or update staff
  if (!can(currentUser, 'staff.create') && !can(currentUser, 'staff.update')) {
    return false;
  }

  // Can only assign roles lower than your own
  return isRoleHigherThan(currentUser.role, targetRole);
}

/**
 * Check if user can delete another user
 */
export function canDeleteUser(
  currentUser: AuthUser,
  targetUserRole: TenantUserRole | string
): boolean {
  // Must have staff.delete permission
  if (!can(currentUser, 'staff.delete')) {
    return false;
  }

  // Can only delete users with lower roles
  return isRoleHigherThan(currentUser.role, targetUserRole);
}

/**
 * Prevent self-demotion for owners
 */
export function canModifySelf(
  user: AuthUser,
  newRole?: TenantUserRole | string
): AuthResult {
  // If role is changing
  if (newRole && newRole !== user.role) {
    // Owners cannot demote themselves
    if (user.role === 'owner' && newRole !== 'owner') {
      return {
        allowed: false,
        reason: 'Owners cannot demote themselves',
      };
    }
  }
  
  return { allowed: true };
}

// ============================================================================
// LOCATION-SCOPED POLICIES
// ============================================================================

/**
 * Check if user has access to a specific location
 * Some roles may be scoped to specific locations.
 */
export function canAccessLocation(user: AuthUser, locationId: string): boolean {
  // Owners and managers have access to all locations
  if (getRoleLevel(user.role) >= getRoleLevel('manager')) {
    return true;
  }

  // Other roles may be scoped to specific locations
  if (user.locationIds && user.locationIds.length > 0) {
    return user.locationIds.includes(locationId);
  }

  // If no location restriction, allow access
  return true;
}

// ============================================================================
// CONVENIENCE POLICY FUNCTIONS
// ============================================================================

/**
 * Check if user can manage menus (create, update, publish)
 */
export function canManageMenu(user: AuthUser): boolean {
  return can(user, 'menus.update');
}

/**
 * Check if user can publish menus
 */
export function canPublishMenu(user: AuthUser): boolean {
  return can(user, 'menus.publish');
}

/**
 * Check if user can manage locations (create, update, delete)
 */
export function canManageLocations(user: AuthUser): boolean {
  return can(user, 'locations.update');
}

/**
 * Check if user can manage staff
 */
export function canManageStaff(user: AuthUser): boolean {
  return can(user, 'staff.read') && can(user, 'staff.update');
}

/**
 * Check if user can view analytics
 */
export function canViewAnalytics(user: AuthUser): boolean {
  return can(user, 'analytics.read');
}
