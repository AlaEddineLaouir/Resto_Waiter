/**
 * Permission Keys - String-based permission identifiers
 * 
 * Format: "resource.action"
 * This is the industry standard for RBAC systems.
 */

// Menu permissions
export const MENU_READ = 'menu.read';
export const MENU_CREATE = 'menu.create';
export const MENU_UPDATE = 'menu.update';
export const MENU_DELETE = 'menu.delete';
export const MENU_PUBLISH = 'menu.publish';

// Item permissions
export const ITEM_READ = 'item.read';
export const ITEM_CREATE = 'item.create';
export const ITEM_UPDATE = 'item.update';
export const ITEM_DELETE = 'item.delete';

// Section permissions
export const SECTION_READ = 'section.read';
export const SECTION_CREATE = 'section.create';
export const SECTION_UPDATE = 'section.update';
export const SECTION_DELETE = 'section.delete';

// Brand permissions
export const BRAND_READ = 'brand.read';
export const BRAND_CREATE = 'brand.create';
export const BRAND_UPDATE = 'brand.update';
export const BRAND_DELETE = 'brand.delete';

// Location permissions
export const LOCATION_READ = 'location.read';
export const LOCATION_CREATE = 'location.create';
export const LOCATION_UPDATE = 'location.update';
export const LOCATION_DELETE = 'location.delete';

// Publication permissions
export const PUBLICATION_READ = 'publication.read';
export const PUBLICATION_CREATE = 'publication.create';
export const PUBLICATION_UPDATE = 'publication.update';
export const PUBLICATION_DELETE = 'publication.delete';

// Ingredient permissions
export const INGREDIENT_READ = 'ingredient.read';
export const INGREDIENT_CREATE = 'ingredient.create';
export const INGREDIENT_UPDATE = 'ingredient.update';
export const INGREDIENT_DELETE = 'ingredient.delete';

// Option group permissions
export const OPTION_READ = 'option.read';
export const OPTION_CREATE = 'option.create';
export const OPTION_UPDATE = 'option.update';
export const OPTION_DELETE = 'option.delete';

// Staff/User management permissions
export const STAFF_READ = 'staff.read';
export const STAFF_CREATE = 'staff.create';
export const STAFF_UPDATE = 'staff.update';
export const STAFF_DELETE = 'staff.delete';

// Dashboard & Analytics
export const DASHBOARD_VIEW = 'dashboard.view';
export const ANALYTICS_VIEW = 'analytics.view';

// Allergens & Dietary (read-only reference data)
export const ALLERGEN_READ = 'allergen.read';
export const DIETARY_READ = 'dietary.read';

// All permission keys as a type
export type PermissionKey =
  | typeof MENU_READ | typeof MENU_CREATE | typeof MENU_UPDATE | typeof MENU_DELETE | typeof MENU_PUBLISH
  | typeof ITEM_READ | typeof ITEM_CREATE | typeof ITEM_UPDATE | typeof ITEM_DELETE
  | typeof SECTION_READ | typeof SECTION_CREATE | typeof SECTION_UPDATE | typeof SECTION_DELETE
  | typeof LOCATION_READ | typeof LOCATION_CREATE | typeof LOCATION_UPDATE | typeof LOCATION_DELETE
  | typeof BRAND_READ | typeof BRAND_CREATE | typeof BRAND_UPDATE | typeof BRAND_DELETE
  | typeof PUBLICATION_READ | typeof PUBLICATION_CREATE | typeof PUBLICATION_UPDATE | typeof PUBLICATION_DELETE
  | typeof INGREDIENT_READ | typeof INGREDIENT_CREATE | typeof INGREDIENT_UPDATE | typeof INGREDIENT_DELETE
  | typeof OPTION_READ | typeof OPTION_CREATE | typeof OPTION_UPDATE | typeof OPTION_DELETE
  | typeof STAFF_READ | typeof STAFF_CREATE | typeof STAFF_UPDATE | typeof STAFF_DELETE
  | typeof DASHBOARD_VIEW | typeof ANALYTICS_VIEW
  | typeof ALLERGEN_READ | typeof DIETARY_READ;
