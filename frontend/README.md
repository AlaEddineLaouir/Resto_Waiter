# React Frontend for Restaurant Menu Chatbot

This is the React.js frontend for the restaurant menu chatbot application.

## Features

- 💬 **Chat Interface** - AI-powered chat with restaurant menu assistance
- 🍽️ **Menu Display** - Browse and search restaurant menu
- ⚙️ **Settings** - Configure API keys and AI models
- 🔐 **Admin Dashboard** - Manage menu, ingredients, and settings

## Prerequisites

- Node.js 18+
- npm or yarn

## Getting Started

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The React app will start on `http://localhost:5173` and proxy API requests to the backend on port 3000.

### 3. Start Backend Server

In a separate terminal, from the project root:

```bash
npm start
```

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── admin/       # Admin dashboard components
│   │   ├── chat/        # Chat interface components
│   │   ├── common/      # Shared components
│   │   ├── menu/        # Menu display components
│   │   └── settings/    # Settings page components
│   ├── contexts/        # React Context providers
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── services/        # API service layer
│   ├── App.jsx          # Main app with routing
│   ├── index.css        # Global styles
│   └── main.jsx         # Entry point
├── index.html           # HTML template
├── package.json
└── vite.config.js       # Vite configuration
```

## Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

Create a `.env.local` file based on `.env.example`:

```env
VITE_API_BASE_URL=       # Leave empty for same-origin
VITE_DEFAULT_TENANT_ID=default
```

## Building for Production

```bash
npm run build
```

The build output goes to `public/react/` in the parent directory, ready to be served by Express.

## Architecture

### Components
- **Common**: Shared UI components (Header, Layout, LoadingSpinner, etc.)
- **Chat**: Chat interface with message list, input, and typing indicator
- **Menu**: Menu display with categories and dish items
- **Settings**: API configuration and MCP tools display
- **Admin**: Full admin dashboard with CRUD operations

### State Management
- **TenantContext**: Tenant configuration and branding
- **AuthContext**: Admin authentication state
- **ChatContext**: Chat messages and conversation state

### Custom Hooks
- `useMenu`: Fetch and search menu data
- `useMCPTools`: Fetch available MCP tools
- `useSettings`: Manage API settings
- `useAdmin*`: Admin CRUD operations

### API Service
Centralized API calls with axios, including:
- Request interceptor for auth token
- Response interceptor for error handling
- Typed API methods for all endpoints

## Multi-tenant Support

The app supports multi-tenant routing via URL paths:
- `/` - Default tenant
- `/t/{tenantId}/` - Specific tenant

Tenant context is loaded automatically and applies branding.
