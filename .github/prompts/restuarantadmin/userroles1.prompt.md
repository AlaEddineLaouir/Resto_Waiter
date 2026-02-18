# 🍽️ MVP Role Migration & Per-Role Dashboards

> **Goal:** Migrate the existing 5-role RBAC system to a cleaner 4-role MVP model (Admin, Manager, Chef, Waiter). Keep ALL current working permissions intact. Add a dedicated dashboard per role.

---

## 📌 Current State (What Already Works — DO NOT BREAK)

### Current Prisma Enum (`TenantUserRole`)
```
owner         → maps to new "admin"
manager       → stays as "manager"
menu_editor   → REMOVE (merge permissions into manager)
foh_staff     → maps to new "waiter"
kitchen_staff → maps to new "chef"
```

### Current Permission Keys (resource.action format) — KEEP ALL
```
dashboard.read
menus.read / .create / .update / .delete / .publish
items.read / .create / .update / .delete
sections.read / .create / .update / .delete
brands.read / .create / .update / .delete
locations.read / .create / .update / .delete
publications.read / .create / .update / .delete
ingredients.read / .create / .update / .delete
options.read / .create / .update / .delete
staff.read / .create / .update / .delete
analytics.read
allergens.read
dietary.read
chatbot.read
```

### Current Files That Enforce RBAC (DO NOT remove logic, only update role mappings)
- `src/lib/rbac/permissions.ts` — Permission key constants & PermissionKey type
- `src/lib/rbac/roles.ts` — ROLE_HIERARCHY, ROLE_PERMISSIONS, getPermissionsForRole()
- `src/lib/rbac/policy.ts` — can(), canAccessResource(), canManageUser(), canAssignRole()
- `src/lib/rbac/guards.ts` — requireAuth(), requirePermission(), getAuthUser()
- `src/lib/permissions.tsx` — Client-side PermissionsProvider, RequirePermission, HasPermission
- `src/app/t/[tenantId]/admin/layout.tsx` — Sidebar nav with permission-filtered sections

### Current Dashboard (`src/app/t/[tenantId]/admin/page.tsx`)
Shows: stats grid (Brands, Locations, Menus, Items), chat sessions, quick actions, onboarding guide.

---

## 🚀 Migration Plan: 5 Roles → 4 Roles

### Step 1: Update Prisma Enum

```prisma
enum TenantUserRole {
  admin          // Was: owner — Full access
  manager        // Stays: manager — Absorbs menu_editor permissions
  chef           // Was: kitchen_staff — Kitchen focused
  waiter         // Was: foh_staff — Front of house
}
```

### Step 2: Database Migration

```sql
-- Rename enum values (Prisma migration)
ALTER TYPE "TenantUserRole" RENAME VALUE 'owner' TO 'admin';
ALTER TYPE "TenantUserRole" RENAME VALUE 'menu_editor' TO 'manager'; -- merge into manager
ALTER TYPE "TenantUserRole" RENAME VALUE 'foh_staff' TO 'waiter';
ALTER TYPE "TenantUserRole" RENAME VALUE 'kitchen_staff' TO 'chef';

-- Convert existing menu_editor users to manager
UPDATE admin_users SET role = 'manager' WHERE role = 'menu_editor';
```

### Step 3: Update Role Hierarchy (`src/lib/rbac/roles.ts`)

```ts
export const ROLE_HIERARCHY: TenantUserRole[] = [
  'chef',       // Level 0 — kitchen only
  'waiter',     // Level 1 — front of house
  'manager',    // Level 2 — daily operations (absorbed menu_editor)
  'admin',      // Level 3 — full control
];
```

### Step 4: Update Seed Roles (`prisma/seed-roles.ts`)

Update the roles array to use the 4 new role slugs with matching permissions.

---

## 🛡️ New Role Definitions with Exact Permissions

### 1. Admin (was `owner`) — 👑 Full Control

**Purpose:** Restaurant owner. Full CRUD on everything.

| Category | Permissions |
|----------|------------|
| Dashboard | `dashboard.read` |
| Menus | `menus.read`, `.create`, `.update`, `.delete`, `.publish` |
| Items | `items.read`, `.create`, `.update`, `.delete` |
| Sections | `sections.read`, `.create`, `.update`, `.delete` |
| Brands | `brands.read`, `.create`, `.update`, `.delete` |
| Locations | `locations.read`, `.create`, `.update`, `.delete` |
| Publications | `publications.read`, `.create`, `.update`, `.delete` |
| Ingredients | `ingredients.read`, `.create`, `.update`, `.delete` |
| Options | `options.read`, `.create`, `.update`, `.delete` |
| Staff | `staff.read`, `.create`, `.update`, `.delete` |
| Orders | `orders.read`, `.create`, `.update`, `.delete` |
| Analytics | `analytics.read`, `analytics.export` |
| Settings | `settings.read`, `settings.update` |
| Reference | `allergens.read`, `dietary.read` |
| Chatbot | `chatbot.read` |

### 2. Manager (absorbs `menu_editor`) — 📊 Daily Operations

**Purpose:** Oversee daily restaurant ops. Full menu editing, limited staff management, no destructive admin actions.

| Category | Permissions |
|----------|------------|
| Dashboard | `dashboard.read` |
| Menus | `menus.read`, `.create`, `.update`, `.delete`, `.publish` |
| Items | `items.read`, `.create`, `.update`, `.delete` |
| Sections | `sections.read`, `.create`, `.update`, `.delete` |
| Brands | `brands.read`, `.update` |
| Locations | `locations.read`, `.update` |
| Publications | `publications.read`, `.create`, `.update` |
| Ingredients | `ingredients.read`, `.create`, `.update`, `.delete` |
| Options | `options.read`, `.create`, `.update`, `.delete` |
| Staff | `staff.read`, `.create`, `.update` *(no delete)* |
| Orders | `orders.read`, `.create`, `.update` |
| Analytics | `analytics.read`, `analytics.export` |
| Settings | `settings.read` |
| Reference | `allergens.read`, `dietary.read` |
| Chatbot | `chatbot.read` |

### 3. Chef (was `kitchen_staff`) — 👨‍🍳 Kitchen Focus

**Purpose:** View items, ingredients, orders. Update order status. Minimal UI.

| Category | Permissions |
|----------|------------|
| Dashboard | `dashboard.read` |
| Items | `items.read` |
| Sections | `sections.read` |
| Ingredients | `ingredients.read` |
| Orders | `orders.read`, `orders.update` *(status only)* |
| Reference | `allergens.read`, `dietary.read` |

### 4. Waiter (was `foh_staff`) — 🍽️ Front of House

**Purpose:** View menu for customer questions. Create and manage orders. Manage table status.

| Category | Permissions |
|----------|------------|
| Dashboard | `dashboard.read` |
| Menus | `menus.read` |
| Items | `items.read` |
| Sections | `sections.read` |
| Locations | `locations.read` |
| Orders | `orders.read`, `orders.create`, `orders.update` |
| Reference | `allergens.read`, `dietary.read` |

---

## 📦 Permission Matrix Summary

| Permission | Admin | Manager | Chef | Waiter |
|-----------|-------|---------|------|--------|
| `dashboard.read` | ✅ | ✅ | ✅ | ✅ |
| `menus.*` (CRUD+publish) | ✅ full | ✅ full | ❌ | read |
| `items.*` | ✅ full | ✅ full | read | read |
| `sections.*` | ✅ full | ✅ full | read | read |
| `brands.*` | ✅ full | read+update | ❌ | ❌ |
| `locations.*` | ✅ full | read+update | ❌ | read |
| `publications.*` | ✅ full | read+create+update | ❌ | ❌ |
| `ingredients.*` | ✅ full | ✅ full | read | ❌ |
| `options.*` | ✅ full | ✅ full | ❌ | ❌ |
| `staff.*` | ✅ full | read+create+update | ❌ | ❌ |
| `orders.*` | ✅ full | read+create+update | read+update | read+create+update |
| `analytics.*` | ✅ full | read+export | ❌ | ❌ |
| `settings.*` | read+update | read | ❌ | ❌ |
| `allergens.read` | ✅ | ✅ | ✅ | ✅ |
| `dietary.read` | ✅ | ✅ | ✅ | ✅ |
| `chatbot.read` | ✅ | ✅ | ❌ | ❌ |

---

## 📊 Per-Role Dashboards

Each role sees a **different dashboard view** at `src/app/t/[tenantId]/admin/page.tsx`. The page checks `user.role` and renders the appropriate dashboard component.

### Admin Dashboard — `components/dashboards/AdminDashboard.tsx`

Full overview. Shows everything the current dashboard shows plus more:

| Widget | Description |
|--------|------------|
| **Stats Grid** | Brands, Locations, Menus, Items count (existing) |
| **Revenue Overview** | Monthly revenue chart (if orders exist) |
| **Chat Sessions** | Today + This Month (existing) |
| **Staff Overview** | Total staff count by role, recent logins |
| **Quick Actions** | Add Item, Manage Menus, Manage Staff, Publish Menu, View Settings |
| **Recent Activity** | Audit log feed — last 10 actions across the restaurant |
| **Onboarding Guide** | 5-step getting started (existing) |

### Manager Dashboard — `components/dashboards/ManagerDashboard.tsx`

Operations-focused. Menu health + order activity:

| Widget | Description |
|--------|------------|
| **Menu Stats** | Total menus, items, sections, published vs draft |
| **Order Activity** | Today's orders count, pending, completed |
| **Staff Online** | Who's currently logged in |
| **Quick Actions** | Edit Menu, Add Item, View Orders, Publish Menu |
| **Recent Menu Changes** | Last 5 item/section edits |
| **Availability Alerts** | Items marked as out-of-stock |

### Chef Dashboard — `components/dashboards/ChefDashboard.tsx`

Minimal, kitchen-focused. Large cards, easy to read:

| Widget | Description |
|--------|------------|
| **Active Orders** | List of pending orders with items (large font, card-based) |
| **Order Queue** | Count of orders: Pending / In Progress / Ready |
| **My Completed Today** | How many orders marked as ready today |
| **Ingredient Alerts** | Low-stock or allergen flags on today's order items |

### Waiter Dashboard — `components/dashboards/WaiterDashboard.tsx`

Customer-service focused. Tables + orders:

| Widget | Description |
|--------|------------|
| **My Tables** | Table grid showing status (free / occupied / awaiting payment) |
| **My Active Orders** | Orders created by this waiter, with status |
| **Quick Actions** | New Order, View Menu, Mark Table Free |
| **Today's Summary** | Orders served, total covers |
| **Menu Quick Search** | Search bar to look up items (allergens, ingredients) for customer questions |

---

## 🏗️ Implementation Steps

### Phase 1: Schema & Migration
1. Create Prisma migration to rename enum values
2. Run data migration to convert `menu_editor` → `manager`, `owner` → `admin`, etc.
3. Update `prisma/seed-roles.ts` with 4 new roles
4. Update `prisma/seed-users-baraka.ts` and other seed files

### Phase 2: RBAC Code Updates
5. Update `src/lib/rbac/roles.ts` — new ROLE_HIERARCHY, ROLE_PERMISSIONS
6. Update `src/lib/rbac/permissions.ts` — add `orders.*`, `settings.*`, `analytics.export` keys
7. Update `src/lib/rbac/policy.ts` — change `'owner'` references to `'admin'`
8. Update `src/lib/rbac/guards.ts` — no logic changes, just verify
9. Update `src/lib/permissions.tsx` — change role checks from `owner` to `admin`

### Phase 3: Admin Layout Updates
10. Update `src/app/t/[tenantId]/admin/layout.tsx` — sidebar nav for new role names
11. Update role display labels (👑 Admin, 📊 Manager, 👨‍🍳 Chef, 🍽️ Waiter)

### Phase 4: Per-Role Dashboards
12. Create `src/components/dashboards/AdminDashboard.tsx`
13. Create `src/components/dashboards/ManagerDashboard.tsx`
14. Create `src/components/dashboards/ChefDashboard.tsx`
15. Create `src/components/dashboards/WaiterDashboard.tsx`
16. Update `src/app/t/[tenantId]/admin/page.tsx` — role-based dashboard router
17. Create `/api/admin/dashboard/[role]` API routes for role-specific data

### Phase 5: Seed & Test
18. Update all seed files
19. Test login as each role — verify correct dashboard renders
20. Test permission enforcement on all API routes
21. Verify sidebar nav shows/hides correctly per role

---

## ⚠️ Migration Safety Rules

1. **DO NOT** delete any existing permission keys — only add new ones
2. **DO NOT** change the `can()`, `canAccessResource()`, or `canManageUser()` function signatures
3. **DO NOT** alter tenant isolation logic
4. **DO NOT** remove the `permissions` JSON column on `AdminUser` — it still allows per-user overrides
5. **DO** use a Prisma migration (not raw SQL) for enum changes
6. **DO** keep `locationIds` scoping — Chef/Waiter should be scopeable to specific locations
7. **DO** keep the auto-refresh (30s) in `PermissionsProvider`

---

## 🔍 Files to Modify (Complete List)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Rename enum values |
| `prisma/seed-roles.ts` | Update 5→4 roles with new slugs |
| `prisma/seed-users-baraka.ts` | Update user role references |
| `src/lib/rbac/permissions.ts` | Add `orders.*`, `settings.*`, `analytics.export` |
| `src/lib/rbac/roles.ts` | New hierarchy + permission mappings |
| `src/lib/rbac/policy.ts` | `'owner'` → `'admin'` references |
| `src/lib/permissions.tsx` | `'owner'` → `'admin'` in client checks |
| `src/app/t/[tenantId]/admin/layout.tsx` | Role labels + nav adjustments |
| `src/app/t/[tenantId]/admin/page.tsx` | Role-based dashboard router |
| `src/app/api/admin/dashboard/route.ts` | Extend with role-specific data |
| `src/components/dashboards/` *(new)* | 4 dashboard components |

---

## 🧪 Test Matrix

| Test | Expected |
|------|----------|
| Login as Admin | See full AdminDashboard, all sidebar nav items |
| Login as Manager | See ManagerDashboard, menu + orders + staff nav |
| Login as Chef | See ChefDashboard, only items + ingredients in sidebar |
| Login as Waiter | See WaiterDashboard, menu (read) + orders nav |
| Manager tries staff.delete | 403 Forbidden |
| Chef tries menus.update | 403 Forbidden |
| Waiter tries staff.read | 403 Forbidden |
| Cross-tenant access | 404 Not Found (tenant isolation) |
