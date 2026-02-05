# Restaurant Menu Chatbot 🍽️

A multi-tenant SaaS restaurant menu chatbot built with Next.js, PostgreSQL, Prisma ORM, and Perplexity AI integration.

## Features

- **AI-Powered Chat**: Ask questions about the menu using natural language
- **MCP Integration**: Structured tools for querying menu data
- **Next.js App Router**: Modern React framework with server components
- **Admin Dashboard**: Full CRUD for menus, items, ingredients, and settings
- **Platform Admin**: Super admin panel for managing all tenants
- **Multi-Tenant**: Path-based tenant routing with isolated data (`/t/{tenantId}/...`)
- **Multi-Location**: Support for brands and locations per tenant
- **PostgreSQL + Prisma**: Type-safe database access with migrations
- **RBAC**: Role-based access control with granular permissions

## Project Structure

```
├── nextjs/                   # Next.js application
│   ├── src/
│   │   ├── app/              # App Router pages & API routes
│   │   │   ├── api/          # REST API endpoints
│   │   │   │   ├── admin/    # Restaurant admin APIs
│   │   │   │   ├── platform/ # Platform admin APIs
│   │   │   │   └── chat/     # Chat endpoint
│   │   │   ├── t/[tenantId]/ # Tenant-scoped pages
│   │   │   │   ├── admin/    # Restaurant admin dashboard
│   │   │   │   ├── menu/     # Public menu view
│   │   │   │   └── l/        # Location pages
│   │   │   ├── platform/     # Platform admin pages
│   │   │   └── chat/         # Chat interface
│   │   ├── components/       # React components
│   │   └── lib/              # Utilities & helpers
│   │       ├── prisma.ts     # Prisma client
│   │       ├── auth.ts       # Authentication
│   │       ├── mcp-tools.ts  # MCP tool definitions
│   │       └── rbac/         # Role-based access control
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   ├── migrations/       # Database migrations
│   │   └── seed-*.ts         # Seed scripts
│   └── package.json
├── package.json              # Root wrapper scripts
└── README.md
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `get_menu` | Get the full restaurant menu |
| `get_dish_details` | Get details about a specific dish |
| `get_ingredients` | Get ingredients for a dish |
| `search_dishes` | Search dishes by name or ingredient |

## Setup

### 1. Install Dependencies

```bash
npm install
npm run nextjs:install
```

### 2. Set Up PostgreSQL

Create a `.env` file in the `nextjs/` folder:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/restaurant_menu
JWT_SECRET=your-secret-key
PERPLEXITY_API_KEY=your-perplexity-api-key
```

### 3. Run Migrations & Seed

```bash
cd nextjs
npx prisma migrate dev
npx prisma db seed
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Access the Application

- **Chat Interface**: http://localhost:3000/chat
- **Platform Admin**: http://localhost:3000/platform
- **Tenant Admin**: http://localhost:3000/t/{tenantSlug}/admin
- **Public Menu**: http://localhost:3000/t/{tenantSlug}/menu

## API Endpoints

### Chat API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send a chat message |

### Admin API (JWT Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/auth/login` | Admin login |
| GET | `/api/admin/dashboard` | Dashboard stats |
| CRUD | `/api/admin/menus` | Manage menus |
| CRUD | `/api/admin/sections` | Manage menu sections |
| CRUD | `/api/admin/items` | Manage menu items |
| CRUD | `/api/admin/ingredients` | Manage ingredients |
| CRUD | `/api/admin/users` | Manage admin users |
| CRUD | `/api/admin/roles` | Manage roles |

### Platform API (Super Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| CRUD | `/api/platform/restaurants` | Manage tenants |
| CRUD | `/api/platform/users` | Manage platform users |
| CRUD | `/api/platform/plans` | Manage subscription plans |
| GET | `/api/platform/analytics` | Platform analytics |

## Scripts

```bash
npm start              # Start production server
npm run dev            # Start development server
npm run build          # Build for production
npm run lint           # Run ESLint
```

## Technologies

- **Next.js 15** with App Router
- **React 19** with Server Components
- **TypeScript** for type safety
- **PostgreSQL** with Prisma ORM
- **Tailwind CSS** for styling
- **Perplexity AI** for natural language processing
- **JWT** for authentication
- **RBAC** for authorization
