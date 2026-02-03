/**
 * Role Definitions with Permission Mappings
 * 
 * Each role has a set of permissions it grants.
 * This is the central source of truth for what each role can do.
 */

import { TenantUserRole } from '@prisma/client';
import {
  PermissionKey,
  // Menu
  MENU_READ, MENU_CREATE, MENU_UPDATE, MENU_DELETE, MENU_PUBLISH,
  // Item
  ITEM_READ, ITEM_CREATE, ITEM_UPDATE, ITEM_DELETE,
  // Section
  SECTION_READ, SECTION_CREATE, SECTION_UPDATE, SECTION_DELETE,
  // Location
  LOCATION_READ, LOCATION_CREATE, LOCATION_UPDATE, LOCATION_DELETE,
  // Brand
  BRAND_READ, BRAND_CREATE, BRAND_UPDATE, BRAND_DELETE,
  // Publication
  PUBLICATION_READ, PUBLICATION_CREATE, PUBLICATION_UPDATE, PUBLICATION_DELETE,
  // Ingredient
  INGREDIENT_READ, INGREDIENT_CREATE, INGREDIENT_UPDATE, INGREDIENT_DELETE,
  // Option
  OPTION_READ, OPTION_CREATE, OPTION_UPDATE, OPTION_DELETE,
  // Staff
  STAFF_READ, STAFF_CREATE, STAFF_UPDATE, STAFF_DELETE,
  // Dashboard & Analytics
  DASHBOARD_VIEW, ANALYTICS_VIEW,
  // Reference data
  ALLERGEN_READ, DIETARY_READ,
} from './permissions';

/**
 * Role hierarchy - higher index = higher privilege
 */
export const ROLE_HIERARCHY: TenantUserRole[] = [
  'kitchen_staff',
  'foh_staff',
  'menu_editor',
  'manager',
  'owner',
];

/**
 * Get the numeric level of a role (higher = more powerful)
 */
export function getRoleLevel(role: TenantUserRole | string): number {
  return ROLE_HIERARCHY.indexOf(role as TenantUserRole);
}

/**
 * Check if roleA is higher than roleB in the hierarchy
 */
export function isRoleHigherThan(roleA: TenantUserRole | string, roleB: TenantUserRole | string): boolean {
  return getRoleLevel(roleA) > getRoleLevel(roleB);
}

/**
 * Permission sets for each role
 */
export const ROLE_PERMISSIONS: Record<TenantUserRole, PermissionKey[]> = {
  // Owner - Full access to everything
  owner: [
    // Menu
    MENU_READ, MENU_CREATE, MENU_UPDATE, MENU_DELETE, MENU_PUBLISH,
    // Items
    ITEM_READ, ITEM_CREATE, ITEM_UPDATE, ITEM_DELETE,
    // Sections
    SECTION_READ, SECTION_CREATE, SECTION_UPDATE, SECTION_DELETE,
    // Locations
    LOCATION_READ, LOCATION_CREATE, LOCATION_UPDATE, LOCATION_DELETE,
    // Brands
    BRAND_READ, BRAND_CREATE, BRAND_UPDATE, BRAND_DELETE,
    // Publications
    PUBLICATION_READ, PUBLICATION_CREATE, PUBLICATION_UPDATE, PUBLICATION_DELETE,
    // Ingredients
    INGREDIENT_READ, INGREDIENT_CREATE, INGREDIENT_UPDATE, INGREDIENT_DELETE,
    // Options
    OPTION_READ, OPTION_CREATE, OPTION_UPDATE, OPTION_DELETE,
    // Staff management
    STAFF_READ, STAFF_CREATE, STAFF_UPDATE, STAFF_DELETE,
    // Dashboard & Analytics
    DASHBOARD_VIEW, ANALYTICS_VIEW,
    // Reference data
    ALLERGEN_READ, DIETARY_READ,
  ],

  // Manager - Most access, limited staff management (can't delete staff)
  manager: [
    // Menu
    MENU_READ, MENU_CREATE, MENU_UPDATE, MENU_PUBLISH,
    // Items
    ITEM_READ, ITEM_CREATE, ITEM_UPDATE, ITEM_DELETE,
    // Sections
    SECTION_READ, SECTION_CREATE, SECTION_UPDATE, SECTION_DELETE,
    // Locations (read only)
    LOCATION_READ,
    // Brands (read only)
    BRAND_READ,
    // Publications
    PUBLICATION_READ, PUBLICATION_CREATE, PUBLICATION_UPDATE,
    // Ingredients
    INGREDIENT_READ, INGREDIENT_CREATE, INGREDIENT_UPDATE, INGREDIENT_DELETE,
    // Options
    OPTION_READ, OPTION_CREATE, OPTION_UPDATE, OPTION_DELETE,
    // Staff management (limited)
    STAFF_READ, STAFF_CREATE, STAFF_UPDATE,
    // Dashboard & Analytics
    DASHBOARD_VIEW, ANALYTICS_VIEW,
    // Reference data
    ALLERGEN_READ, DIETARY_READ,
  ],

  // Menu Editor - Can edit menu content, no staff/location management
  menu_editor: [
    // Menu (no delete, no publish)
    MENU_READ, MENU_CREATE, MENU_UPDATE,
    // Items
    ITEM_READ, ITEM_CREATE, ITEM_UPDATE,
    // Sections
    SECTION_READ, SECTION_CREATE, SECTION_UPDATE,
    // Locations (read only)
    LOCATION_READ,
    // Brands (read only)
    BRAND_READ,
    // Ingredients
    INGREDIENT_READ, INGREDIENT_CREATE, INGREDIENT_UPDATE,
    // Options
    OPTION_READ, OPTION_CREATE, OPTION_UPDATE,
    // Dashboard
    DASHBOARD_VIEW,
    // Reference data
    ALLERGEN_READ, DIETARY_READ,
  ],

  // FOH Staff - Read-only access to menu for customer service
  foh_staff: [
    // Menu (read only)
    MENU_READ,
    // Items (read only)
    ITEM_READ,
    // Sections (read only)
    SECTION_READ,
    // Locations (read only)
    LOCATION_READ,
    // Dashboard
    DASHBOARD_VIEW,
    // Reference data (for customer questions about allergens)
    ALLERGEN_READ, DIETARY_READ,
  ],

  // Kitchen Staff - Read items and ingredients
  kitchen_staff: [
    // Items (read only)
    ITEM_READ,
    // Sections (read only)
    SECTION_READ,
    // Ingredients (read only)
    INGREDIENT_READ,
    // Reference data
    ALLERGEN_READ, DIETARY_READ,
  ],
};

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: TenantUserRole | string): PermissionKey[] {
  return ROLE_PERMISSIONS[role as TenantUserRole] || [];
}
