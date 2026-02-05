/**
 * Permission Keys - String-based permission identifiers
 * 
 * Format: "resource.action"
 * This is the industry standard for RBAC systems.
 * Uses plural resource names to match database and navigation.
 */

// Dashboard permissions
export const DASHBOARD_READ = 'dashboard.read';

// Menu permissions
export const MENU_READ = 'menus.read';
export const MENU_CREATE = 'menus.create';
export const MENU_UPDATE = 'menus.update';
export const MENU_DELETE = 'menus.delete';
export const MENU_PUBLISH = 'menus.publish';

// Item permissions
export const ITEM_READ = 'items.read';
export const ITEM_CREATE = 'items.create';
export const ITEM_UPDATE = 'items.update';
export const ITEM_DELETE = 'items.delete';

// Section permissions
export const SECTION_READ = 'sections.read';
export const SECTION_CREATE = 'sections.create';
export const SECTION_UPDATE = 'sections.update';
export const SECTION_DELETE = 'sections.delete';

// Brand permissions
export const BRAND_READ = 'brands.read';
export const BRAND_CREATE = 'brands.create';
export const BRAND_UPDATE = 'brands.update';
export const BRAND_DELETE = 'brands.delete';

// Location permissions
export const LOCATION_READ = 'locations.read';
export const LOCATION_CREATE = 'locations.create';
export const LOCATION_UPDATE = 'locations.update';
export const LOCATION_DELETE = 'locations.delete';

// Publication permissions
export const PUBLICATION_READ = 'publications.read';
export const PUBLICATION_CREATE = 'publications.create';
export const PUBLICATION_UPDATE = 'publications.update';
export const PUBLICATION_DELETE = 'publications.delete';

// Ingredient permissions
export const INGREDIENT_READ = 'ingredients.read';
export const INGREDIENT_CREATE = 'ingredients.create';
export const INGREDIENT_UPDATE = 'ingredients.update';
export const INGREDIENT_DELETE = 'ingredients.delete';

// Option group permissions
export const OPTION_READ = 'options.read';
export const OPTION_CREATE = 'options.create';
export const OPTION_UPDATE = 'options.update';
export const OPTION_DELETE = 'options.delete';

// Staff/User management permissions
export const STAFF_READ = 'staff.read';
export const STAFF_CREATE = 'staff.create';
export const STAFF_UPDATE = 'staff.update';
export const STAFF_DELETE = 'staff.delete';

// Analytics
export const ANALYTICS_VIEW = 'analytics.read';

// Allergens & Dietary (read-only reference data)
export const ALLERGEN_READ = 'allergens.read';
export const DIETARY_READ = 'dietary.read';

// All permission keys as a type
export type PermissionKey =
  | typeof DASHBOARD_READ
  | typeof MENU_READ | typeof MENU_CREATE | typeof MENU_UPDATE | typeof MENU_DELETE | typeof MENU_PUBLISH
  | typeof ITEM_READ | typeof ITEM_CREATE | typeof ITEM_UPDATE | typeof ITEM_DELETE
  | typeof SECTION_READ | typeof SECTION_CREATE | typeof SECTION_UPDATE | typeof SECTION_DELETE
  | typeof LOCATION_READ | typeof LOCATION_CREATE | typeof LOCATION_UPDATE | typeof LOCATION_DELETE
  | typeof BRAND_READ | typeof BRAND_CREATE | typeof BRAND_UPDATE | typeof BRAND_DELETE
  | typeof PUBLICATION_READ | typeof PUBLICATION_CREATE | typeof PUBLICATION_UPDATE | typeof PUBLICATION_DELETE
  | typeof INGREDIENT_READ | typeof INGREDIENT_CREATE | typeof INGREDIENT_UPDATE | typeof INGREDIENT_DELETE
  | typeof OPTION_READ | typeof OPTION_CREATE | typeof OPTION_UPDATE | typeof OPTION_DELETE
  | typeof STAFF_READ | typeof STAFF_CREATE | typeof STAFF_UPDATE | typeof STAFF_DELETE
  | typeof ANALYTICS_VIEW
  | typeof ALLERGEN_READ | typeof DIETARY_READ;
