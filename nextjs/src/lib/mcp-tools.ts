/**
 * MCP Tools for Restaurant Menu
 * 
 * Tools for querying menu data using the new multi-tenant schema
 * with sections, items, allergens, and dietary flags
 */

import { prisma } from '@/lib/prisma';

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
}

// Tool definitions for AI SDK
export const menuTools = {
  get_menu: {
    description: 'Get the full restaurant menu with all sections and items from the currently published version',
    parameters: {
      type: 'object' as const,
      properties: {
        tenantId: {
          type: 'string',
          description: 'The restaurant tenant ID',
        },
        locale: {
          type: 'string',
          description: 'The locale for translations (e.g., en-US, fr-FR). Defaults to en-US',
        },
      },
      required: ['tenantId'],
    },
  },
  get_item_details: {
    description: 'Get detailed information about a specific menu item including ingredients, allergens, and dietary flags',
    parameters: {
      type: 'object' as const,
      properties: {
        tenantId: {
          type: 'string',
          description: 'The restaurant tenant ID',
        },
        itemName: {
          type: 'string',
          description: 'The name of the item to look up',
        },
        locale: {
          type: 'string',
          description: 'The locale for translations. Defaults to en-US',
        },
      },
      required: ['tenantId', 'itemName'],
    },
  },
  search_items: {
    description: 'Search for menu items by name, ingredient, allergen, or dietary preference',
    parameters: {
      type: 'object' as const,
      properties: {
        tenantId: {
          type: 'string',
          description: 'The restaurant tenant ID',
        },
        query: {
          type: 'string',
          description: 'Search query (item name, ingredient, dietary flag like vegetarian/vegan, or allergen)',
        },
        locale: {
          type: 'string',
          description: 'The locale for translations. Defaults to en-US',
        },
      },
      required: ['tenantId', 'query'],
    },
  },
  get_recommendations: {
    description: 'Get menu item recommendations based on preferences, dietary restrictions, or allergen exclusions',
    parameters: {
      type: 'object' as const,
      properties: {
        tenantId: {
          type: 'string',
          description: 'The restaurant tenant ID',
        },
        preference: {
          type: 'string',
          description: 'Optional preference like "vegetarian", "vegan", "gluten-free"',
        },
        excludeAllergens: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of allergen codes to exclude (e.g., ["gluten", "nuts"])',
        },
        locale: {
          type: 'string',
          description: 'The locale for translations. Defaults to en-US',
        },
      },
      required: ['tenantId'],
    },
  },
  list_allergens: {
    description: 'List all known allergens with their localized names',
    parameters: {
      type: 'object' as const,
      properties: {
        locale: {
          type: 'string',
          description: 'The locale for translations. Defaults to en-US',
        },
      },
      required: [],
    },
  },
  list_dietary_flags: {
    description: 'List all dietary flags (vegetarian, vegan, halal, kosher, etc.) with their localized names',
    parameters: {
      type: 'object' as const,
      properties: {
        locale: {
          type: 'string',
          description: 'The locale for translations. Defaults to en-US',
        },
      },
      required: [],
    },
  },
};

// Helper to get translation
function getTranslation<T extends { locale: string }>(
  translations: T[],
  locale: string,
  fallback: string = 'en-US'
): T | undefined {
  return (
    translations.find((t) => t.locale === locale) ||
    translations.find((t) => t.locale === fallback) ||
    translations[0]
  );
}

// Tool execution functions
export async function executeGetMenu(
  tenantId: string,
  locale: string = 'en-US'
): Promise<ToolResult> {
  // Find published menus with their menu lines
  const menus = await prisma.menu.findMany({
    where: { 
      tenantId,
      status: 'published',
    },
    include: {
      translations: true,
      lines: {
        where: { isEnabled: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          section: {
            include: {
              translations: true,
            },
          },
          item: {
            include: {
              translations: true,
              priceBase: true,
              allergens: {
                include: { allergen: { include: { translations: true } } },
              },
              dietaryFlags: {
                include: { dietaryFlag: { include: { translations: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (menus.length === 0) {
    return {
      content: [{ type: 'text', text: 'No published menus found for this restaurant.' }],
    };
  }

  let menuText = '# Restaurant Menu\n\n';

  for (const menu of menus) {
    const menuTrans = getTranslation(menu.translations, locale);

    menuText += `## ${menuTrans?.name || menu.code}\n\n`;

    // Get section lines (top-level lines with lineType='section')
    // Filter by: line is enabled, section exists, section is active
    const sectionLines = menu.lines.filter(
      (l) => l.lineType === 'section' && l.isEnabled && l.section && l.section.isActive
    );

    for (const sectionLine of sectionLines) {
      const section = sectionLine.section!;
      const sectionTrans = getTranslation(section.translations, locale);
      
      menuText += `### ${sectionTrans?.title || 'Section'}\n`;
      if (sectionTrans?.description) {
        menuText += `${sectionTrans.description}\n`;
      }
      menuText += '\n';

      // Get item lines that are children of this section line
      // Filter by: line is enabled, item exists, item is visible
      const itemLines = menu.lines.filter(
        (l) => l.lineType === 'item' && l.isEnabled && l.parentLineId === sectionLine.id && l.item && l.item.isVisible
      );

      // Skip sections with no visible items
      if (itemLines.length === 0) {
        // Remove the section header we just added
        const lastSectionIndex = menuText.lastIndexOf(`### ${sectionTrans?.title || 'Section'}`);
        if (lastSectionIndex > 0) {
          menuText = menuText.substring(0, lastSectionIndex);
        }
        continue;
      }

      for (const itemLine of itemLines) {
        const item = itemLine.item!;
        const itemTrans = getTranslation(item.translations, locale);
        const price = item.priceBase
          ? `€${(Number(item.priceBase.amountMinor) / 100).toFixed(2)}`
          : '';

        menuText += `**${itemTrans?.name || 'Item'}** ${price}\n`;
        if (itemTrans?.description) {
          menuText += `${itemTrans.description}\n`;
        }

        const tags: string[] = [];
        for (const df of item.dietaryFlags) {
          const dfTrans = getTranslation(df.dietaryFlag.translations, locale);
          tags.push(`🏷️ ${dfTrans?.name || df.dietaryFlag.code}`);
        }
        if (item.allergens.length > 0) {
          const allergenNames = item.allergens.map((a) => {
            const aTrans = getTranslation(a.allergen.translations, locale);
            return aTrans?.name || a.allergen.code;
          });
          tags.push(`⚠️ Allergens: ${allergenNames.join(', ')}`);
        }
        if (item.spicinessLevel && item.spicinessLevel > 0) {
          tags.push(`🌶️ Spiciness: ${'🔥'.repeat(item.spicinessLevel)}`);
        }
        if (item.calories) {
          tags.push(`📊 ${item.calories} cal`);
        }

        if (tags.length > 0) {
          menuText += `${tags.join(' | ')}\n`;
        }
        menuText += '\n';
      }
    }
  }

  return {
    content: [{ type: 'text', text: menuText }],
  };
}

export async function executeGetItemDetails(
  tenantId: string,
  itemName: string,
  locale: string = 'en-US'
): Promise<ToolResult> {
  // Search for item by name in translations, only if it has an enabled menu line
  const items = await prisma.item.findMany({
    where: {
      tenantId,
      isVisible: true,
      translations: {
        some: {
          name: { contains: itemName, mode: 'insensitive' },
        },
      },
      // Only get items that have an enabled menu line in a published menu
      // AND whose parent section line is also enabled
      menuLines: {
        some: {
          isEnabled: true,
          menu: { status: 'published' },
          parentLine: { isEnabled: true },
        },
      },
    },
    include: {
      translations: true,
      priceBase: true,
      section: {
        include: {
          translations: true,
        },
      },
      ingredients: {
        include: {
          ingredient: true,
        },
      },
      allergens: {
        include: {
          allergen: { include: { translations: true } },
        },
      },
      dietaryFlags: {
        include: {
          dietaryFlag: { include: { translations: true } },
        },
      },
      optionGroups: {
        include: {
          optionGroup: {
            include: {
              translations: true,
              options: {
                include: {
                  translations: true,
                  price: true,
                },
              },
            },
          },
        },
      },
      menuItems: {
        where: { menu: { status: 'published' } },
        take: 1,
        include: {
          menu: {
            include: {
              translations: true,
            },
          },
        },
      },
    },
    take: 1,
  });

  if (items.length === 0) {
    return {
      content: [{ type: 'text', text: `No item found matching "${itemName}".` }],
    };
  }

  const item = items[0];
  const itemTrans = getTranslation(item.translations, locale);
  const sectionTrans = getTranslation(item.section.translations, locale);
  const menuItem = item.menuItems[0];
  const menuTrans = menuItem ? getTranslation(menuItem.menu.translations, locale) : null;

  let detailsText = `# ${itemTrans?.name || 'Item'}\n\n`;
  detailsText += `**Menu:** ${menuTrans?.name || menuItem?.menu.code || 'Unknown'}\n`;
  detailsText += `**Section:** ${sectionTrans?.title || 'Section'}\n`;

  if (item.priceBase) {
    const price = (Number(item.priceBase.amountMinor) / 100).toFixed(2);
    detailsText += `**Price:** €${price}\n`;
  }

  detailsText += '\n';

  if (itemTrans?.description) {
    detailsText += `${itemTrans.description}\n\n`;
  }

  // Dietary flags
  if (item.dietaryFlags.length > 0) {
    const flags = item.dietaryFlags.map((df) => {
      const trans = getTranslation(df.dietaryFlag.translations, locale);
      return trans?.name || df.dietaryFlag.code;
    });
    detailsText += `**Dietary:** ${flags.join(', ')}\n\n`;
  }

  // Allergens
  if (item.allergens.length > 0) {
    const allergens = item.allergens.map((a) => {
      const trans = getTranslation(a.allergen.translations, locale);
      return trans?.name || a.allergen.code;
    });
    detailsText += `**Allergens:** ${allergens.join(', ')}\n\n`;
  }

  // Ingredients
  if (item.ingredients.length > 0) {
    detailsText += '**Ingredients:**\n';
    for (const ii of item.ingredients) {
      detailsText += `- ${ii.ingredient.name}`;
      if (!ii.isOptional) {
        detailsText += ' (main)';
      }
      detailsText += '\n';
    }
    detailsText += '\n';
  }

  // Nutritional info
  if (item.calories || item.spicinessLevel) {
    detailsText += '**Nutritional Info:**\n';
    if (item.calories) detailsText += `- Calories: ${item.calories}\n`;
    if (item.spicinessLevel) detailsText += `- Spiciness: ${item.spicinessLevel}/5\n`;
    detailsText += '\n';
  }

  // Option groups (customizations)
  if (item.optionGroups.length > 0) {
    detailsText += '**Customizations:**\n';
    for (const iog of item.optionGroups) {
      const ogTrans = getTranslation(iog.optionGroup.translations, locale);
      detailsText += `- *${ogTrans?.name || 'Options'}*`;
      if (iog.optionGroup.minSelect > 0) {
        detailsText += ` (required, pick ${iog.optionGroup.minSelect}-${iog.optionGroup.maxSelect})`;
      }
      detailsText += ':\n';
      for (const oi of iog.optionGroup.options) {
        const oiTrans = getTranslation(oi.translations, locale);
        const price = oi.price
          ? ` +€${(Number(oi.price.deltaMinor) / 100).toFixed(2)}`
          : '';
        detailsText += `  - ${oiTrans?.name || 'Option'}${price}\n`;
      }
    }
    detailsText += '\n';
  }

  // Availability
  detailsText += `**Available:** ${item.isVisible ? 'Yes' : 'Currently Unavailable'}\n`;

  return {
    content: [{ type: 'text', text: detailsText }],
  };
}

export async function executeSearchItems(
  tenantId: string,
  query: string,
  locale: string = 'en-US'
): Promise<ToolResult> {
  const lowerQuery = query.toLowerCase();

  // Check for dietary preferences
  const dietaryKeywords = ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free', 'gluten free'];
  const dietaryMatch = dietaryKeywords.find((k) => lowerQuery.includes(k));

  // Check for allergen exclusion patterns
  const allergenExclusionMatch = lowerQuery.match(/without\s+(\w+)|no\s+(\w+)|free\s+from\s+(\w+)/);

  let items;

  if (dietaryMatch) {
    // Search by dietary flag
    const code = dietaryMatch.replace(' ', '-').replace('free', '-free');
    items = await prisma.item.findMany({
      where: {
        tenantId,
        isVisible: true,
        menuLines: { some: { isEnabled: true, menu: { status: 'published' }, parentLine: { isEnabled: true } } },
        dietaryFlags: {
          some: {
            dietaryFlag: { code: { contains: code, mode: 'insensitive' } },
          },
        },
      },
      include: {
        translations: true,
        priceBase: true,
        section: { include: { translations: true } },
        dietaryFlags: { include: { dietaryFlag: { include: { translations: true } } } },
        allergens: { include: { allergen: { include: { translations: true } } } },
      },
      take: 10,
    });
  } else if (allergenExclusionMatch) {
    // Search excluding specific allergen
    const excludeAllergen = allergenExclusionMatch[1] || allergenExclusionMatch[2] || allergenExclusionMatch[3];
    items = await prisma.item.findMany({
      where: {
        tenantId,
        isVisible: true,
        menuLines: { some: { isEnabled: true, menu: { status: 'published' }, parentLine: { isEnabled: true } } },
        NOT: {
          allergens: {
            some: {
              allergen: { code: { contains: excludeAllergen, mode: 'insensitive' } },
            },
          },
        },
      },
      include: {
        translations: true,
        priceBase: true,
        section: { include: { translations: true } },
        dietaryFlags: { include: { dietaryFlag: { include: { translations: true } } } },
        allergens: { include: { allergen: { include: { translations: true } } } },
      },
      take: 10,
    });
  } else {
    // General search by name, description, or ingredient
    items = await prisma.item.findMany({
      where: {
        tenantId,
        isVisible: true,
        menuLines: { some: { isEnabled: true, menu: { status: 'published' }, parentLine: { isEnabled: true } } },
        OR: [
          { translations: { some: { name: { contains: query, mode: 'insensitive' } } } },
          { translations: { some: { description: { contains: query, mode: 'insensitive' } } } },
          { ingredients: { some: { ingredient: { name: { contains: query, mode: 'insensitive' } } } } },
        ],
      },
      include: {
        translations: true,
        priceBase: true,
        section: { include: { translations: true } },
        dietaryFlags: { include: { dietaryFlag: { include: { translations: true } } } },
        allergens: { include: { allergen: { include: { translations: true } } } },
      },
      take: 10,
    });
  }

  if (items.length === 0) {
    return {
      content: [{ type: 'text', text: `No items found matching "${query}".` }],
    };
  }

  let resultsText = `# Search Results for "${query}"\n\n`;
  resultsText += `Found ${items.length} item${items.length > 1 ? 's' : ''}:\n\n`;

  for (const item of items) {
    const itemTrans = getTranslation(item.translations, locale);
    const sectionTrans = getTranslation(item.section.translations, locale);
    const price = item.priceBase
      ? `€${(Number(item.priceBase.amountMinor) / 100).toFixed(2)}`
      : '';

    resultsText += `### ${itemTrans?.name || 'Item'} ${price}\n`;
    resultsText += `*${sectionTrans?.title || 'Section'}*\n`;

    if (itemTrans?.description) {
      resultsText += `${itemTrans.description}\n`;
    }

    const tags: string[] = [];
    for (const df of item.dietaryFlags) {
      const dfTrans = getTranslation(df.dietaryFlag.translations, locale);
      tags.push(`🏷️ ${dfTrans?.name || df.dietaryFlag.code}`);
    }
    if (item.allergens.length > 0) {
      const allergenNames = item.allergens.map((a) => {
        const aTrans = getTranslation(a.allergen.translations, locale);
        return aTrans?.name || a.allergen.code;
      });
      resultsText += `⚠️ ${allergenNames.join(', ')}\n`;
    }

    if (tags.length > 0) {
      resultsText += `${tags.join(' | ')}\n`;
    }
    resultsText += '\n';
  }

  return {
    content: [{ type: 'text', text: resultsText }],
  };
}

export async function executeGetRecommendations(
  tenantId: string,
  preference?: string,
  excludeAllergens?: string[],
  locale: string = 'en-US'
): Promise<ToolResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = {
    tenantId,
    isVisible: true,
    menuLines: { some: { isEnabled: true, menu: { status: 'published' }, parentLine: { isEnabled: true } } },
  };

  if (preference) {
    const lowerPref = preference.toLowerCase();
    if (
      lowerPref.includes('vegetarian') ||
      lowerPref.includes('vegan') ||
      lowerPref.includes('halal') ||
      lowerPref.includes('kosher')
    ) {
      whereClause.dietaryFlags = {
        some: {
          dietaryFlag: { code: { contains: lowerPref.replace(' ', '-'), mode: 'insensitive' } },
        },
      };
    }
  }

  if (excludeAllergens && excludeAllergens.length > 0) {
    whereClause.NOT = {
      allergens: {
        some: {
          allergen: { code: { in: excludeAllergens.map((a) => a.toLowerCase()) } },
        },
      },
    };
  }

  const items = await prisma.item.findMany({
    where: whereClause,
    include: {
      translations: true,
      priceBase: true,
      section: { include: { translations: true } },
      dietaryFlags: { include: { dietaryFlag: { include: { translations: true } } } },
      allergens: { include: { allergen: { include: { translations: true } } } },
    },
    take: 5,
  });

  if (items.length === 0) {
    return {
      content: [{ type: 'text', text: 'No recommendations available based on your criteria.' }],
    };
  }

  let recText = '# Recommended Items\n\n';
  if (preference) {
    recText += `Based on your preference for "${preference}":\n\n`;
  }
  if (excludeAllergens && excludeAllergens.length > 0) {
    recText += `Excluding allergens: ${excludeAllergens.join(', ')}\n\n`;
  }

  for (const item of items) {
    const itemTrans = getTranslation(item.translations, locale);
    const sectionTrans = getTranslation(item.section.translations, locale);
    const price = item.priceBase
      ? `€${(Number(item.priceBase.amountMinor) / 100).toFixed(2)}`
      : '';

    recText += `### ${itemTrans?.name || 'Item'} ${price}\n`;
    recText += `*${sectionTrans?.title || 'Section'}*\n`;

    if (itemTrans?.description) {
      recText += `${itemTrans.description}\n`;
    }

    const tags: string[] = [];
    for (const df of item.dietaryFlags) {
      const dfTrans = getTranslation(df.dietaryFlag.translations, locale);
      tags.push(`🏷️ ${dfTrans?.name || df.dietaryFlag.code}`);
    }

    if (tags.length > 0) {
      recText += `${tags.join(' | ')}\n`;
    }
    recText += '\n';
  }

  return {
    content: [{ type: 'text', text: recText }],
  };
}

export async function executeListAllergens(locale: string = 'en-US'): Promise<ToolResult> {
  const allergens = await prisma.allergen.findMany({
    include: { translations: true },
    orderBy: { code: 'asc' },
  });

  if (allergens.length === 0) {
    return {
      content: [{ type: 'text', text: 'No allergens defined in the system.' }],
    };
  }

  let text = '# Known Allergens\n\n';
  text += 'These are the standard allergens tracked in our menu system:\n\n';

  for (const allergen of allergens) {
    const trans = getTranslation(allergen.translations, locale);
    text += `- **${trans?.name || allergen.code}** (${allergen.code})\n`;
  }

  return {
    content: [{ type: 'text', text }],
  };
}

export async function executeListDietaryFlags(locale: string = 'en-US'): Promise<ToolResult> {
  const flags = await prisma.dietaryFlag.findMany({
    include: { translations: true },
    orderBy: { code: 'asc' },
  });

  if (flags.length === 0) {
    return {
      content: [{ type: 'text', text: 'No dietary flags defined in the system.' }],
    };
  }

  let text = '# Dietary Flags\n\n';
  text += 'These dietary preferences and restrictions are supported:\n\n';

  for (const flag of flags) {
    const trans = getTranslation(flag.translations, locale);
    text += `- **${trans?.name || flag.code}** (${flag.code})\n`;
  }

  return {
    content: [{ type: 'text', text }],
  };
}

// Combined tool executor
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const tenantId = args.tenantId as string;
  const locale = (args.locale as string) || 'en-US';

  switch (toolName) {
    case 'get_menu': {
      const result = await executeGetMenu(tenantId, locale);
      return result.content[0].text;
    }
    case 'get_item_details': {
      const result = await executeGetItemDetails(tenantId, args.itemName as string, locale);
      return result.content[0].text;
    }
    case 'search_items': {
      const result = await executeSearchItems(tenantId, args.query as string, locale);
      return result.content[0].text;
    }
    case 'get_recommendations': {
      const result = await executeGetRecommendations(
        tenantId,
        args.preference as string,
        args.excludeAllergens as string[],
        locale
      );
      return result.content[0].text;
    }
    case 'list_allergens': {
      const result = await executeListAllergens(locale);
      return result.content[0].text;
    }
    case 'list_dietary_flags': {
      const result = await executeListDietaryFlags(locale);
      return result.content[0].text;
    }
    // Backwards compatibility
    case 'get_dish_details': {
      const result = await executeGetItemDetails(tenantId, args.dishName as string, locale);
      return result.content[0].text;
    }
    case 'search_dishes': {
      const result = await executeSearchItems(tenantId, args.query as string, locale);
      return result.content[0].text;
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}
