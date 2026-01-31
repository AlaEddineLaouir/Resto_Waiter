# Restaurant Menu Chatbot 🍽️

A multi-tenant SaaS restaurant menu chatbot using Model Context Protocol (MCP) with Perplexity AI integration, PostgreSQL database, and React.js frontend.

## Features

- **AI-Powered Chat**: Ask questions about the menu using natural language
- **MCP Integration**: Structured tools for querying menu data
- **React Frontend**: Modern React.js frontend with Vite
- **Admin Dashboard**: Full CRUD for menu, ingredients, and settings
- **Multi-Tenant**: Path-based tenant routing with isolated data
- **PostgreSQL Database**: Persistent storage with migrations
- **Search**: Find dishes by name or ingredient

## Project Structure

```
├── src/                      # Backend
│   ├── server.js             # Main entry point with clustering
│   ├── api/                  # Express.js REST API
│   │   ├── app.js            # Main API routes
│   │   ├── admin.js          # Admin API with JWT auth
│   │   └── app-multitenant.js# Multi-tenant router
│   ├── db/                   # Database layer
│   │   ├── index.js          # PostgreSQL connection pool
│   │   ├── migrate.js        # Migration runner
│   │   ├── seed.js           # Seed script
│   │   ├── migrations/       # SQL migrations
│   │   └── repositories/     # Data access layer
│   ├── mcp-server/           # MCP server with menu tools
│   ├── mcp-client/           # MCP client for tool access
│   └── middleware/           # Express middleware
│       ├── auth.js           # JWT authentication
│       ├── security.js       # Security headers
│       ├── rateLimit.js      # Rate limiting
│       └── tenant.js         # Tenant resolution
├── frontend/                 # React.js frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # Context providers
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # API service layer
│   │   └── App.jsx           # Main app with routing
│   ├── package.json
│   └── vite.config.js
├── public/                   # Legacy vanilla JS frontend
├── data/                     # JSON data (for non-DB mode)
└── package.json
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `get_menu` | Get the full restaurant menu |
| `get_dish_details` | Get details about a specific dish |
| `get_ingredients` | Get ingredients for a dish |
| `search_dishes` | Search dishes by name or ingredient |
| `get_vegetarian_dishes` | Get all vegetarian options |
| `get_dishes_by_category` | Get dishes in a category |

## Setup

### 1. Install Backend Dependencies

```bash
npm install
```

### 2. Install Frontend Dependencies

```bash
npm run frontend:install
# or: cd frontend && npm install
```

### 3. Set Up PostgreSQL (Optional)

Create a `.env` file with:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/restaurant_menu
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-32-char-encryption-key
```

Run migrations and seed:

```bash
npm run db:migrate
npm run db:seed
```

### 4. Start Development Servers

```bash
# Backend only (uses JSON data)
npm run dev

# Frontend only (proxies to backend)
npm run frontend:dev

# Both together
npm run dev:full
```

### 5. Configure Perplexity AI

- Open http://localhost:5173/settings (React) or http://localhost:3000/setup.html (legacy)
- Enter your Perplexity AI API key
- Get an API key from [Perplexity AI Settings](https://www.perplexity.ai/settings/api)

### 6. Start Chatting

- **React Frontend**: http://localhost:5173
- **Legacy Frontend**: http://localhost:3000
- **Admin Dashboard**: http://localhost:5173/admin

## API Endpoints

### Public API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Get current configuration |
| POST | `/api/config` | Save configuration |
| GET | `/api/menu` | Get full menu |
| GET | `/api/search?q=query` | Search dishes |
| GET | `/api/tools` | List available MCP tools |
| POST | `/api/chat` | Send a chat message |

### Admin API (JWT Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/dashboard` | Dashboard stats |
| CRUD | `/api/admin/categories` | Manage categories |
| CRUD | `/api/admin/dishes` | Manage dishes |
| CRUD | `/api/admin/ingredients` | Manage ingredients |
| GET/PUT | `/api/admin/settings` | Tenant settings |

### Multi-Tenant Routing

All routes support tenant prefix: `/t/{tenantId}/api/...`

## Scripts

```bash
npm start              # Start production server
npm run dev            # Start backend with hot reload
npm run dev:full       # Start backend + frontend together
npm run frontend:dev   # Start React development server
npm run frontend:build # Build React for production
npm run db:migrate     # Run database migrations
npm run db:seed        # Seed database from menu.json
```

## Technologies

- **Node.js** with ES Modules
- **Express.js** for REST API
- **React.js** with Vite for frontend
- **PostgreSQL** with connection pooling
- **@modelcontextprotocol/sdk** for MCP implementation
- **Perplexity AI** for natural language processing
- **JWT** for admin authentication
