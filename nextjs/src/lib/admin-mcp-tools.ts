/**
 * Admin MCP Tools for Restaurant Menu Management
 * 
 * CRUD operations for menu items, sections, ingredients, locations, and more
 * All tools respect RBAC permissions
 */

import { prisma } from '@/lib/prisma';
import { PermissionKey } from '@/lib/rbac/permissions';

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  success?: boolean;
  data?: unknown;
}

interface AdminSession {
  adminId: string;
  tenantId: string;
  role: string;
  permissions: string[];
}

// Helper to check if user has permission
function hasPermission(session: AdminSession, permission: PermissionKey): boolean {
  if (session.role === 'admin') return true;
  return session.permissions.includes(permission);
}

// ============================================
// ADMIN TOOL DEFINITIONS (for AI SDK)
// ============================================

export const adminMenuTools = {
  // ============================================
  // MENU ITEM MANAGEMENT
  // ============================================
  create_menu_item: {
    description: 'Create a new menu item with name, description, price, section, and optional ingredients/allergens',
    parameters: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Name of the menu item' },
        description: { type: 'string', description: 'Description of the item' },
        price: { type: 'number', description: 'Price in the base currency (e.g., 12.99)' },
        sectionId: { type: 'string', description: 'ID of the section to add the item to' },
        sectionName: { type: 'string', description: 'Name of the section (if sectionId not provided)' },
        locale: { type: 'string', description: 'Locale for translations (default: en-US)' },
        spicinessLevel: { type: 'number', description: 'Spiciness level 0-5 (optional)' },
        calories: { type: 'number', description: 'Calorie count (optional)' },
        ingredientNames: { type: 'array', items: { type: 'string' }, description: 'List of ingredient names to add' },
        allergenCodes: { type: 'array', items: { type: 'string' }, description: 'Allergen codes (e.g., gluten, dairy)' },
        dietaryFlags: { type: 'array', items: { type: 'string' }, description: 'Dietary flags (e.g., vegetarian, vegan)' },
      },
      required: ['name', 'price'],
    },
  },
  update_menu_item: {
    description: 'Update an existing menu item (name, price, description, visibility, etc.)',
    parameters: {
      type: 'object' as const,
      properties: {
        itemId: { type: 'string', description: 'ID of the item to update' },
        itemName: { type: 'string', description: 'Name of the item to update (if itemId not provided)' },
        name: { type: 'string', description: 'New name for the item' },
        description: { type: 'string', description: 'New description' },
        price: { type: 'number', description: 'New price' },
        isVisible: { type: 'boolean', description: 'Visibility status' },
        spicinessLevel: { type: 'number', description: 'New spiciness level' },
        calories: { type: 'number', description: 'New calorie count' },
        locale: { type: 'string', description: 'Locale for translations' },
      },
      required: [],
    },
  },
  delete_menu_item: {
    description: 'Remove a menu item from the menu permanently',
    parameters: {
      type: 'object' as const,
      properties: {
        itemId: { type: 'string', description: 'ID of the item to delete' },
        itemName: { type: 'string', description: 'Name of the item to delete (if itemId not provided)' },
      },
      required: [],
    },
  },
  toggle_menu_item_visibility: {
    description: 'Enable or disable visibility of a menu item for customers',
    parameters: {
      type: 'object' as const,
      properties: {
        itemId: { type: 'string', description: 'ID of the item' },
        itemName: { type: 'string', description: 'Name of the item (if itemId not provided)' },
        isVisible: { type: 'boolean', description: 'Set to true to show, false to hide' },
      },
      required: ['isVisible'],
    },
  },
  duplicate_menu_item: {
    description: 'Clone an existing menu item with a new name',
    parameters: {
      type: 'object' as const,
      properties: {
        itemId: { type: 'string', description: 'ID of the item to duplicate' },
        itemName: { type: 'string', description: 'Name of the item to duplicate' },
        newName: { type: 'string', description: 'Name for the duplicated item' },
      },
      required: ['newName'],
    },
  },
  list_menu_items: {
    description: 'List all menu items, optionally filtered by section',
    parameters: {
      type: 'object' as const,
      properties: {
        sectionId: { type: 'string', description: 'Filter by section ID' },
        sectionName: { type: 'string', description: 'Filter by section name' },
        includeHidden: { type: 'boolean', description: 'Include hidden items' },
        locale: { type: 'string', description: 'Locale for translations' },
      },
      required: [],
    },
  },
  search_menu_items: {
    description: 'Search menu items by name, description, or ingredient',
    parameters: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        locale: { type: 'string', description: 'Locale for search' },
      },
      required: ['query'],
    },
  },

  // ============================================
  // SECTION MANAGEMENT
  // ============================================
  create_section: {
    description: 'Create a new menu section (e.g., Appetizers, Mains, Desserts)',
    parameters: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Title of the section' },
        description: { type: 'string', description: 'Description of the section' },
        locale: { type: 'string', description: 'Locale for translations (default: en-US)' },
      },
      required: ['title'],
    },
  },
  update_section: {
    description: 'Update an existing section name or description',
    parameters: {
      type: 'object' as const,
      properties: {
        sectionId: { type: 'string', description: 'ID of the section to update' },
        sectionName: { type: 'string', description: 'Current name of section (if ID not provided)' },
        title: { type: 'string', description: 'New title for the section' },
        description: { type: 'string', description: 'New description' },
        isActive: { type: 'boolean', description: 'Active status' },
        locale: { type: 'string', description: 'Locale for translations' },
      },
      required: [],
    },
  },
  delete_section: {
    description: 'Remove a section from the menu (items in section must be moved first)',
    parameters: {
      type: 'object' as const,
      properties: {
        sectionId: { type: 'string', description: 'ID of the section to delete' },
        sectionName: { type: 'string', description: 'Name of the section (if ID not provided)' },
        force: { type: 'boolean', description: 'Force delete even if section has items' },
      },
      required: [],
    },
  },
  list_sections: {
    description: 'Get all menu sections',
    parameters: {
      type: 'object' as const,
      properties: {
        includeInactive: { type: 'boolean', description: 'Include inactive sections' },
        locale: { type: 'string', description: 'Locale for translations' },
      },
      required: [],
    },
  },

  // ============================================
  // INGREDIENT MANAGEMENT
  // ============================================
  create_ingredient: {
    description: 'Add a new ingredient to the database',
    parameters: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Name of the ingredient' },
        allergenCodes: { type: 'array', items: { type: 'string' }, description: 'Associated allergen codes' },
      },
      required: ['name'],
    },
  },
  update_ingredient: {
    description: 'Update ingredient details',
    parameters: {
      type: 'object' as const,
      properties: {
        ingredientId: { type: 'string', description: 'ID of the ingredient' },
        ingredientName: { type: 'string', description: 'Current name (if ID not provided)' },
        name: { type: 'string', description: 'New name' },
        isAvailable: { type: 'boolean', description: 'Availability status' },
      },
      required: [],
    },
  },
  delete_ingredient: {
    description: 'Remove an ingredient from the database',
    parameters: {
      type: 'object' as const,
      properties: {
        ingredientId: { type: 'string', description: 'ID of the ingredient' },
        ingredientName: { type: 'string', description: 'Name (if ID not provided)' },
      },
      required: [],
    },
  },
  list_ingredients: {
    description: 'Get all ingredients in the system',
    parameters: {
      type: 'object' as const,
      properties: {
        search: { type: 'string', description: 'Optional search filter' },
      },
      required: [],
    },
  },
  link_ingredient_to_item: {
    description: 'Associate an ingredient with a menu item',
    parameters: {
      type: 'object' as const,
      properties: {
        itemId: { type: 'string', description: 'ID of the menu item' },
        itemName: { type: 'string', description: 'Name of item (if ID not provided)' },
        ingredientId: { type: 'string', description: 'ID of the ingredient' },
        ingredientName: { type: 'string', description: 'Name of ingredient (if ID not provided)' },
        isOptional: { type: 'boolean', description: 'Whether ingredient is optional' },
      },
      required: [],
    },
  },
  unlink_ingredient_from_item: {
    description: 'Remove ingredient association from a menu item',
    parameters: {
      type: 'object' as const,
      properties: {
        itemId: { type: 'string', description: 'ID of the menu item' },
        itemName: { type: 'string', description: 'Name of item (if ID not provided)' },
        ingredientId: { type: 'string', description: 'ID of the ingredient' },
        ingredientName: { type: 'string', description: 'Name of ingredient (if ID not provided)' },
      },
      required: [],
    },
  },

  // ============================================
  // LOCATION MANAGEMENT
  // ============================================
  create_location: {
    description: 'Add a new restaurant location',
    parameters: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Name of the location' },
        brandId: { type: 'string', description: 'Brand ID for this location' },
        addressLine1: { type: 'string', description: 'Street address' },
        city: { type: 'string', description: 'City' },
        postalCode: { type: 'string', description: 'Postal code' },
        phone: { type: 'string', description: 'Phone number' },
        email: { type: 'string', description: 'Email address' },
      },
      required: ['name', 'brandId'],
    },
  },
  update_location: {
    description: 'Update location details',
    parameters: {
      type: 'object' as const,
      properties: {
        locationId: { type: 'string', description: 'ID of the location' },
        locationName: { type: 'string', description: 'Name (if ID not provided)' },
        name: { type: 'string', description: 'New name' },
        addressLine1: { type: 'string', description: 'New address' },
        city: { type: 'string', description: 'New city' },
        phone: { type: 'string', description: 'New phone' },
        isActive: { type: 'boolean', description: 'Active status' },
      },
      required: [],
    },
  },
  list_locations: {
    description: 'Get all restaurant locations',
    parameters: {
      type: 'object' as const,
      properties: {
        includeInactive: { type: 'boolean', description: 'Include inactive locations' },
      },
      required: [],
    },
  },

  // ============================================
  // PRICING MANAGEMENT
  // ============================================
  update_item_price: {
    description: 'Update the price of a menu item',
    parameters: {
      type: 'object' as const,
      properties: {
        itemId: { type: 'string', description: 'ID of the item' },
        itemName: { type: 'string', description: 'Name of the item (if ID not provided)' },
        price: { type: 'number', description: 'New price in base currency' },
        currency: { type: 'string', description: 'Currency code (default: EUR)' },
      },
      required: ['price'],
    },
  },
  bulk_update_prices: {
    description: 'Update prices for multiple items at once',
    parameters: {
      type: 'object' as const,
      properties: {
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              itemId: { type: 'string' },
              itemName: { type: 'string' },
              price: { type: 'number' },
            },
          },
          description: 'Array of items and their new prices',
        },
      },
      required: ['updates'],
    },
  },
  apply_percentage_increase: {
    description: 'Apply a percentage price increase to items in a section or all items',
    parameters: {
      type: 'object' as const,
      properties: {
        percentage: { type: 'number', description: 'Percentage increase (e.g., 10 for 10%)' },
        sectionId: { type: 'string', description: 'Apply only to items in this section' },
        sectionName: { type: 'string', description: 'Section name (if ID not provided)' },
      },
      required: ['percentage'],
    },
  },

  // ============================================
  // ALLERGEN & DIETARY MANAGEMENT
  // ============================================
  list_allergens: {
    description: 'Get all allergen types in the system',
    parameters: {
      type: 'object' as const,
      properties: {
        locale: { type: 'string', description: 'Locale for translations' },
      },
      required: [],
    },
  },
  list_dietary_flags: {
    description: 'Get all dietary flags (vegetarian, vegan, halal, etc.)',
    parameters: {
      type: 'object' as const,
      properties: {
        locale: { type: 'string', description: 'Locale for translations' },
      },
      required: [],
    },
  },
  tag_menu_item: {
    description: 'Apply dietary or allergen tags to a menu item',
    parameters: {
      type: 'object' as const,
      properties: {
        itemId: { type: 'string', description: 'ID of the menu item' },
        itemName: { type: 'string', description: 'Name of item (if ID not provided)' },
        allergenCodes: { type: 'array', items: { type: 'string' }, description: 'Allergen codes to add' },
        dietaryFlags: { type: 'array', items: { type: 'string' }, description: 'Dietary flags to add' },
      },
      required: [],
    },
  },
  untag_menu_item: {
    description: 'Remove dietary or allergen tags from a menu item',
    parameters: {
      type: 'object' as const,
      properties: {
        itemId: { type: 'string', description: 'ID of the menu item' },
        itemName: { type: 'string', description: 'Name of item (if ID not provided)' },
        allergenCodes: { type: 'array', items: { type: 'string' }, description: 'Allergen codes to remove' },
        dietaryFlags: { type: 'array', items: { type: 'string' }, description: 'Dietary flags to remove' },
      },
      required: [],
    },
  },
  get_items_by_dietary_tag: {
    description: 'Find menu items matching dietary requirements',
    parameters: {
      type: 'object' as const,
      properties: {
        dietaryFlag: { type: 'string', description: 'Dietary flag to search for (e.g., vegetarian)' },
        excludeAllergens: { type: 'array', items: { type: 'string' }, description: 'Allergens to exclude' },
      },
      required: ['dietaryFlag'],
    },
  },

  // ============================================
  // MENU MANAGEMENT
  // ============================================
  list_menus: {
    description: 'Get all menus for the restaurant',
    parameters: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by status (draft, published, archived)' },
        locale: { type: 'string', description: 'Locale for translations' },
      },
      required: [],
    },
  },
  publish_menu: {
    description: 'Publish a menu to make it visible to customers',
    parameters: {
      type: 'object' as const,
      properties: {
        menuId: { type: 'string', description: 'ID of the menu to publish' },
        menuName: { type: 'string', description: 'Name of menu (if ID not provided)' },
      },
      required: [],
    },
  },
  unpublish_menu: {
    description: 'Unpublish a menu (set to draft)',
    parameters: {
      type: 'object' as const,
      properties: {
        menuId: { type: 'string', description: 'ID of the menu to unpublish' },
        menuName: { type: 'string', description: 'Name of menu (if ID not provided)' },
      },
      required: [],
    },
  },

  // ============================================
  // ANALYTICS & REPORTING
  // ============================================
  get_menu_statistics: {
    description: 'Get statistics about menu items',
    parameters: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  get_price_summary: {
    description: 'Get price summary (min, max, average) by section',
    parameters: {
      type: 'object' as const,
      properties: {
        sectionId: { type: 'string', description: 'Optional section filter' },
      },
      required: [],
    },
  },

  // ============================================
  // LOCATION MENU MANAGEMENT
  // ============================================
  activate_menu_for_location: {
    description: 'Activate/publish a menu for a specific location so customers can see it',
    parameters: {
      type: 'object' as const,
      properties: {
        menuId: { type: 'string', description: 'ID of the menu to activate' },
        menuName: { type: 'string', description: 'Name of the menu (if ID not provided)' },
        locationId: { type: 'string', description: 'ID of the location' },
        locationName: { type: 'string', description: 'Name of the location (if ID not provided)' },
      },
      required: [],
    },
  },
  deactivate_menu_for_location: {
    description: 'Deactivate/unpublish a menu for a specific location so customers cannot see it',
    parameters: {
      type: 'object' as const,
      properties: {
        menuId: { type: 'string', description: 'ID of the menu to deactivate' },
        menuName: { type: 'string', description: 'Name of the menu (if ID not provided)' },
        locationId: { type: 'string', description: 'ID of the location' },
        locationName: { type: 'string', description: 'Name of the location (if ID not provided)' },
      },
      required: [],
    },
  },
  get_location_menus: {
    description: 'Get all menus assigned to a specific location with their activation status',
    parameters: {
      type: 'object' as const,
      properties: {
        locationId: { type: 'string', description: 'ID of the location' },
        locationName: { type: 'string', description: 'Name of the location (if ID not provided)' },
      },
      required: [],
    },
  },
  list_menu_publications: {
    description: 'List all menu publications showing which menus are active at which locations',
    parameters: {
      type: 'object' as const,
      properties: {
        activeOnly: { type: 'boolean', description: 'Only show currently active publications' },
      },
      required: [],
    },
  },
};

// ============================================
// TOOL EXECUTION FUNCTIONS
// ============================================

// Helper to find item by ID or name
async function findItem(tenantId: string, itemId?: string, itemName?: string) {
  if (itemId) {
    return prisma.item.findFirst({ where: { id: itemId, tenantId } });
  }
  if (itemName) {
    return prisma.item.findFirst({
      where: {
        tenantId,
        translations: { some: { name: { contains: itemName, mode: 'insensitive' } } },
      },
    });
  }
  return null;
}

// Helper to find section by ID or name
async function findSection(tenantId: string, sectionId?: string, sectionName?: string) {
  if (sectionId) {
    return prisma.section.findFirst({ where: { id: sectionId, tenantId } });
  }
  if (sectionName) {
    return prisma.section.findFirst({
      where: {
        tenantId,
        translations: { some: { title: { contains: sectionName, mode: 'insensitive' } } },
      },
    });
  }
  return null;
}

// Helper to find ingredient by ID or name
async function findIngredient(tenantId: string, ingredientId?: string, ingredientName?: string) {
  if (ingredientId) {
    return prisma.ingredient.findFirst({ where: { id: ingredientId, tenantId } });
  }
  if (ingredientName) {
    return prisma.ingredient.findFirst({
      where: { tenantId, name: { contains: ingredientName, mode: 'insensitive' } },
    });
  }
  return null;
}

// Helper to find menu by ID or name
async function findMenu(tenantId: string, menuId?: string, menuName?: string) {
  if (menuId) {
    return prisma.menu.findFirst({ 
      where: { id: menuId, tenantId },
      include: { translations: true },
    });
  }
  if (menuName) {
    return prisma.menu.findFirst({
      where: {
        tenantId,
        translations: { some: { name: { contains: menuName, mode: 'insensitive' } } },
      },
      include: { translations: true },
    });
  }
  return null;
}

// Helper to find location by ID or name
async function findLocation(tenantId: string, locationId?: string, locationName?: string) {
  if (locationId) {
    return prisma.location.findFirst({ where: { id: locationId, tenantId } });
  }
  if (locationName) {
    return prisma.location.findFirst({
      where: { tenantId, name: { contains: locationName, mode: 'insensitive' } },
    });
  }
  return null;
}

// ============================================
// MENU ITEM OPERATIONS
// ============================================

export async function executeCreateMenuItem(
  session: AdminSession,
  params: {
    name: string;
    description?: string;
    price: number;
    sectionId?: string;
    sectionName?: string;
    locale?: string;
    spicinessLevel?: number;
    calories?: number;
    ingredientNames?: string[];
    allergenCodes?: string[];
    dietaryFlags?: string[];
  }
): Promise<ToolResult> {
  if (!hasPermission(session, 'items.create')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to create menu items.' }], success: false };
  }

  const locale = params.locale || 'en-US';

  // Find or validate section
  let section = await findSection(session.tenantId, params.sectionId, params.sectionName);
  if (!section) {
    // Create a default section if none specified
    section = await prisma.section.create({
      data: {
        tenantId: session.tenantId,
        translations: {
          create: { tenantId: session.tenantId, locale, title: params.sectionName || 'General' },
        },
      },
    });
  }

  try {
    const item = await prisma.$transaction(async (tx) => {
      // Create the item
      const newItem = await tx.item.create({
        data: {
          tenantId: session.tenantId,
          sectionId: section!.id,
          spicinessLevel: params.spicinessLevel,
          calories: params.calories,
          translations: {
            create: {
              tenantId: session.tenantId,
              locale,
              name: params.name,
              description: params.description,
            },
          },
        },
      });

      // Create price
      await tx.itemPriceBase.create({
        data: {
          tenantId: session.tenantId,
          itemId: newItem.id,
          currency: 'EUR',
          amountMinor: BigInt(Math.round(params.price * 100)),
        },
      });

      // Link ingredients if provided
      if (params.ingredientNames && params.ingredientNames.length > 0) {
        for (const ingredientName of params.ingredientNames) {
          let ingredient = await tx.ingredient.findFirst({
            where: { tenantId: session.tenantId, name: { equals: ingredientName, mode: 'insensitive' } },
          });
          if (!ingredient) {
            ingredient = await tx.ingredient.create({
              data: { tenantId: session.tenantId, name: ingredientName },
            });
          }
          await tx.itemIngredient.create({
            data: {
              tenantId: session.tenantId,
              itemId: newItem.id,
              ingredientId: ingredient.id,
            },
          });
        }
      }

      // Link allergens if provided
      if (params.allergenCodes && params.allergenCodes.length > 0) {
        for (const code of params.allergenCodes) {
          const allergen = await tx.allergen.findUnique({ where: { code } });
          if (allergen) {
            await tx.itemAllergen.create({
              data: { tenantId: session.tenantId, itemId: newItem.id, allergenCode: code },
            });
          }
        }
      }

      // Link dietary flags if provided
      if (params.dietaryFlags && params.dietaryFlags.length > 0) {
        for (const code of params.dietaryFlags) {
          const flag = await tx.dietaryFlag.findUnique({ where: { code } });
          if (flag) {
            await tx.itemDietaryFlag.create({
              data: { tenantId: session.tenantId, itemId: newItem.id, dietaryFlagCode: code },
            });
          }
        }
      }

      return newItem;
    });

    return {
      content: [{ type: 'text', text: `✅ Menu item "${params.name}" created successfully at €${params.price.toFixed(2)}!` }],
      success: true,
      data: { itemId: item.id },
    };
  } catch (error) {
    console.error('Create menu item error:', error);
    return { content: [{ type: 'text', text: '❌ Failed to create menu item.' }], success: false };
  }
}

export async function executeUpdateMenuItem(
  session: AdminSession,
  params: {
    itemId?: string;
    itemName?: string;
    name?: string;
    description?: string;
    price?: number;
    isVisible?: boolean;
    spicinessLevel?: number;
    calories?: number;
    locale?: string;
  }
): Promise<ToolResult> {
  if (!hasPermission(session, 'items.update')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to update menu items.' }], success: false };
  }

  const item = await findItem(session.tenantId, params.itemId, params.itemName);
  if (!item) {
    return { content: [{ type: 'text', text: '❌ Menu item not found.' }], success: false };
  }

  const locale = params.locale || 'en-US';

  try {
    await prisma.$transaction(async (tx) => {
      // Update item entity
      const updateData: { isVisible?: boolean; spicinessLevel?: number; calories?: number } = {};
      if (params.isVisible !== undefined) updateData.isVisible = params.isVisible;
      if (params.spicinessLevel !== undefined) updateData.spicinessLevel = params.spicinessLevel;
      if (params.calories !== undefined) updateData.calories = params.calories;

      if (Object.keys(updateData).length > 0) {
        await tx.item.update({ where: { id: item.id }, data: updateData });
      }

      // Update translations
      if (params.name || params.description) {
        await tx.itemI18n.upsert({
          where: { tenantId_itemId_locale: { tenantId: session.tenantId, itemId: item.id, locale } },
          update: {
            ...(params.name && { name: params.name }),
            ...(params.description && { description: params.description }),
          },
          create: {
            tenantId: session.tenantId,
            itemId: item.id,
            locale,
            name: params.name || 'Item',
            description: params.description,
          },
        });
      }

      // Update price
      if (params.price !== undefined) {
        await tx.itemPriceBase.upsert({
          where: { itemId: item.id },
          update: { amountMinor: BigInt(Math.round(params.price * 100)) },
          create: {
            tenantId: session.tenantId,
            itemId: item.id,
            currency: 'EUR',
            amountMinor: BigInt(Math.round(params.price * 100)),
          },
        });
      }
    });

    const updates = [];
    if (params.name) updates.push(`name to "${params.name}"`);
    if (params.price !== undefined) updates.push(`price to €${params.price.toFixed(2)}`);
    if (params.isVisible !== undefined) updates.push(`visibility to ${params.isVisible ? 'visible' : 'hidden'}`);

    return {
      content: [{ type: 'text', text: `✅ Menu item updated: ${updates.join(', ')}` }],
      success: true,
    };
  } catch (error) {
    console.error('Update menu item error:', error);
    return { content: [{ type: 'text', text: '❌ Failed to update menu item.' }], success: false };
  }
}

export async function executeDeleteMenuItem(
  session: AdminSession,
  params: { itemId?: string; itemName?: string }
): Promise<ToolResult> {
  if (!hasPermission(session, 'items.delete')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to delete menu items.' }], success: false };
  }

  const item = await findItem(session.tenantId, params.itemId, params.itemName);
  if (!item) {
    return { content: [{ type: 'text', text: '❌ Menu item not found.' }], success: false };
  }

  try {
    // Get item name before deletion
    const translation = await prisma.itemI18n.findFirst({ where: { itemId: item.id } });
    const itemName = translation?.name || 'Item';

    await prisma.item.delete({ where: { id: item.id } });

    return {
      content: [{ type: 'text', text: `✅ Menu item "${itemName}" deleted successfully.` }],
      success: true,
    };
  } catch (error) {
    console.error('Delete menu item error:', error);
    return { content: [{ type: 'text', text: '❌ Failed to delete menu item.' }], success: false };
  }
}

export async function executeToggleItemVisibility(
  session: AdminSession,
  params: { itemId?: string; itemName?: string; isVisible: boolean }
): Promise<ToolResult> {
  if (!hasPermission(session, 'items.update')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to update menu items.' }], success: false };
  }

  const item = await findItem(session.tenantId, params.itemId, params.itemName);
  if (!item) {
    return { content: [{ type: 'text', text: '❌ Menu item not found.' }], success: false };
  }

  try {
    await prisma.item.update({ where: { id: item.id }, data: { isVisible: params.isVisible } });

    const translation = await prisma.itemI18n.findFirst({ where: { itemId: item.id } });
    const itemName = translation?.name || 'Item';

    return {
      content: [{ type: 'text', text: `✅ "${itemName}" is now ${params.isVisible ? 'visible' : 'hidden'} to customers.` }],
      success: true,
    };
  } catch (error) {
    console.error('Toggle visibility error:', error);
    return { content: [{ type: 'text', text: '❌ Failed to update visibility.' }], success: false };
  }
}

export async function executeListMenuItems(
  session: AdminSession,
  params: { sectionId?: string; sectionName?: string; includeHidden?: boolean; locale?: string }
): Promise<ToolResult> {
  if (!hasPermission(session, 'items.read')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to view menu items.' }], success: false };
  }

  const locale = params.locale || 'en-US';
  let sectionFilter = {};

  if (params.sectionId || params.sectionName) {
    const section = await findSection(session.tenantId, params.sectionId, params.sectionName);
    if (section) {
      sectionFilter = { sectionId: section.id };
    }
  }

  const items = await prisma.item.findMany({
    where: {
      tenantId: session.tenantId,
      ...sectionFilter,
      ...(params.includeHidden ? {} : { isVisible: true }),
    },
    include: {
      translations: true,
      priceBase: true,
      section: { include: { translations: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (items.length === 0) {
    return { content: [{ type: 'text', text: '📋 No menu items found.' }], success: true };
  }

  let text = `📋 **Menu Items** (${items.length} total)\n\n`;
  for (const item of items) {
    const trans = item.translations.find(t => t.locale === locale) || item.translations[0];
    const secTrans = item.section.translations.find(t => t.locale === locale) || item.section.translations[0];
    const price = item.priceBase ? `€${(Number(item.priceBase.amountMinor) / 100).toFixed(2)}` : 'No price';
    const visibility = item.isVisible ? '' : ' 🚫 Hidden';

    text += `• **${trans?.name || 'Item'}** - ${price}${visibility}\n`;
    text += `  Section: ${secTrans?.title || 'Unknown'}\n`;
    if (trans?.description) text += `  ${trans.description}\n`;
    text += '\n';
  }

  return { content: [{ type: 'text', text }], success: true };
}

// ============================================
// SECTION OPERATIONS
// ============================================

export async function executeCreateSection(
  session: AdminSession,
  params: { title: string; description?: string; locale?: string }
): Promise<ToolResult> {
  if (!hasPermission(session, 'sections.create')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to create sections.' }], success: false };
  }

  const locale = params.locale || 'en-US';

  try {
    const section = await prisma.section.create({
      data: {
        tenantId: session.tenantId,
        translations: {
          create: {
            tenantId: session.tenantId,
            locale,
            title: params.title,
            description: params.description,
          },
        },
      },
    });

    return {
      content: [{ type: 'text', text: `✅ Section "${params.title}" created successfully!` }],
      success: true,
      data: { sectionId: section.id },
    };
  } catch (error) {
    console.error('Create section error:', error);
    return { content: [{ type: 'text', text: '❌ Failed to create section.' }], success: false };
  }
}

export async function executeListSections(
  session: AdminSession,
  params: { includeInactive?: boolean; locale?: string }
): Promise<ToolResult> {
  if (!hasPermission(session, 'sections.read')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to view sections.' }], success: false };
  }

  const locale = params.locale || 'en-US';

  const sections = await prisma.section.findMany({
    where: {
      tenantId: session.tenantId,
      ...(params.includeInactive ? {} : { isActive: true }),
    },
    include: {
      translations: true,
      items: { select: { id: true } },
    },
  });

  if (sections.length === 0) {
    return { content: [{ type: 'text', text: '📂 No sections found.' }], success: true };
  }

  let text = `📂 **Menu Sections** (${sections.length} total)\n\n`;
  for (const section of sections) {
    const trans = section.translations.find(t => t.locale === locale) || section.translations[0];
    const status = section.isActive ? '' : ' 🚫 Inactive';

    text += `• **${trans?.title || 'Section'}**${status} (${section.items.length} items)\n`;
    if (trans?.description) text += `  ${trans.description}\n`;
    text += '\n';
  }

  return { content: [{ type: 'text', text }], success: true };
}

// ============================================
// INGREDIENT OPERATIONS
// ============================================

export async function executeListIngredients(
  session: AdminSession,
  params: { search?: string }
): Promise<ToolResult> {
  if (!hasPermission(session, 'ingredients.read')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to view ingredients.' }], success: false };
  }

  const ingredients = await prisma.ingredient.findMany({
    where: {
      tenantId: session.tenantId,
      ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
    },
    include: {
      items: { select: { id: true } },
    },
    orderBy: { name: 'asc' },
  });

  if (ingredients.length === 0) {
    return { content: [{ type: 'text', text: '🥗 No ingredients found.' }], success: true };
  }

  let text = `🥗 **Ingredients** (${ingredients.length} total)\n\n`;
  for (const ingredient of ingredients) {
    text += `• ${ingredient.name} (used in ${ingredient.items.length} items)\n`;
  }

  return { content: [{ type: 'text', text }], success: true };
}

export async function executeCreateIngredient(
  session: AdminSession,
  params: { name: string; allergenCodes?: string[] }
): Promise<ToolResult> {
  if (!hasPermission(session, 'ingredients.create')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to create ingredients.' }], success: false };
  }

  try {
    const ingredient = await prisma.ingredient.create({
      data: {
        tenantId: session.tenantId,
        name: params.name,
      },
    });

    return {
      content: [{ type: 'text', text: `✅ Ingredient "${params.name}" created successfully!` }],
      success: true,
      data: { ingredientId: ingredient.id },
    };
  } catch (error) {
    console.error('Create ingredient error:', error);
    return { content: [{ type: 'text', text: '❌ Failed to create ingredient.' }], success: false };
  }
}

// ============================================
// PRICING OPERATIONS
// ============================================

export async function executeUpdateItemPrice(
  session: AdminSession,
  params: { itemId?: string; itemName?: string; price: number; currency?: string }
): Promise<ToolResult> {
  if (!hasPermission(session, 'items.update')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to update prices.' }], success: false };
  }

  const item = await findItem(session.tenantId, params.itemId, params.itemName);
  if (!item) {
    return { content: [{ type: 'text', text: '❌ Menu item not found.' }], success: false };
  }

  try {
    await prisma.itemPriceBase.upsert({
      where: { itemId: item.id },
      update: { amountMinor: BigInt(Math.round(params.price * 100)) },
      create: {
        tenantId: session.tenantId,
        itemId: item.id,
        currency: params.currency || 'EUR',
        amountMinor: BigInt(Math.round(params.price * 100)),
      },
    });

    const translation = await prisma.itemI18n.findFirst({ where: { itemId: item.id } });
    const itemName = translation?.name || 'Item';

    return {
      content: [{ type: 'text', text: `✅ Price for "${itemName}" updated to €${params.price.toFixed(2)}` }],
      success: true,
    };
  } catch (error) {
    console.error('Update price error:', error);
    return { content: [{ type: 'text', text: '❌ Failed to update price.' }], success: false };
  }
}

// ============================================
// STATISTICS OPERATIONS
// ============================================

export async function executeGetMenuStatistics(
  session: AdminSession
): Promise<ToolResult> {
  if (!hasPermission(session, 'items.read')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to view statistics.' }], success: false };
  }

  const [itemCount, sectionCount, ingredientCount, hiddenItems, menus] = await Promise.all([
    prisma.item.count({ where: { tenantId: session.tenantId } }),
    prisma.section.count({ where: { tenantId: session.tenantId } }),
    prisma.ingredient.count({ where: { tenantId: session.tenantId } }),
    prisma.item.count({ where: { tenantId: session.tenantId, isVisible: false } }),
    prisma.menu.findMany({ where: { tenantId: session.tenantId }, select: { status: true } }),
  ]);

  const publishedMenus = menus.filter(m => m.status === 'published').length;
  const draftMenus = menus.filter(m => m.status === 'draft').length;

  const text = `📊 **Menu Statistics**

📋 **Items:** ${itemCount} total (${hiddenItems} hidden)
📂 **Sections:** ${sectionCount}
🥗 **Ingredients:** ${ingredientCount}
📖 **Menus:** ${menus.length} total
  - Published: ${publishedMenus}
  - Draft: ${draftMenus}`;

  return { content: [{ type: 'text', text }], success: true };
}

// ============================================
// LIST MENUS & LOCATIONS
// ============================================

export async function executeListMenus(
  session: AdminSession
): Promise<ToolResult> {
  if (!hasPermission(session, 'menus.read')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to view menus.' }], success: false };
  }

  const menus = await prisma.menu.findMany({
    where: { tenantId: session.tenantId },
    include: { translations: true },
    orderBy: { createdAt: 'desc' },
  });

  if (menus.length === 0) {
    return { content: [{ type: 'text', text: '📋 No menus found.' }], success: true };
  }

  let text = `📋 **AVAILABLE MENUS**\n\n`;
  
  for (const menu of menus) {
    const name = menu.translations?.[0]?.name || menu.code;
    const statusIcon = menu.status === 'published' ? '🟢' : '🟡';
    text += `${statusIcon} **${name}**\n`;
    text += `   ID: \`${menu.id}\`\n`;
    text += `   Code: ${menu.code} | Status: ${menu.status}\n\n`;
  }

  return { content: [{ type: 'text', text }], success: true };
}

export async function executeListLocations(
  session: AdminSession
): Promise<ToolResult> {
  if (!hasPermission(session, 'locations.read')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to view locations.' }], success: false };
  }

  const locations = await prisma.location.findMany({
    where: { tenantId: session.tenantId },
    include: { 
      menuPublications: {
        where: { isCurrent: true },
        include: { menu: { include: { translations: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  if (locations.length === 0) {
    return { content: [{ type: 'text', text: '📍 No locations found.' }], success: true };
  }

  let text = `📍 **LOCATIONS**\n\n`;
  
  for (const location of locations) {
    const activeMenus = location.menuPublications
      .map(p => p.menu.translations?.[0]?.name || p.menu.code)
      .join(', ');
    
    text += `📍 **${location.name}**\n`;
    text += `   ID: \`${location.id}\`\n`;
    if (activeMenus) {
      text += `   Active Menu(s): ${activeMenus}\n`;
    } else {
      text += `   Active Menu(s): None\n`;
    }
    text += '\n';
  }

  return { content: [{ type: 'text', text }], success: true };
}

// ============================================
// LOCATION MENU OPERATIONS
// ============================================

export async function executeActivateMenuForLocation(
  session: AdminSession,
  params: { menuId?: string; menuName?: string; locationId?: string; locationName?: string }
): Promise<ToolResult> {
  console.log('[Admin Tool] executeActivateMenuForLocation called with:', params);
  
  if (!hasPermission(session, 'publications.create')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to activate menus for locations.' }], success: false };
  }

  const menu = await findMenu(session.tenantId, params.menuId, params.menuName);
  console.log('[Admin Tool] Found menu:', menu?.id, menu?.code);
  if (!menu) {
    return { content: [{ type: 'text', text: '❌ Menu not found. Please provide a valid menu name or ID.' }], success: false };
  }

  const location = await findLocation(session.tenantId, params.locationId, params.locationName);
  console.log('[Admin Tool] Found location:', location?.id, location?.name);
  if (!location) {
    return { content: [{ type: 'text', text: '❌ Location not found. Please provide a valid location name or ID.' }], success: false };
  }

  try {
    // Check if publication already exists
    const existingPub = await prisma.menuPublication.findUnique({
      where: {
        tenantId_locationId_menuId: {
          tenantId: session.tenantId,
          locationId: location.id,
          menuId: menu.id,
        },
      },
    });

    if (existingPub) {
      // Update existing publication
      await prisma.menuPublication.update({
        where: { id: existingPub.id },
        data: { isCurrent: true, retiresAt: null },
      });
    } else {
      // Create new publication
      await prisma.menuPublication.create({
        data: {
          tenantId: session.tenantId,
          locationId: location.id,
          menuId: menu.id,
          isCurrent: true,
          goesLiveAt: new Date(),
        },
      });
    }

    const menuName = menu.translations?.[0]?.name || menu.code;
    return {
      content: [{ type: 'text', text: `✅ Menu "${menuName}" is now **active** at location "${location.name}"!

📍 **Location:** ${location.name}
📋 **Menu:** ${menuName}
🟢 **Status:** Active` }],
      success: true,
    };
  } catch (error) {
    console.error('Activate menu for location error:', error);
    return { content: [{ type: 'text', text: '❌ Failed to activate menu for location.' }], success: false };
  }
}

export async function executeDeactivateMenuForLocation(
  session: AdminSession,
  params: { menuId?: string; menuName?: string; locationId?: string; locationName?: string }
): Promise<ToolResult> {
  if (!hasPermission(session, 'publications.update')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to deactivate menus for locations.' }], success: false };
  }

  const menu = await findMenu(session.tenantId, params.menuId, params.menuName);
  if (!menu) {
    return { content: [{ type: 'text', text: '❌ Menu not found. Please provide a valid menu name or ID.' }], success: false };
  }

  const location = await findLocation(session.tenantId, params.locationId, params.locationName);
  if (!location) {
    return { content: [{ type: 'text', text: '❌ Location not found. Please provide a valid location name or ID.' }], success: false };
  }

  try {
    const publication = await prisma.menuPublication.findUnique({
      where: {
        tenantId_locationId_menuId: {
          tenantId: session.tenantId,
          locationId: location.id,
          menuId: menu.id,
        },
      },
    });

    if (!publication) {
      return { content: [{ type: 'text', text: `⚠️ Menu is not currently published at this location.` }], success: false };
    }

    // Deactivate the publication
    await prisma.menuPublication.update({
      where: { id: publication.id },
      data: { isCurrent: false, retiresAt: new Date() },
    });

    const menuName = menu.translations?.[0]?.name || menu.code;
    return {
      content: [{ type: 'text', text: `✅ Menu "${menuName}" is now **inactive** at location "${location.name}"!

📍 **Location:** ${location.name}
📋 **Menu:** ${menuName}
🔴 **Status:** Inactive` }],
      success: true,
    };
  } catch (error) {
    console.error('Deactivate menu for location error:', error);
    return { content: [{ type: 'text', text: '❌ Failed to deactivate menu for location.' }], success: false };
  }
}

export async function executeGetLocationMenus(
  session: AdminSession,
  params: { locationId?: string; locationName?: string }
): Promise<ToolResult> {
  if (!hasPermission(session, 'publications.read')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to view location menus.' }], success: false };
  }

  const location = await findLocation(session.tenantId, params.locationId, params.locationName);
  if (!location) {
    return { content: [{ type: 'text', text: '❌ Location not found. Please provide a valid location name or ID.' }], success: false };
  }

  const publications = await prisma.menuPublication.findMany({
    where: { tenantId: session.tenantId, locationId: location.id },
    include: {
      menu: { include: { translations: true } },
    },
    orderBy: { goesLiveAt: 'desc' },
  });

  if (publications.length === 0) {
    return { content: [{ type: 'text', text: `📍 **${location.name}**

No menus are currently assigned to this location.` }], success: true };
  }

  let text = `📍 **${location.name}** — MENUS\n\n`;
  
  const activeMenus = publications.filter(p => p.isCurrent);
  const inactiveMenus = publications.filter(p => !p.isCurrent);

  if (activeMenus.length > 0) {
    text += `🟢 ACTIVE MENUS\n\n`;
    for (const pub of activeMenus) {
      const menuName = pub.menu.translations?.[0]?.name || pub.menu.code;
      text += `• **${menuName}**\n`;
      text += `  Active since: ${pub.goesLiveAt.toLocaleDateString()}\n\n`;
    }
  }

  if (inactiveMenus.length > 0) {
    text += `🔴 INACTIVE MENUS\n\n`;
    for (const pub of inactiveMenus) {
      const menuName = pub.menu.translations?.[0]?.name || pub.menu.code;
      text += `• **${menuName}**\n`;
      text += `  Retired: ${pub.retiresAt?.toLocaleDateString() || 'N/A'}\n\n`;
    }
  }

  return { content: [{ type: 'text', text }], success: true };
}

export async function executeListMenuPublications(
  session: AdminSession,
  params: { activeOnly?: boolean }
): Promise<ToolResult> {
  if (!hasPermission(session, 'publications.read')) {
    return { content: [{ type: 'text', text: '❌ You do not have permission to view menu publications.' }], success: false };
  }

  const publications = await prisma.menuPublication.findMany({
    where: { 
      tenantId: session.tenantId,
      ...(params.activeOnly && { isCurrent: true }),
    },
    include: {
      menu: { include: { translations: true } },
      location: true,
    },
    orderBy: [{ location: { name: 'asc' } }, { goesLiveAt: 'desc' }],
  });

  if (publications.length === 0) {
    return { content: [{ type: 'text', text: `📋 MENU PUBLICATIONS

No menu publications found.` }], success: true };
  }

  let text = `📋 MENU PUBLICATIONS${params.activeOnly ? ' (Active Only)' : ''}\n\n`;

  // Group by location
  const byLocation = new Map<string, typeof publications>();
  for (const pub of publications) {
    const locName = pub.location.name;
    if (!byLocation.has(locName)) {
      byLocation.set(locName, []);
    }
    byLocation.get(locName)!.push(pub);
  }

  for (const [locationName, pubs] of byLocation) {
    text += `📍 **${locationName}**\n\n`;
    for (const pub of pubs) {
      const menuName = pub.menu.translations?.[0]?.name || pub.menu.code;
      const status = pub.isCurrent ? '🟢 Active' : '🔴 Inactive';
      text += `• **${menuName}** — ${status}\n`;
    }
    text += '\n';
  }

  return { content: [{ type: 'text', text }], success: true };
}

// ============================================
// TOOL DISPATCHER
// ============================================

export async function executeAdminTool(
  session: AdminSession,
  toolName: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  switch (toolName) {
    // Menu items
    case 'create_menu_item':
      return executeCreateMenuItem(session, params as Parameters<typeof executeCreateMenuItem>[1]);
    case 'update_menu_item':
      return executeUpdateMenuItem(session, params as Parameters<typeof executeUpdateMenuItem>[1]);
    case 'delete_menu_item':
      return executeDeleteMenuItem(session, params as Parameters<typeof executeDeleteMenuItem>[1]);
    case 'toggle_menu_item_visibility':
      return executeToggleItemVisibility(session, params as Parameters<typeof executeToggleItemVisibility>[1]);
    case 'list_menu_items':
      return executeListMenuItems(session, params as Parameters<typeof executeListMenuItems>[1]);

    // Sections
    case 'create_section':
      return executeCreateSection(session, params as Parameters<typeof executeCreateSection>[1]);
    case 'list_sections':
      return executeListSections(session, params as Parameters<typeof executeListSections>[1]);

    // Ingredients
    case 'list_ingredients':
      return executeListIngredients(session, params as Parameters<typeof executeListIngredients>[1]);
    case 'create_ingredient':
      return executeCreateIngredient(session, params as Parameters<typeof executeCreateIngredient>[1]);

    // Pricing
    case 'update_item_price':
      return executeUpdateItemPrice(session, params as Parameters<typeof executeUpdateItemPrice>[1]);

    // Statistics
    case 'get_menu_statistics':
      return executeGetMenuStatistics(session);

    // List Menus & Locations
    case 'list_menus':
      return executeListMenus(session);
    case 'list_locations':
      return executeListLocations(session);

    // Location Menu Management
    case 'activate_menu_for_location':
      return executeActivateMenuForLocation(session, params as Parameters<typeof executeActivateMenuForLocation>[1]);
    case 'deactivate_menu_for_location':
      return executeDeactivateMenuForLocation(session, params as Parameters<typeof executeDeactivateMenuForLocation>[1]);
    case 'get_location_menus':
      return executeGetLocationMenus(session, params as Parameters<typeof executeGetLocationMenus>[1]);
    case 'list_menu_publications':
      return executeListMenuPublications(session, params as Parameters<typeof executeListMenuPublications>[1]);

    // Allergens & dietary (read-only from existing tools)
    case 'list_allergens':
    case 'list_dietary_flags':
      // Forward to existing tools
      const { executeListAllergens, executeListDietaryFlags } = await import('./mcp-tools');
      if (toolName === 'list_allergens') {
        return executeListAllergens((params as { locale?: string }).locale);
      }
      return executeListDietaryFlags((params as { locale?: string }).locale);

    default:
      return { content: [{ type: 'text', text: `❌ Unknown tool: ${toolName}` }], success: false };
  }
}
