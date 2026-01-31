import { getAllDishes, findDish, searchDishes, menuData } from '../mcp-server/server.js';

/**
 * MCP Client that provides access to restaurant menu tools
 * This simulates an MCP client that can call tools on the server
 */
class MenuMCPClient {
  constructor() {
    this.tools = {
      get_menu: this.getMenu.bind(this),
      get_dish_details: this.getDishDetails.bind(this),
      get_ingredients: this.getIngredients.bind(this),
      search_dishes: this.searchDishes.bind(this),
      get_vegetarian_dishes: this.getVegetarianDishes.bind(this),
      get_dishes_by_category: this.getDishesByCategory.bind(this),
    };
  }

  /**
   * Get the list of available tools
   */
  listTools() {
    return [
      {
        name: 'get_menu',
        description: 'Get the full restaurant menu with all categories and dishes.',
      },
      {
        name: 'get_dish_details',
        description: 'Get detailed information about a specific dish.',
        parameters: { dish_name: 'string' },
      },
      {
        name: 'get_ingredients',
        description: 'Get the list of ingredients for a specific dish.',
        parameters: { dish_name: 'string' },
      },
      {
        name: 'search_dishes',
        description: 'Search for dishes by name, description, or ingredient.',
        parameters: { query: 'string' },
      },
      {
        name: 'get_vegetarian_dishes',
        description: 'Get all vegetarian dishes from the menu.',
      },
      {
        name: 'get_dishes_by_category',
        description: 'Get all dishes in a specific category.',
        parameters: { category: 'string' },
      },
    ];
  }

  /**
   * Call a tool by name with the given arguments
   */
  async callTool(toolName, args = {}) {
    const tool = this.tools[toolName];
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    return await tool(args);
  }

  /**
   * Get the full menu
   */
  async getMenu() {
    return {
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
  }

  /**
   * Get details for a specific dish
   */
  async getDishDetails({ dish_name }) {
    const dish = findDish(dish_name);
    if (!dish) {
      return { error: `Dish "${dish_name}" not found in our menu.` };
    }
    return {
      name: dish.name,
      category: dish.category,
      description: dish.description,
      price: `$${dish.price}`,
      ingredients: dish.ingredients,
      allergens: dish.allergens,
      vegetarian: dish.vegetarian,
    };
  }

  /**
   * Get ingredients for a specific dish
   */
  async getIngredients({ dish_name }) {
    const dish = findDish(dish_name);
    if (!dish) {
      return { error: `Dish "${dish_name}" not found in our menu.` };
    }
    return {
      dish: dish.name,
      ingredients: dish.ingredients,
      allergens: dish.allergens,
    };
  }

  /**
   * Search for dishes
   */
  async searchDishes({ query }) {
    const results = searchDishes(query);
    if (results.length === 0) {
      return { message: `No dishes found matching "${query}".`, dishes: [] };
    }
    return {
      dishes: results.map((dish) => ({
        name: dish.name,
        category: dish.category,
        description: dish.description,
        price: `$${dish.price}`,
        vegetarian: dish.vegetarian,
      })),
    };
  }

  /**
   * Get vegetarian dishes
   */
  async getVegetarianDishes() {
    const vegetarianDishes = getAllDishes().filter((dish) => dish.vegetarian);
    return {
      dishes: vegetarianDishes.map((dish) => ({
        name: dish.name,
        category: dish.category,
        description: dish.description,
        price: `$${dish.price}`,
      })),
    };
  }

  /**
   * Get dishes by category
   */
  async getDishesByCategory({ category }) {
    const cat = menuData.categories.find(
      (c) => c.name.toLowerCase() === category.toLowerCase()
    );
    if (!cat) {
      return {
        error: `Category "${category}" not found. Available categories: ${menuData.categories.map((c) => c.name).join(', ')}`,
      };
    }
    return {
      category: cat.name,
      dishes: cat.dishes.map((dish) => ({
        name: dish.name,
        description: dish.description,
        price: `$${dish.price}`,
        vegetarian: dish.vegetarian,
      })),
    };
  }

  /**
   * Get tool descriptions for AI context
   */
  getToolDescriptions() {
    return `
Available Tools for Restaurant Menu:
1. get_menu - Get the full restaurant menu with all categories and dishes
2. get_dish_details(dish_name) - Get detailed information about a specific dish
3. get_ingredients(dish_name) - Get ingredients and allergens for a dish
4. search_dishes(query) - Search dishes by name, description, or ingredient
5. get_vegetarian_dishes - Get all vegetarian options
6. get_dishes_by_category(category) - Get dishes in a category (Appetizers, Pasta, Pizza, Main Courses, Desserts)
    `.trim();
  }
}

export const mcpClient = new MenuMCPClient();
export default MenuMCPClient;
