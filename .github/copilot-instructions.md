# Restaurant Menu Chatbot - MCP Project

This is a Node.js MVP project for a restaurant menu chatbot using Model Context Protocol (MCP).

## Project Structure

- `src/mcp-server/` - MCP server with restaurant menu tools
- `src/mcp-client/` - MCP client for connecting to the server
- `src/api/` - Express.js REST API backend
- `public/` - Frontend HTML/CSS/JS files
- `data/` - Menu and ingredient data

## Technologies

- Node.js with ES Modules
- @modelcontextprotocol/sdk for MCP implementation
- Express.js for REST API
- Perplexity AI for chat completions

## Available MCP Tools

1. **get_menu** - Get the full restaurant menu
2. **get_dish_details** - Get details about a specific dish
3. **get_ingredients** - Get ingredients for a dish
4. **search_dishes** - Search dishes by name or ingredient

## Setup

1. Run `npm install` to install dependencies
2. Open the setup page to configure your Perplexity AI API key
3. Start the server with `npm start`

## Development

- `npm run dev` - Start with nodemon for hot reload
- `npm start` - Production start
