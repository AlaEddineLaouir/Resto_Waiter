import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load menu data
const menuPath = join(__dirname, '../../data/menu.json');
const menuData = JSON.parse(readFileSync(menuPath, 'utf-8'));

// Create MCP server
const server = new Server(
  {
    name: 'restaurant-menu-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to get all dishes
function getAllDishes() {
  const dishes = [];
  for (const category of menuData.categories) {
    for (const dish of category.dishes) {
      dishes.push({
        ...dish,
        category: category.name,
      });
    }
  }
  return dishes;
}

// Helper function to find dish by name or id
function findDish(query) {
  const dishes = getAllDishes();
  const queryLower = query.toLowerCase();
  return dishes.find(
    (dish) =>
      dish.id === query ||
      dish.name.toLowerCase() === queryLower ||
      dish.name.toLowerCase().includes(queryLower)
  );
}

// Helper function to search dishes
function searchDishes(query) {
  const dishes = getAllDishes();
  const queryLower = query.toLowerCase();
  return dishes.filter(
    (dish) =>
      dish.name.toLowerCase().includes(queryLower) ||
      dish.description.toLowerCase().includes(queryLower) ||
      dish.ingredients.some((ing) => ing.toLowerCase().includes(queryLower))
  );
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_menu',
        description:
          'Get the full restaurant menu with all categories and dishes. Use this when the user asks what is available, what can they order, or wants to see the menu.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_dish_details',
        description:
          'Get detailed information about a specific dish including price, description, ingredients, and allergens. Use this when the user asks about a specific dish.',
        inputSchema: {
          type: 'object',
          properties: {
            dish_name: {
              type: 'string',
              description: 'The name or ID of the dish to get details for',
            },
          },
          required: ['dish_name'],
        },
      },
      {
        name: 'get_ingredients',
        description:
          'Get the list of ingredients for a specific dish. Use this when the user asks what ingredients are in a dish or if a dish contains a specific ingredient.',
        inputSchema: {
          type: 'object',
          properties: {
            dish_name: {
              type: 'string',
              description: 'The name or ID of the dish to get ingredients for',
            },
          },
          required: ['dish_name'],
        },
      },
      {
        name: 'search_dishes',
        description:
          'Search for dishes by name, description, or ingredient. Use this when the user is looking for dishes with specific characteristics or ingredients.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'The search query - can be a dish name, ingredient, or description keyword',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_vegetarian_dishes',
        description:
          'Get all vegetarian dishes from the menu. Use this when the user asks for vegetarian options.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_dishes_by_category',
        description:
          'Get all dishes in a specific category (Appetizers, Pasta, Pizza, Main Courses, Desserts).',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description:
                'The category name (Appetizers, Pasta, Pizza, Main Courses, Desserts)',
            },
          },
          required: ['category'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_menu': {
      const menu = {
        restaurant: menuData.restaurant,
        categories: menuData.categories.map((cat) => ({
          name: cat.name,
          dishes: cat.dishes.map((dish) => ({
            name: dish.name,
            description: dish.description,
            price: `$${dish.price}`,
            vegetarian: dish.vegetarian,
          })),
        })),
      };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(menu, null, 2),
          },
        ],
      };
    }

    case 'get_dish_details': {
      const dish = findDish(args.dish_name);
      if (!dish) {
        return {
          content: [
            {
              type: 'text',
              text: `Dish "${args.dish_name}" not found in our menu.`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                name: dish.name,
                category: dish.category,
                description: dish.description,
                price: `$${dish.price}`,
                ingredients: dish.ingredients,
                allergens: dish.allergens,
                vegetarian: dish.vegetarian,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'get_ingredients': {
      const dish = findDish(args.dish_name);
      if (!dish) {
        return {
          content: [
            {
              type: 'text',
              text: `Dish "${args.dish_name}" not found in our menu.`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                dish: dish.name,
                ingredients: dish.ingredients,
                allergens: dish.allergens,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'search_dishes': {
      const results = searchDishes(args.query);
      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No dishes found matching "${args.query}".`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              results.map((dish) => ({
                name: dish.name,
                category: dish.category,
                description: dish.description,
                price: `$${dish.price}`,
                vegetarian: dish.vegetarian,
              })),
              null,
              2
            ),
          },
        ],
      };
    }

    case 'get_vegetarian_dishes': {
      const vegetarianDishes = getAllDishes().filter((dish) => dish.vegetarian);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              vegetarianDishes.map((dish) => ({
                name: dish.name,
                category: dish.category,
                description: dish.description,
                price: `$${dish.price}`,
              })),
              null,
              2
            ),
          },
        ],
      };
    }

    case 'get_dishes_by_category': {
      const category = menuData.categories.find(
        (cat) => cat.name.toLowerCase() === args.category.toLowerCase()
      );
      if (!category) {
        return {
          content: [
            {
              type: 'text',
              text: `Category "${args.category}" not found. Available categories: ${menuData.categories.map((c) => c.name).join(', ')}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              category.dishes.map((dish) => ({
                name: dish.name,
                description: dish.description,
                price: `$${dish.price}`,
                vegetarian: dish.vegetarian,
              })),
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Export for use in the application
export { server, getAllDishes, findDish, searchDishes, menuData };

// Start server if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Restaurant Menu MCP Server running on stdio');
}
