/**
 * Route Guards - Authorization checks for API routes
 * 
 * These functions are designed to be used at the top of route handlers
 * to enforce authorization before any business logic runs.
 */

import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { PermissionKey } from './permissions';
import { can, canAccessResource, AuthUser, Resource, canManageUser, canAssignRole } from './policy';
import { getPermissionsForRole } from './roles';
import { TenantUserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Result of a guard check
 */
export interface GuardResult {
  authorized: boolean;
  user?: AuthUser;
  response?: NextResponse;
}

/**
 * Get the current user with permissions
 * Fetches permissions dynamically from the database for real-time updates.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getRestaurantSession();
  
  if (!session) {
    return null;
  }

  // Fetch current permissions from database for real-time updates
  const dbUser = await prisma.adminUser.findUnique({
    where: { id: session.id },
    select: { permissions: true, role: true },
  });

  // Use custom permissions from DB if set, otherwise use role defaults
  const dbPermissions = dbUser?.permissions as string[] | null;
  const permissions = dbPermissions && dbPermissions.length > 0
    ? dbPermissions as PermissionKey[]
    : getPermissionsForRole(dbUser?.role || session.role);

  return {
    id: session.id,
    email: session.email,
    role: dbUser?.role || session.role,
    tenantId: session.tenantId,
    permissions,
    locationIds: session.locationIds,
  };
}

/**
 * Require authentication - returns 401 if not logged in
 */
export async function requireAuth(): Promise<GuardResult> {
  const user = await getAuthUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  return { authorized: true, user };
}

/**
 * Require a specific permission - returns 403 if not allowed
 */
export async function requirePermission(permission: PermissionKey): Promise<GuardResult> {
  const authResult = await requireAuth();
  
  if (!authResult.authorized) {
    return authResult;
  }

  const user = authResult.user!;

  console.log('[RBAC] Checking permission:', {
    permission,
    userId: user.id,
    role: user.role,
    userPermissions: user.permissions,
    hasPermission: can(user, permission),
  });

  if (!can(user, permission)) {
    return {
      authorized: false,
      user,
      response: NextResponse.json(
        { error: `Insufficient permissions: requires '${permission}'` },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user };
}

/**
 * Require access to a specific resource (tenant check)
 */
export async function requireResourceAccess(
  permission: PermissionKey,
  resource: Resource
): Promise<GuardResult> {
  const authResult = await requireAuth();
  
  if (!authResult.authorized) {
    return authResult;
  }

  const user = authResult.user!;

  // Check tenant isolation
  if (!canAccessResource(user, resource)) {
    return {
      authorized: false,
      user,
      response: NextResponse.json(
        { error: 'Access denied: Resource not found' },
        { status: 404 } // Return 404 to not leak existence
      ),
    };
  }

  // Check permission
  if (!can(user, permission)) {
    return {
      authorized: false,
      user,
      response: NextResponse.json(
        { error: `Insufficient permissions: requires '${permission}'` },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user };
}

/**
 * Require ability to manage a user with a specific role
 */
export async function requireUserManagement(
  targetRole: TenantUserRole | string
): Promise<GuardResult> {
  const authResult = await requireAuth();
  
  if (!authResult.authorized) {
    return authResult;
  }

  const user = authResult.user!;

  if (!canManageUser(user, targetRole)) {
    return {
      authorized: false,
      user,
      response: NextResponse.json(
        { error: 'Cannot manage users with equal or higher role' },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user };
}

/**
 * Require ability to assign a specific role
 */
export async function requireRoleAssignment(
  targetRole: TenantUserRole | string
): Promise<GuardResult> {
  const authResult = await requireAuth();
  
  if (!authResult.authorized) {
    return authResult;
  }

  const user = authResult.user!;

  if (!canAssignRole(user, targetRole)) {
    return {
      authorized: false,
      user,
      response: NextResponse.json(
        { error: 'Cannot assign a role equal to or higher than your own' },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user };
}

// ============================================================================
// CONVENIENT GUARD SHORTCUTS
// ============================================================================

/**
 * Require menu read access
 */
export async function requireMenuRead(): Promise<GuardResult> {
  return requirePermission('menus.read');
}

/**
 * Require menu write access
 */
export async function requireMenuWrite(): Promise<GuardResult> {
  return requirePermission('menus.update');
}

/**
 * Require item read access
 */
export async function requireItemRead(): Promise<GuardResult> {
  return requirePermission('items.read');
}

/**
 * Require item write access
 */
export async function requireItemWrite(): Promise<GuardResult> {
  return requirePermission('items.update');
}

/**
 * Require staff management access
 */
export async function requireStaffManagement(): Promise<GuardResult> {
  return requirePermission('staff.update');
}
