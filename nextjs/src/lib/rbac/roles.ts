/**
 * Role Definitions with Permission Mappings
 * 
 * 4-Role MVP: Admin, Manager, Chef, Waiter
 * Each role has a set of permissions it grants.
 * This is the central source of truth for what each role can do.
 */

import { TenantUserRole } from '@prisma/client';
import {
  PermissionKey,
  // Dashboard
  DASHBOARD_READ,
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
  // Orders
  ORDER_READ, ORDER_CREATE, ORDER_UPDATE, ORDER_DELETE,
  // Analytics
  ANALYTICS_VIEW, ANALYTICS_EXPORT,
  // Settings
  SETTINGS_READ, SETTINGS_UPDATE,
  // Reference data
  ALLERGEN_READ, DIETARY_READ,
  // Chatbot
  CHATBOT_READ,
  // Floor Plan
  FLOOR_LAYOUT_READ, FLOOR_LAYOUT_CREATE, FLOOR_LAYOUT_UPDATE, FLOOR_LAYOUT_DELETE, FLOOR_LAYOUT_PUBLISH,
  FLOOR_TABLE_READ, FLOOR_TABLE_CREATE, FLOOR_TABLE_UPDATE, FLOOR_TABLE_DELETE, FLOOR_TABLE_MERGE,
  // Payments
  PAYMENT_READ, PAYMENT_CREATE,
  // Feedback
  FEEDBACK_READ,
  // Sessions
  SESSION_READ, SESSION_CLOSE,
} from './permissions';

/**
 * Role hierarchy - higher index = higher privilege
 * 4-Role MVP: chef → waiter → manager → admin
 */
export const ROLE_HIERARCHY: TenantUserRole[] = [
  'chef',       // Level 0 — kitchen only
  'waiter',     // Level 1 — front of house
  'manager',    // Level 2 — daily operations (absorbed menu_editor)
  'admin',      // Level 3 — full control
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
  // Admin (was owner) — 👑 Full Control
  admin: [
    // Dashboard
    DASHBOARD_READ,
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
    // Orders
    ORDER_READ, ORDER_CREATE, ORDER_UPDATE, ORDER_DELETE,
    // Analytics
    ANALYTICS_VIEW, ANALYTICS_EXPORT,
    // Settings
    SETTINGS_READ, SETTINGS_UPDATE,
    // Reference data
    ALLERGEN_READ, DIETARY_READ,
    // Admin Chatbot
    CHATBOT_READ,
    // Floor Plan
    FLOOR_LAYOUT_READ, FLOOR_LAYOUT_CREATE, FLOOR_LAYOUT_UPDATE, FLOOR_LAYOUT_DELETE, FLOOR_LAYOUT_PUBLISH,
    FLOOR_TABLE_READ, FLOOR_TABLE_CREATE, FLOOR_TABLE_UPDATE, FLOOR_TABLE_DELETE, FLOOR_TABLE_MERGE,
    // Payments
    PAYMENT_READ, PAYMENT_CREATE,
    // Feedback
    FEEDBACK_READ,
    // Sessions
    SESSION_READ, SESSION_CLOSE,
  ],

  // Manager (absorbs menu_editor) — 📊 Daily Operations
  manager: [
    // Dashboard
    DASHBOARD_READ,
    // Menu — full CRUD + publish
    MENU_READ, MENU_CREATE, MENU_UPDATE, MENU_DELETE, MENU_PUBLISH,
    // Items — full CRUD
    ITEM_READ, ITEM_CREATE, ITEM_UPDATE, ITEM_DELETE,
    // Sections — full CRUD
    SECTION_READ, SECTION_CREATE, SECTION_UPDATE, SECTION_DELETE,
    // Brands — read + update only
    BRAND_READ, BRAND_UPDATE,
    // Locations — read + update only
    LOCATION_READ, LOCATION_UPDATE,
    // Publications — read + create + update (no delete)
    PUBLICATION_READ, PUBLICATION_CREATE, PUBLICATION_UPDATE,
    // Ingredients — full CRUD
    INGREDIENT_READ, INGREDIENT_CREATE, INGREDIENT_UPDATE, INGREDIENT_DELETE,
    // Options — full CRUD
    OPTION_READ, OPTION_CREATE, OPTION_UPDATE, OPTION_DELETE,
    // Staff — read + create + update (no delete)
    STAFF_READ, STAFF_CREATE, STAFF_UPDATE,
    // Orders — read + create + update (no delete)
    ORDER_READ, ORDER_CREATE, ORDER_UPDATE,
    // Analytics
    ANALYTICS_VIEW, ANALYTICS_EXPORT,
    // Settings — read only
    SETTINGS_READ,
    // Reference data
    ALLERGEN_READ, DIETARY_READ,
    // Admin Chatbot
    CHATBOT_READ,
    // Floor Plan — view only
    FLOOR_LAYOUT_READ, FLOOR_TABLE_READ,
    // Payments
    PAYMENT_READ, PAYMENT_CREATE,
    // Feedback
    FEEDBACK_READ,
    // Sessions
    SESSION_READ, SESSION_CLOSE,
  ],

  // Chef (was kitchen_staff) — 👨‍🍳 Kitchen Focus
  chef: [
    // Dashboard
    DASHBOARD_READ,
    // Items — read only
    ITEM_READ,
    // Sections — read only
    SECTION_READ,
    // Ingredients — read only
    INGREDIENT_READ,
    // Orders — read + update (status only)
    ORDER_READ, ORDER_UPDATE,
    // Reference data
    ALLERGEN_READ, DIETARY_READ,
  ],

  // Waiter (was foh_staff) — 🍽️ Front of House
  waiter: [
    // Dashboard
    DASHBOARD_READ,
    // Menus — read only
    MENU_READ,
    // Items — read only
    ITEM_READ,
    // Sections — read only
    SECTION_READ,
    // Locations — read only
    LOCATION_READ,
    // Orders — read + create + update
    ORDER_READ, ORDER_CREATE, ORDER_UPDATE,
    // Reference data
    ALLERGEN_READ, DIETARY_READ,
    // Floor Plan — view only
    FLOOR_LAYOUT_READ, FLOOR_TABLE_READ,
    // Sessions
    SESSION_READ,
    // Payments — read only
    PAYMENT_READ,
  ],
};

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: TenantUserRole | string): PermissionKey[] {
  return ROLE_PERMISSIONS[role as TenantUserRole] || [];
}
