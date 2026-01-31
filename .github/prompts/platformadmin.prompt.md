

## Requirements

### 1. Database Schema Changes

#### New Tables

**subscription_plans**
- id (UUID, PRIMARY KEY)
- name (VARCHAR, NOT NULL)
- description (TEXT)
- price_monthly (DECIMAL)
- price_yearly (DECIMAL)
- max_menu_items (INTEGER)
- max_api_calls_monthly (INTEGER)
- features (JSONB)
- is_active (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**restaurant_subscriptions**
- id (UUID, PRIMARY KEY)
- restaurant_id (UUID, FOREIGN KEY)
- plan_id (UUID, FOREIGN KEY)
- status (ENUM: 'active', 'cancelled', 'expired', 'trial')
- start_date (TIMESTAMP)
- end_date (TIMESTAMP)
- billing_cycle (ENUM: 'monthly', 'yearly')
- auto_renew (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**usage_analytics**
- id (UUID, PRIMARY KEY)
- restaurant_id (UUID, FOREIGN KEY)
- date (DATE)
- api_calls (INTEGER, DEFAULT 0)
- chat_sessions (INTEGER, DEFAULT 0)
- unique_users (INTEGER, DEFAULT 0)
- menu_views (INTEGER, DEFAULT 0)
- created_at (TIMESTAMP)

**restaurants**
- id (UUID, PRIMARY KEY)
- name (VARCHAR, NOT NULL)
- email (VARCHAR, NOT NULL, UNIQUE)
- phone (VARCHAR)
- address (TEXT)
- settings (JSONB)
- is_active (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

shoul aslo update all other table to link to restaurant_id where applicable.

### 2. API Endpoints

**Subscription Management**
- GET /api/admin/plans - List all subscription plans
- POST /api/admin/plans - Create new subscription plan
- PUT /api/admin/plans/:id - Update subscription plan
- DELETE /api/admin/plans/:id - Deactivate subscription plan
- GET /api/admin/restaurants/:id/subscription - Get restaurant subscription
- PUT /api/admin/restaurants/:id/subscription - Update restaurant subscription

**Restaurant Management**
- GET /api/admin/restaurants - List all restaurants (with pagination, filters)
- GET /api/admin/restaurants/:id - Get restaurant details
- PUT /api/admin/restaurants/:id - Update restaurant settings
- POST /api/admin/restaurants/:id/toggle-status - Activate/deactivate restaurant

**Analytics**
- GET /api/admin/analytics/overview - System-wide analytics summary
- GET /api/admin/analytics/restaurants/:id - Restaurant-specific analytics
- GET /api/admin/analytics/usage - Usage trends across all restaurants
- GET /api/admin/analytics/revenue - Revenue analytics

**Authentication**
- POST /api/admin/auth/login - Admin login
- POST /api/admin/auth/logout - Admin logout
- GET /api/admin/auth/me - Get current admin user

### 3. Frontend Components

**Dashboard Pages**
- Overview Dashboard (system metrics, recent activity)
- Restaurants Management (list, search, filter)
- Restaurant Detail View (settings, subscription, analytics)
- Subscription Plans Management
- Analytics & Reports
- Admin Settings

**Key Components**
- AdminLayout (sidebar navigation, header)
- RestaurantList (table with sorting, filtering, pagination)
- RestaurantCard (summary card with quick actions)
- SubscriptionPlanForm (create/edit plans)
- AnalyticsChart (usage graphs using Chart.js or Recharts)
- UsageMetrics (real-time usage statistics)
- RestaurantSettings (configuration form)
- BillingHistory (subscription payment history)

### 4. Features & Functionality

**Dashboard Overview**
- Total restaurants count (active/inactive)
- Total revenue (monthly/yearly)
- System-wide API usage
- Recent sign-ups
- Top performing restaurants

**Restaurant Management**
- View all restaurants with filtering (active, plan type, etc.)
- Quick actions (activate, deactivate, view details)
- Bulk operations
- Export restaurant list

**Subscription Management**
- Create/edit subscription plans
- Assign plans to restaurants
- View subscription history
- Handle upgrades/downgrades
- Manage trials

**Analytics & Reporting**
- Usage trends over time
- Restaurant engagement metrics
- API call statistics
- Revenue tracking
- Custom date range reports
- Export analytics data

**Security & Access Control**
- Admin authentication with JWT
- Role-based access control (super admin, support admin)
- Audit logs for admin actions
- Secure API endpoints with middleware

### 5. Technical Implementation

**Backend Middleware**
- Authentication middleware for admin routes
- Rate limiting for admin API
- Request validation using Joi or Zod
- Error handling middleware

**Frontend State Management**
- React Context or Redux for global state
- React Query for API data fetching and caching
- Form handling with React Hook Form

**UI/UX Considerations**
- Responsive design for mobile/tablet/desktop
- Dark mode support
- Loading states and skeletons
- Toast notifications for actions
- Confirmation modals for destructive actions