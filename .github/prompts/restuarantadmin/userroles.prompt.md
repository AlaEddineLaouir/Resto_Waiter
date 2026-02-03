# Restaurant Menu SaaS - User Role System Implementation

This document defines the complete user role system for the restaurant management SaaS platform,
including roles, permissions, database schema, API endpoints, and UI components.

---

## 🏗️ Architecture Overview

The role system is divided into three levels:
1. **SaaS-Level Roles** - Platform administrators (internal team)
2. **Tenant-Level Roles** - Restaurant staff (per-restaurant users)
3. **End-Customer Roles** - Public users (optional, for loyalty features)

---

## 🔐 SaaS-Level Roles (Platform Admin)

### 1. Platform Super Admin (`super_admin`)
| Permission | Description |
|------------|-------------|
| ✅ Full platform access | All features and settings |
| ✅ Manage all tenants | Create, edit, suspend restaurants |
| ✅ Configure subscriptions | Plans, pricing, billing |
| ✅ Platform analytics | Cross-tenant metrics |
| ✅ Manage platform users | Add/remove admins |
| ✅ System integrations | API keys, webhooks |

### 2. Support Agent (`support_agent`)
| Permission | Description |
|------------|-------------|
| 👁️ Read-only tenant data | View restaurants, menus |
| ✅ Help troubleshoot | Access logs, chat history |
| ⚠️ Limited impersonation | Safe mode only |
| ❌ No destructive actions | Cannot delete or modify |

### 3. Billing Manager (`billing_manager`)
| Permission | Description |
|------------|-------------|
| ✅ Payment settings | Configure payment methods |
| ✅ View invoices | Access billing history |
| ✅ Plan management | Upgrade/downgrade tenants |
| ✅ Refunds | Process manual adjustments |
| ❌ No tenant data access | Cannot view menus/orders |

---

## 🍽️ Tenant-Level Roles (Restaurant Staff)

### 1. Restaurant Owner (`owner`)
| Permission | Description |
|------------|-------------|
| ✅ Full restaurant access | All features |
| ✅ Billing & subscription | Manage plan |
| ✅ All analytics | Revenue, usage, trends |
| ✅ Branding & locations | Logos, addresses |
| ✅ Staff management | Add/remove users, assign roles |
| ✅ Hardware config | Printers, tablets, POS |

### 2. Restaurant Manager (`manager`)
| Permission | Description |
|------------|-------------|
| ✅ Menu management | Full menu control |
| ✅ Analytics | Location-level reports |
| ✅ Staff scheduling | Manage shifts |
| ✅ Orders & publications | Handle operations |
| ✅ Location settings | Per-location config |
| ✅ Option groups | Dietary flags, allergens |
| ✅ User management | Add/edit lower-level staff |

### 3. Menu Editor (`menu_editor`)
| Permission | Description |
|------------|-------------|
| ✅ Menu items | Create, edit, delete |
| ✅ Sections | Organize categories |
| ✅ Ingredients | Manage ingredients |
| ✅ Allergens | Set allergen info |
| ✅ Pricing | Set item prices |
| ✅ AI descriptions | Use AI generator |
| ✅ Publish menus | Push changes live |
| ❌ Staff management | No access |

### 4. Front of House Staff (`foh_staff`)
| Permission | Description |
|------------|-------------|
| 👁️ View menu | Current active menu |
| ✅ Process orders | Take customer orders |
| 👁️ Order history | View past orders |
| 👁️ Item details | Allergens, ingredients |
| ✅ Customer chat | Limited support |
| ❌ Menu editing | No access |

### 5. Kitchen Staff (`kitchen_staff`)
| Permission | Description |
|------------|-------------|
| 👁️ Incoming orders | View order queue |
| ✅ Update order status | Mark as preparing/ready |
| 👁️ Ingredient lists | View recipes |
| 👁️ Allergen info | Safety information |
| ✅ Item availability | Mark items unavailable |
| ❌ Customer data | No access |

---

## 👤 End-Customer Roles (Public App)

### 1. Guest User (default)
- Browse menu (no login required)
- Place orders (if enabled)
- View item details

### 2. Registered Customer (optional)
- Save favorites
- Earn loyalty points
- Track order history
- Update preferences

---

## 🗄️ Database Schema

### Platform Admin (Prisma)
```prisma
enum PlatformAdminRole {
  super_admin     // Full platform access
  support_agent   // Read-only, troubleshooting
  billing_manager // Payment and plan management
}

model PlatformAdmin {
  id           String            @id @default(uuid())
  email        String            @unique
  username     String
  displayName  String?
  passwordHash String
  role         PlatformAdminRole @default(support_agent)
  permissions  Json              @default("[]")
  isActive     Boolean           @default(true)
  lastLogin    DateTime?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
  deletedAt    DateTime?
}
```

### Tenant User (Prisma)
```prisma
enum TenantUserRole {
  owner           // Full restaurant access
  manager         // Manage menus, staff, analytics
  menu_editor     // Edit menu items, sections
  foh_staff       // Front of House operations
  kitchen_staff   // Kitchen operations
}

model AdminUser {
  id           String         @id @default(uuid())
  tenantId     String
  username     String
  email        String
  displayName  String?
  passwordHash String
  role         TenantUserRole @default(menu_editor)
  permissions  Json           @default("[]")
  locationIds  String[]       @default([])  // Restrict to specific locations
  isActive     Boolean        @default(true)
  lastLogin    DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  deletedAt    DateTime?

  tenant       Tenant         @relation(...)
}
```

---

## 🔌 API Endpoints

### Platform Users API
| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/platform/users` | List platform admins | super_admin |
| POST | `/api/platform/users` | Create platform admin | super_admin |
| GET | `/api/platform/users/[id]` | Get user details | super_admin |
| PUT | `/api/platform/users/[id]` | Update user | super_admin |
| DELETE | `/api/platform/users/[id]` | Soft delete user | super_admin |

### Tenant Users API
| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/admin/users` | List tenant users | owner, manager |
| POST | `/api/admin/users` | Create tenant user | owner, manager |
| GET | `/api/admin/users/[id]` | Get user details | owner, manager |
| PUT | `/api/admin/users/[id]` | Update user | owner, manager |
| DELETE | `/api/admin/users/[id]` | Soft delete user | owner, manager |

---

## 🎨 UI Pages

### Platform Admin Dashboard
- **Route:** `/platform/users`
- **Features:**
  - List all platform admins
  - Create/edit/delete users
  - Filter by role
  - Search by email/name

### Restaurant Admin Dashboard
- **Route:** `/t/[tenantId]/admin/users`
- **Features:**
  - List all restaurant staff
  - Create/edit/delete users
  - Assign roles
  - Restrict to specific locations
  - Filter by role
  - Search by email/name

---

## 🔒 Permission Hierarchy

```
Platform Level:
  super_admin > billing_manager > support_agent

Tenant Level:
  owner > manager > menu_editor > foh_staff
                                > kitchen_staff
```

**Rules:**
1. Users can only manage roles lower than their own
2. Owners can create other owners (tenant isolation)
3. Cannot demote yourself
4. Cannot delete your own account
5. Soft delete preserves audit trail

---

## 📋 Implementation Checklist

- [x] Update Prisma schema with role enums
- [x] Create Platform Users API (`/api/platform/users`)
- [x] Create Tenant Users API (`/api/admin/users`)
- [x] Create Platform Users page (`/platform/users`)
- [x] Create Tenant Users page (`/t/[tenantId]/admin/users`)
- [x] Add navigation links in layouts
- [ ] Run Prisma migration
- [ ] Seed initial super_admin user
- [ ] Add role-based route protection middleware
- [ ] Implement granular permissions system

---

## 🚀 Next Steps

1. Run `npx prisma migrate dev --name add_user_roles` to apply schema changes
2. Seed a super_admin user for platform access
3. Implement middleware for role-based route protection
4. Add granular permissions for fine-tuned access control
5. Consider adding audit logging for user management actions