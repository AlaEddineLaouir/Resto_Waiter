Here is the **cleanest, most scalable, production‑ready way** to handle **roles and permissions** in a **SaaS app built with Next.js + TypeScript + React** — based on real SaaS architecture patterns (multi‑tenant, RBAC, ABAC, feature flags, subscription plans).

***

# ✅ **The Best Approach: Centralized RBAC + Policy Layer + Tenant Context**

For modern SaaS (especially multi‑tenant), the **best and safest pattern** is:

# **RBAC + Permission Matrix + Policy Guard Layer + Tenant Context**

This gives you:

*   A simple DB representation (roles & permissions)
*   A scalable authorization model
*   Supports multi‑tenancy
*   Works perfectly with Next.js App Router + Server Components
*   Future‑friendly (can expand to ABAC & feature flags)

***

# ⭐ 1. **Use Role‑Based Access Control (RBAC) at the Core**

The foundation should be **role → permissions**.

### Recommended Tables

### **roles**

    id | tenant_id | name

### **permissions**

    id | key (e.g. "menu.update") | description

### **role\_permissions**

    role_id | permission_id

### **user\_roles**

    user_id | role_id | tenant_id

This gives you:

*   Unlimited roles
*   Unlimited permissions
*   Flexible mapping
*   Multi‑tenant isolation

***

# ⭐ 2. **Add a Permission Matrix for SaaS Logic**

Store permissions as **string keys**.  
Examples:

    "menu.read"
    "menu.create"
    "menu.update"
    "menu.delete"

    "orders.read"
    "orders.manage"

    "analytics.view"
    "billing.manage"
    "staff.manage"

Using string keys is the **industry standard** because it integrates cleanly with:

*   Route middleware
*   BFF endpoints
*   Server components
*   Feature flags
*   Policy rules

***

# ⭐ 3. **Use a Policy Layer (Recommended Technique)**

RBAC alone is not enough.  
You need **policies** → a small function that decides:

*   Which resource is being accessed
*   Who is trying to access it
*   Does the user + tenant + subscription plan allow it?

### Example policy function

```ts
export function can(user, permission: string, tenantId: string) {
  if (user.tenantId !== tenantId) return false;

  return user.permissions.includes(permission);
}
```

Or for more complex logic:

```ts
export function canManageMenu(user, menuItem) {
  return (
    user.permissions.includes("menu.update") &&
    user.tenantId === menuItem.tenantId
  );
}
```

***

# ⭐ 4. **Centralize Authorization in Server Components & Route Handlers**

Since Next.js 13+ App Router runs on the server, **you MUST check permissions on the server**, not the client.

### Where to enforce:

### **a) Route Handlers `/app/api/.../route.ts`**

Before doing anything:

```ts
import { auth } from "@/lib/auth";
import { can } from "@/lib/policy";

export async function PATCH(req, { params }) {
  const user = await auth();

  if (!can(user, "menu.update", user.tenantId)) {
    return new Response("Forbidden", { status: 403 });
  }

  // continue logic
}
```

### **b) Server Components**

No client-side bypass possible.

```tsx
export default async function Page() {
  const user = await auth();

  if (!can(user, "analytics.view", user.tenantId)) {
    notFound(); // or redirect
  }

  return <Dashboard />;
}
```

***

# ⭐ 5. **Client Components Should NOT Handle Security**

Client components **only receive allowed UI data**, never check security.

They only hide UI elements, not enforce rules.

***

# ⭐ 6. **Use Middleware for Tenant Context Extraction**

Multi‑tenant apps require tenant resolution:

```ts
export function middleware(req) {
  const hostname = req.headers.get("host");
  const tenantKey = hostname.split(".")[0] !== "www" ? hostname.split(".")[0] : null;

  const res = NextResponse.next();
  if (tenantKey) res.headers.set("x-tenant-id", tenantKey);

  return res;
}
```

**All auth & policy functions must include the tenant.**

***

# ⭐ 7. **Best Practice: Cache Permissions in the Session Token**

Your JWT (or session) should contain:

    {
      userId: "123",
      tenantId: "tenant_456",
      roles: ["manager"],
      permissions: ["menu.update", "menu.read"]
    }

This avoids DB lookups on every request.

For better security, refresh permissions on login or role-change events.

***

# ⭐ 8. **Add Feature Flags (Optional but Highly Recommended)**

SaaS pricing plans often gate features (ex: “Analytics” only for Pro).

Use a table:

### **subscription\_plans**

    id | name | is_active

### **plan\_features**

    plan_id | feature_key

Example keys:

    "analytics"
    "smart_recommendations"
    "ai_menu_writer"
    "qr_ordering"

Then check in policies:

```ts
if (!user.features.includes("analytics")) return false;
```

***

# ⭐ 9. **Recommended Tech Stack for RBAC in Next.js**

### **Auth Layer**

*   NextAuth (Auth.js)
*   Clerk
*   Supabase Auth
*   Custom JWT

### **RBAC Storage**

*   PostgreSQL (recommended)
*   Prisma ORM

### **Policy Layer**

Custom TypeScript modules `lib/policy.ts`

### **Session Storage**

*   JWT (stateless)
*   Or NextAuth + database adapter

### **Middleware**

`middleware.ts` for tenant resolution and route gating.

***

# ⭐ 10. **Very Clean Folder Structure**

    src/
      app/
        (tenant)/
          page.tsx
          menu/
            page.tsx
          orders/
            page.tsx
        api/
          menu/
            route.ts
      lib/
        auth/
          index.ts
        rbac/
          roles.ts
          permissions.ts
          policy.ts
          utils.ts
        tenant/
          resolve.ts

***

# 🎯 Final Best Architecture Summary

### 📌 **Use RBAC as your foundation**

Roles, permissions, user\_roles, role\_permissions.

### 📌 **Add a policy layer**

Check tenant, check plan, check resource.

### 📌 **Enforce everything in server components & APIs**

Client-side logic = cosmetic only.

### 📌 **Cache permissions in the session**

Faster & scalable.

### 📌 **Use middleware for tenant context**

### 📌 **Support feature flags for subscription tiers**

This structure is how companies like Shopify, Notion, Stripe, and modern SaaS handle authorization internally (role → permission → policy).

***

# Want me to generate?

✔ A full RBAC database schema (Prisma version)  
✔ A complete RBAC system boilerplate for Next.js (copy/paste)  
✔ A policy module with examples  
✔ Middleware + Tenant resolver  
✔ A full folder structure for your SaaS

Just tell me what you want next.
