/**
 * MCP Tools for Restaurant Menu
 * 
 * Tools for querying menu data, dishes, and ingredients
 */

import { prisma } from '@/lib/prisma';

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
}

// Tool definitions for AI SDK
export const menuTools = {
  get_menu: {
    description: 'Get the full restaurant menu with all categories and dishes',
    parameters: {
      type: 'object' as const,
      properties: {
        tenantId: {
          type: 'string',
          description: 'The restaurant tenant ID',
        },
      },
      required: ['tenantId'],
    },
  },
  get_dish_details: {
    description: 'Get detailed information about a specific dish including ingredients and allergens',
    parameters: {
      type: 'object' as const,
      properties: {
        tenantId: {
          type: 'string',
          description: 'The restaurant tenant ID',
        },
        dishName: {
          type: 'string',
          description: 'The name of the dish to look up',
        },
      },
      required: ['tenantId', 'dishName'],
    },
  },
  search_dishes: {
    description: 'Search for dishes by name, ingredient, or dietary preference',
    parameters: {
      type: 'object' as const,
      properties: {
        tenantId: {
          type: 'string',
          description: 'The restaurant tenant ID',
        },
        query: {
          type: 'string',
          description: 'Search query (dish name, ingredient, or dietary preference like vegetarian)',
        },
      },
      required: ['tenantId', 'query'],
    },
  },
  get_recommendations: {
    description: 'Get dish recommendations based on preferences or popular items',
    parameters: {
      type: 'object' as const,
      properties: {
        tenantId: {
          type: 'string',
          description: 'The restaurant tenant ID',
        },
        preference: {
          type: 'string',
          description: 'Optional preference like "vegetarian", "healthy"',
        },
      },
      required: ['tenantId'],
    },
  },
};

// Tool execution functions
export async function executeGetMenu(tenantId: string): Promise<ToolResult> {
  const categories = await prisma.category.findMany({
    where: { tenantId },
    include: {
      dishes: {
        where: { isAvailable: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { displayOrder: 'asc' },
  });

  if (categories.length === 0) {
    return {
      content: [{ type: 'text', text: 'No menu items found for this restaurant.' }],
    };
  }

  let menuText = '# Restaurant Menu\n\n';
  for (const category of categories) {
    menuText += `## ${category.name}\n`;
    if (category.description) {
      menuText += `${category.description}\n`;
    }
    menuText += '\n';

    for (const dish of category.dishes) {
      menuText += `### ${dish.name} - €${Number(dish.price).toFixed(2)}\n`;
      if (dish.description) {
        menuText += `${dish.description}\n`;
      }
      const tags: string[] = [];
      if (dish.isVegetarian) tags.push('🥬 Vegetarian');
      if (dish.allergens && dish.allergens.length > 0) {
        tags.push(`⚠️ Contains: ${dish.allergens.join(', ')}`);
      }
      if (tags.length > 0) {
        menuText += `${tags.join(' | ')}\n`;
      }
      menuText += '\n';
    }
  }

  return {
    content: [{ type: 'text', text: menuText }],
  };
}

export async function executeGetDishDetails(
  tenantId: string,
  dishName: string
): Promise<ToolResult> {
  const dish = await prisma.dish.findFirst({
    where: {
      tenantId,
      name: { contains: dishName, mode: 'insensitive' },
    },
    include: {
      category: true,
      ingredients: {
        include: { ingredient: true },
      },
    },
  });

  if (!dish) {
    return {
      content: [{ type: 'text', text: `No dish found matching "${dishName}".` }],
    };
  }

  let detailsText = `# ${dish.name}\n\n`;
  detailsText += `**Category:** ${dish.category.name}\n`;
  detailsText += `**Price:** €${Number(dish.price).toFixed(2)}\n\n`;

  if (dish.description) {
    detailsText += `${dish.description}\n\n`;
  }

  // Dietary info
  const dietary: string[] = [];
  if (dish.isVegetarian) dietary.push('Vegetarian');
  if (dietary.length > 0) {
    detailsText += `**Dietary:** ${dietary.join(', ')}\n\n`;
  }

  // Allergens
  if (dish.allergens && dish.allergens.length > 0) {
    detailsText += `**Allergens:** ${dish.allergens.join(', ')}\n\n`;
  }

  // Ingredients
  if (dish.ingredients.length > 0) {
    detailsText += '**Ingredients:**\n';
    for (const di of dish.ingredients) {
      detailsText += `- ${di.ingredient.name}`;
      if (di.ingredient.isAllergen) {
        detailsText += ' ⚠️ (Allergen)';
      }
      detailsText += '\n';
    }
  }

  // Availability
  detailsText += `\n**Available:** ${dish.isAvailable ? 'Yes' : 'Currently Unavailable'}\n`;

  return {
    content: [{ type: 'text', text: detailsText }],
  };
}

export async function executeSearchDishes(
  tenantId: string,
  query: string
): Promise<ToolResult> {
  const lowerQuery = query.toLowerCase();

  // Check for dietary preferences
  const isVegetarianSearch = lowerQuery.includes('vegetarian');

  interface DishWhereInput {
    tenantId: string;
    isAvailable: boolean;
    OR?: Array<{
      name?: { contains: string; mode: 'insensitive' };
      description?: { contains: string; mode: 'insensitive' };
      ingredients?: { some: { ingredient: { name: { contains: string; mode: 'insensitive' } } } };
    }>;
    isVegetarian?: boolean;
  }

  const whereClause: DishWhereInput = {
    tenantId,
    isAvailable: true,
  };

  if (!isVegetarianSearch) {
    whereClause.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      {
        ingredients: {
          some: {
            ingredient: { name: { contains: query, mode: 'insensitive' } },
          },
        },
      },
    ];
  }

  if (isVegetarianSearch) {
    whereClause.isVegetarian = true;
  }

  const dishes = await prisma.dish.findMany({
    where: whereClause,
    include: {
      category: true,
    },
    take: 10,
  });

  if (dishes.length === 0) {
    return {
      content: [{ type: 'text', text: `No dishes found matching "${query}".` }],
    };
  }

  let resultsText = `# Search Results for "${query}"\n\n`;
  resultsText += `Found ${dishes.length} dish${dishes.length > 1 ? 'es' : ''}:\n\n`;

  for (const dish of dishes) {
    resultsText += `### ${dish.name} - €${Number(dish.price).toFixed(2)}\n`;
    resultsText += `*${dish.category.name}*\n`;
    if (dish.description) {
      resultsText += `${dish.description}\n`;
    }
    const tags: string[] = [];
    if (dish.isVegetarian) tags.push('🥬 Vegetarian');
    if (dish.allergens && dish.allergens.length > 0) {
      tags.push(`⚠️ ${dish.allergens.join(', ')}`);
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
  preference?: string
): Promise<ToolResult> {
  interface RecommendWhereInput {
    tenantId: string;
    isAvailable: boolean;
    isVegetarian?: boolean;
  }

  const whereClause: RecommendWhereInput = {
    tenantId,
    isAvailable: true,
  };

  if (preference) {
    const lowerPref = preference.toLowerCase();
    if (lowerPref.includes('healthy') || lowerPref.includes('light') || lowerPref.includes('vegetarian')) {
      whereClause.isVegetarian = true;
    }
  }

  const dishes = await prisma.dish.findMany({
    where: whereClause,
    include: {
      category: true,
    },
    take: 5,
    orderBy: { displayOrder: 'asc' },
  });

  if (dishes.length === 0) {
    return {
      content: [{ type: 'text', text: 'No recommendations available at this time.' }],
    };
  }

  let recText = '# Recommended Dishes\n\n';
  if (preference) {
    recText += `Based on your preference for "${preference}":\n\n`;
  }

  for (const dish of dishes) {
    recText += `### ${dish.name} - €${Number(dish.price).toFixed(2)}\n`;
    recText += `*${dish.category.name}*\n`;
    if (dish.description) {
      recText += `${dish.description}\n`;
    }
    const tags: string[] = [];
    if (dish.isVegetarian) tags.push('🥬 Vegetarian');
    if (tags.length > 0) {
      recText += `${tags.join(' | ')}\n`;
    }
    recText += '\n';
  }

  return {
    content: [{ type: 'text', text: recText }],
  };
}

// Combined tool executor
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const tenantId = args.tenantId as string;

  switch (toolName) {
    case 'get_menu': {
      const result = await executeGetMenu(tenantId);
      return result.content[0].text;
    }
    case 'get_dish_details': {
      const result = await executeGetDishDetails(tenantId, args.dishName as string);
      return result.content[0].text;
    }
    case 'search_dishes': {
      const result = await executeSearchDishes(tenantId, args.query as string);
      return result.content[0].text;
    }
    case 'get_recommendations': {
      const result = await executeGetRecommendations(tenantId, args.preference as string);
      return result.content[0].text;
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}
