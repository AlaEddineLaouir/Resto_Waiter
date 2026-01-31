Absolutely—here’s a **production‑grade, multi‑tenant database schema** for a **Menu App SaaS** that supports **QR dine‑in and takeaway/delivery** out of the box. It implements:

*   **Tenant isolation** (shared schema with `tenant_id` + optional row-level security).
*   **Menu → Sections → Items → OptionGroups → OptionItems** with **pricing**, **scheduling/availability**, **i18n**, **allergens**, and **dietary flags**.
*   **Location-aware** configs (per restaurant branch), **publication/versioning**, and **asset management**.
*   Auditability and indexing for performance.



Make sure to create in the restauran admin dashboard the ability to manage the following database schema insert delete update 

***

## 1) Core multi‑tenant & org/location

```sql
-- Tenants (your SaaS customers)
CREATE TABLE tenant (
    tenant_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 TEXT NOT NULL,
    status               TEXT NOT NULL DEFAULT 'active', -- active|suspended|closed
    default_currency     TEXT NOT NULL DEFAULT 'EUR',
    price_tax_policy     TEXT NOT NULL DEFAULT 'tax_included', -- or 'tax_excluded'
    default_locale       TEXT NOT NULL DEFAULT 'fr-FR',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenant domains/subdomains for routing (menu.mybrand.com, mybrand.saas.com)
CREATE TABLE tenant_domain (
    tenant_id            UUID NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    domain               CITEXT PRIMARY KEY, -- unique across SaaS
    is_primary           BOOLEAN NOT NULL DEFAULT false
);

-- Brands/organizations (some tenants may run multiple brands)
CREATE TABLE org_brand (
    tenant_id            UUID NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    brand_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 TEXT NOT NULL,
    slug                 TEXT NOT NULL, -- unique per tenant
    UNIQUE (tenant_id, slug)
);

-- Physical or virtual locations (branches, ghost kitchens)
CREATE TABLE location (
    tenant_id            UUID NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    location_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id             UUID NOT NULL REFERENCES org_brand(brand_id) ON DELETE CASCADE,
    name                 TEXT NOT NULL,
    address_line1        TEXT,
    address_line2        TEXT,
    city                 TEXT,
    postal_code          TEXT,
    country_code         CHAR(2) DEFAULT 'FR',
    tzid                 TEXT NOT NULL DEFAULT 'Europe/Paris',
    service_dine_in      BOOLEAN NOT NULL DEFAULT true,
    service_takeaway     BOOLEAN NOT NULL DEFAULT true,
    service_delivery     BOOLEAN NOT NULL DEFAULT false,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, brand_id, name)
);

-- Dine-in tables (for QR codes)
CREATE TABLE dining_table (
    tenant_id            UUID NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    location_id          UUID NOT NULL REFERENCES location(location_id) ON DELETE CASCADE,
    table_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label                TEXT NOT NULL, -- e.g., "A12"
    qr_code_value        TEXT NOT NULL, -- embedded token/URL param
    is_active            BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (tenant_id, location_id, label),
    UNIQUE (tenant_id, location_id, qr_code_value)
);
```

***

## 2) Identity & roles (minimal SaaS RBAC)

```sql
CREATE TABLE app_user (
    tenant_id            UUID NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    user_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                CITEXT NOT NULL,
    display_name         TEXT,
    role                 TEXT NOT NULL DEFAULT 'staff', -- owner|admin|manager|staff|viewer
    is_active            BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);
```

> You can extend with per‑location permissions via a join table if needed.

***

## 3) Menu containers, versioning & publication

We separate **menu content** from **publication** to allow draft changes and timed releases.

```sql
-- Menu container (Dinner, Lunch, Drinks)
CREATE TABLE menu (
    tenant_id            UUID NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    menu_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id             UUID NOT NULL REFERENCES org_brand(brand_id) ON DELETE CASCADE,
    code                 TEXT NOT NULL, -- internal code
    is_active            BOOLEAN NOT NULL DEFAULT true,
    currency             TEXT,          -- overrides tenant default if set
    price_tax_policy     TEXT,          -- overrides tenant default (tax_included|tax_excluded)
    default_locale       TEXT,          -- overrides tenant default
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, brand_id, code)
);

-- Menu translations
CREATE TABLE menu_i18n (
    tenant_id            UUID NOT NULL,
    menu_id              UUID NOT NULL REFERENCES menu(menu_id) ON DELETE CASCADE,
    locale               TEXT NOT NULL,
    name                 TEXT NOT NULL,        -- "Dinner", "Déjeuner"
    description          TEXT,
    PRIMARY KEY (tenant_id, menu_id, locale)
);

-- A menu can be available only on certain days/hours (e.g., Lunch 11:30–15:00)
CREATE TABLE menu_availability_rule (
    tenant_id            UUID NOT NULL,
    menu_id              UUID NOT NULL REFERENCES menu(menu_id) ON DELETE CASCADE,
    rule_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type         TEXT NOT NULL DEFAULT 'any', -- any|dine_in|takeaway|delivery
    dow_mask             INT NOT NULL, -- bitmask for days (Mon=1<<0 ... Sun=1<<6)
    start_time_local     TIME NOT NULL,
    end_time_local       TIME NOT NULL,
    start_date_local     DATE, -- optional date range
    end_date_local       DATE  -- optional date range
);

-- Versioned content (draft/published)
CREATE TABLE menu_version (
    tenant_id            UUID NOT NULL,
    menu_id              UUID NOT NULL REFERENCES menu(menu_id) ON DELETE CASCADE,
    version_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label                TEXT, -- "Spring 2026"
    status               TEXT NOT NULL DEFAULT 'draft', -- draft|published|archived
    created_by           UUID REFERENCES app_user(user_id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at         TIMESTAMPTZ
);

-- Which version is live at each location (location scoping is crucial)
CREATE TABLE menu_publication (
    tenant_id            UUID NOT NULL,
    location_id          UUID NOT NULL REFERENCES location(location_id) ON DELETE CASCADE,
    menu_id              UUID NOT NULL REFERENCES menu(menu_id) ON DELETE CASCADE,
    version_id           UUID NOT NULL REFERENCES menu_version(version_id) ON DELETE CASCADE,
    goes_live_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    retires_at           TIMESTAMPTZ, -- optional
    is_current           BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (tenant_id, location_id, menu_id),
    UNIQUE (tenant_id, location_id, menu_id, version_id)
);
```

***

## 4) Sections (categories) and items

```sql
-- Sections displayed within a specific menu version (so you can rearrange per version)
CREATE TABLE section (
    tenant_id            UUID NOT NULL,
    version_id           UUID NOT NULL REFERENCES menu_version(version_id) ON DELETE CASCADE,
    section_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_order        INT NOT NULL DEFAULT 0,
    is_active            BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE section_i18n (
    tenant_id            UUID NOT NULL,
    section_id           UUID NOT NULL REFERENCES section(section_id) ON DELETE CASCADE,
    locale               TEXT NOT NULL,
    title                TEXT NOT NULL,        -- "Starters"
    description          TEXT,
    PRIMARY KEY (tenant_id, section_id, locale)
);

-- Items (dishes/drinks)
CREATE TABLE item (
    tenant_id            UUID NOT NULL,
    version_id           UUID NOT NULL REFERENCES menu_version(version_id) ON DELETE CASCADE,
    item_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id           UUID NOT NULL REFERENCES section(section_id) ON DELETE CASCADE,
    sku                  TEXT, -- internal code
    display_order        INT NOT NULL DEFAULT 0,
    is_visible           BOOLEAN NOT NULL DEFAULT true,
    spiciness_level      SMALLINT CHECK (spiciness_level BETWEEN 0 AND 5), -- 0..5
    calories             INT,   -- optional
    image_asset_id       UUID,  -- FK to asset table
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE item_i18n (
    tenant_id            UUID NOT NULL,
    item_id              UUID NOT NULL REFERENCES item(item_id) ON DELETE CASCADE,
    locale               TEXT NOT NULL,
    name                 TEXT NOT NULL,
    description          TEXT,
    PRIMARY KEY (tenant_id, item_id, locale)
);
```

***

## 5) Pricing (base price + overrides)

Supports **per-location** and **time‑window** adjustments while retaining a clean base price.

```sql
-- Base price in the menu currency unless overridden
CREATE TABLE item_price_base (
    tenant_id            UUID NOT NULL,
    item_id              UUID NOT NULL REFERENCES item(item_id) ON DELETE CASCADE,
    currency             TEXT NOT NULL,
    amount_minor         BIGINT NOT NULL, -- store in minor units (cents)
    PRIMARY KEY (tenant_id, item_id)
);

-- Optional overrides (by location and/or time window)
CREATE TABLE item_price_override (
    tenant_id            UUID NOT NULL,
    item_id              UUID NOT NULL REFERENCES item(item_id) ON DELETE CASCADE,
    location_id          UUID REFERENCES location(location_id) ON DELETE CASCADE,
    service_type         TEXT DEFAULT 'any', -- any|dine_in|takeaway|delivery
    dow_mask             INT,               -- optional day-of-week mask
    start_time_local     TIME,              -- optional time window
    end_time_local       TIME,
    start_date_local     DATE,
    end_date_local       DATE,
    currency             TEXT,              -- optional override currency
    amount_minor         BIGINT NOT NULL,
    PRIMARY KEY (tenant_id, item_id, location_id, service_type, start_time_local, end_time_local, start_date_local, end_date_local)
);
```

> If you prefer simplified pricing, drop overrides and keep only `item_price_base`.

***

## 6) Options & modifiers (sizes, sides, add‑ons)

Option **groups** attach to items with selection rules (min/max, required, exclusive vs multi‑select). Each **option item** carries its own **price delta** and visibility.

```sql
-- Option groups attached to items (e.g., "Choose a side", "Size")
CREATE TABLE option_group (
    tenant_id            UUID NOT NULL,
    version_id           UUID NOT NULL REFERENCES menu_version(version_id) ON DELETE CASCADE,
    option_group_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                 TEXT,
    selection_mode       TEXT NOT NULL CHECK (selection_mode IN ('single','multiple')),
    min_select           INT NOT NULL DEFAULT 0,
    max_select           INT, -- NULL = no limit
    is_required          BOOLEAN NOT NULL DEFAULT false,
    display_order        INT NOT NULL DEFAULT 0,
    is_active            BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE option_group_i18n (
    tenant_id            UUID NOT NULL,
    option_group_id      UUID NOT NULL REFERENCES option_group(option_group_id) ON DELETE CASCADE,
    locale               TEXT NOT NULL,
    name                 TEXT NOT NULL,
    description          TEXT,
    PRIMARY KEY (tenant_id, option_group_id, locale)
);

-- Attach groups to items (reuse groups across multiple items if desired)
CREATE TABLE item_option_group (
    tenant_id            UUID NOT NULL,
    item_id              UUID NOT NULL REFERENCES item(item_id) ON DELETE CASCADE,
    option_group_id      UUID NOT NULL REFERENCES option_group(option_group_id) ON DELETE CASCADE,
    display_order        INT NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, item_id, option_group_id)
);

-- Option items (e.g., "Fries", "Salad", "Large")
CREATE TABLE option_item (
    tenant_id            UUID NOT NULL,
    option_item_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_group_id      UUID NOT NULL REFERENCES option_group(option_group_id) ON DELETE CASCADE,
    code                 TEXT,
    display_order        INT NOT NULL DEFAULT 0,
    is_default           BOOLEAN NOT NULL DEFAULT false,
    is_active            BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE option_item_i18n (
    tenant_id            UUID NOT NULL,
    option_item_id       UUID NOT NULL REFERENCES option_item(option_item_id) ON DELETE CASCADE,
    locale               TEXT NOT NULL,
    name                 TEXT NOT NULL,
    description          TEXT,
    PRIMARY KEY (tenant_id, option_item_id, locale)
);

-- Price deltas for options (can vary by location/time if needed)
CREATE TABLE option_item_price (
    tenant_id            UUID NOT NULL,
    option_item_id       UUID NOT NULL REFERENCES option_item(option_item_id) ON DELETE CASCADE,
    currency             TEXT NOT NULL,
    delta_minor          BIGINT NOT NULL, -- can be negative (e.g., -€1 if "No fries")
    PRIMARY KEY (tenant_id, option_item_id)
);

-- Optional: overrides akin to item_price_override (omitted for brevity)
```

***

## 7) Dietary flags & allergens (EU-friendly)

We keep **master vocabularies** and **link tables** to items and option items.

```sql
-- Allergen master (do not hardcode list; seed 14 EU allergens via data migration)
CREATE TABLE allergen (
    code                 TEXT PRIMARY KEY, -- e.g., "gluten", "peanuts"
    sort_order           INT NOT NULL DEFAULT 0
);

CREATE TABLE allergen_i18n (
    code                 TEXT NOT NULL REFERENCES allergen(code) ON DELETE CASCADE,
    locale               TEXT NOT NULL,
    name                 TEXT NOT NULL,       -- localized display "Gluten"
    PRIMARY KEY (code, locale)
);

-- Dietary flags (e.g., vegetarian, vegan, halal, kosher)
CREATE TABLE dietary_flag (
    code                 TEXT PRIMARY KEY,    -- "vegan", "vegetarian"
    sort_order           INT NOT NULL DEFAULT 0
);

CREATE TABLE dietary_flag_i18n (
    code                 TEXT NOT NULL REFERENCES dietary_flag(code) ON DELETE CASCADE,
    locale               TEXT NOT NULL,
    name                 TEXT NOT NULL,
    PRIMARY KEY (code, locale)
);

-- Item → allergens
CREATE TABLE item_allergen (
    tenant_id            UUID NOT NULL,
    item_id              UUID NOT NULL REFERENCES item(item_id) ON DELETE CASCADE,
    allergen_code        TEXT NOT NULL REFERENCES allergen(code) ON DELETE RESTRICT,
    PRIMARY KEY (tenant_id, item_id, allergen_code)
);

-- Option item → allergens (for toppings that introduce allergens)
CREATE TABLE option_item_allergen (
    tenant_id            UUID NOT NULL,
    option_item_id       UUID NOT NULL REFERENCES option_item(option_item_id) ON DELETE CASCADE,
    allergen_code        TEXT NOT NULL REFERENCES allergen(code) ON DELETE RESTRICT,
    PRIMARY KEY (tenant_id, option_item_id, allergen_code)
);

-- Item → dietary flags
CREATE TABLE item_dietary_flag (
    tenant_id            UUID NOT NULL,
    item_id              UUID NOT NULL REFERENCES item(item_id) ON DELETE CASCADE,
    dietary_code         TEXT NOT NULL REFERENCES dietary_flag(code) ON DELETE RESTRICT,
    PRIMARY KEY (tenant_id, item_id, dietary_code)
);
```

> This lets you maintain accurate allergen disclosures per dish **and** per modifier.

***

## 8) Assets (images) & attachments

```sql
CREATE TABLE asset (
    tenant_id            UUID NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    asset_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind                 TEXT NOT NULL DEFAULT 'image', -- image|pdf|other
    storage_url          TEXT NOT NULL, -- S3/Blob Storage
    content_type         TEXT,
    width_px             INT,
    height_px            INT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generic entity-to-asset mapping if you want more than one image per entity
CREATE TABLE entity_asset (
    tenant_id            UUID NOT NULL,
    entity_type          TEXT NOT NULL, -- 'item'|'section'|'menu'
    entity_id            UUID NOT NULL,
    asset_id             UUID NOT NULL REFERENCES asset(asset_id) ON DELETE CASCADE,
    display_order        INT NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, entity_type, entity_id, asset_id)
);
```

***

## 9) Localization (supported locales per tenant)

```sql
CREATE TABLE tenant_locale (
    tenant_id            UUID NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    locale               TEXT NOT NULL,
    is_default           BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (tenant_id, locale)
);
```

***

## 10) Optional: Orders (if/when you enable ordering)

While your app can be **menu-only**, you can future‑proof with a clean order core.

```sql
CREATE TABLE order_header (
    tenant_id            UUID NOT NULL,
    order_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id          UUID NOT NULL REFERENCES location(location_id) ON DELETE CASCADE,
    service_type         TEXT NOT NULL, -- dine_in|takeaway|delivery
    table_id             UUID REFERENCES dining_table(table_id),
    currency             TEXT NOT NULL,
    subtotal_minor       BIGINT NOT NULL DEFAULT 0,
    tax_minor            BIGINT NOT NULL DEFAULT 0,
    total_minor          BIGINT NOT NULL DEFAULT 0,
    status               TEXT NOT NULL DEFAULT 'created', -- created|paid|preparing|ready|served|cancelled
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_line (
    tenant_id            UUID NOT NULL,
    order_id             UUID NOT NULL REFERENCES order_header(order_id) ON DELETE CASCADE,
    line_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id              UUID NOT NULL, -- denormalized copy of menu item reference
    item_name            TEXT NOT NULL, -- snapshot of i18n to avoid drift
    qty                  INT NOT NULL CHECK (qty > 0),
    unit_price_minor     BIGINT NOT NULL,
    line_total_minor     BIGINT NOT NULL
);

CREATE TABLE order_line_option (
    tenant_id            UUID NOT NULL,
    line_id              UUID NOT NULL REFERENCES order_line(line_id) ON DELETE CASCADE,
    option_item_id       UUID NOT NULL,
    option_name          TEXT NOT NULL, -- snapshot
    delta_minor          BIGINT NOT NULL,
    PRIMARY KEY (tenant_id, line_id, option_item_id)
);
```

***

## 11) Row‑Level Security (PostgreSQL)

If you choose **shared schema**, enable RLS to protect tenant boundaries:

```sql
-- Example for one table (repeat per table):
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;

-- Assume a function that returns current tenant UUID from session
-- SELECT set_config('app.tenant_id', '...', true) at connection/session start.

CREATE POLICY tenant_isolation ON menu
    USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Similarly for SELECT, INSERT, UPDATE, DELETE; or use a single USING + WITH CHECK.
```

> In app code, set `app.tenant_id` via a safe middleware on each request (e.g., from verified domain/subdomain mapping).

***

## 12) Indexing strategy (performance)

*   **Every FK** should have a matching index (Postgres adds on PK automatically, not FKs).
*   Add composite indexes beginning with `tenant_id` for frequent lookups and uniqueness.

Examples:

```sql
-- Fast lookups by tenant + brand + code
CREATE UNIQUE INDEX ux_menu_brand_code
ON menu (tenant_id, brand_id, code);

-- Sections by version
CREATE INDEX ix_section_version
ON section (tenant_id, version_id, display_order);

-- Items by section
CREATE INDEX ix_item_section_order
ON item (tenant_id, section_id, display_order);

-- Prices (override matching)
CREATE INDEX ix_item_price_override_match
ON item_price_override (
    tenant_id, item_id, location_id, service_type, start_time_local, end_time_local, start_date_local, end_date_local
);
```

***

## 13) Example content flow (JSON payloads)

**Create a Lunch menu (French + English):**

```json
{
  "menu": {
    "brandId": "BRAND-UUID",
    "code": "LUNCH",
    "currency": "EUR",
    "priceTaxPolicy": "tax_included",
    "locales": ["fr-FR", "en-GB"]
  },
  "menuI18n": [
    {"locale": "fr-FR", "name": "Déjeuner", "description": "Disponible en semaine"},
    {"locale": "en-GB", "name": "Lunch", "description": "Weekdays only"}
  ],
  "availability": [
    {"serviceType":"any","dowMask":62,"startTime":"11:30","endTime":"15:00"} 
    /* 62 = Mon-Fri (1+2+4+8+16) */
  ],
  "version": {"label": "Winter 2026"},
  "sections": [
    {"title": {"fr-FR": "Entrées", "en-GB": "Starters"}},
    {"title": {"fr-FR": "Plats", "en-GB": "Mains"}}
  ]
}
```

**Add an item with options and allergens:**

```json
{
  "item": {
    "sectionCode": "MAINS",
    "sku": "BGR-CLSC",
    "spiciness": 1,
    "calories": 780
  },
  "itemI18n": {
    "fr-FR": {"name": "Burger Classique", "description": "Bœuf, fromage, salade"},
    "en-GB": {"name": "Classic Burger", "description": "Beef, cheese, lettuce"}
  },
  "price": {"currency": "EUR", "amountMinor": 1290},
  "dietary": ["vegetarian"],  /* example only if true */
  "allergens": ["gluten", "milk"],
  "optionGroups": [
    {
      "name": {"fr-FR": "Accompagnement", "en-GB": "Side"},
      "selectionMode": "single",
      "min": 1, "max": 1, "required": true,
      "options": [
        {"name": {"fr-FR":"Frites","en-GB":"Fries"}, "deltaMinor": 0, "default": true},
        {"name": {"fr-FR":"Salade","en-GB":"Salad"}, "deltaMinor": 0}
      ]
    },
    {
      "name": {"fr-FR":"Taille","en-GB":"Size"},
      "selectionMode": "single",
      "min": 1, "max": 1, "required": true,
      "options": [
        {"name": {"fr-FR":"Standard","en-GB":"Regular"}, "deltaMinor": 0, "default": true},
        {"name": {"fr-FR":"Grande","en-GB":"Large"},   "deltaMinor": 200}
      ]
    }
  ]
}
```

***

## 14) Operational considerations

*   **Migrations:** Use a schema migration tool (e.g., Flyway/Liquibase/EF Migrations). Seed **allergens** (the EU standard set) and common **dietary flags** at boot.
*   **Caching:** Cache **published menus** per `location_id + menu_id + version_id` for fast QR loads.
*   **Feature flags:** Gate ordering or delivery features per tenant/location.
*   **Backups:** Per‑tenant logical exports are easier if you model with `tenant_id` and ensure all tables have it.
*   **PII:** If/when you enable ordering with delivery, store addresses & phone numbers with care (GDPR).

***

## 15) Minimal ER sketch (textual)

    Tenant --< Brand --< Location --< DiningTable
       |
       └-- Menu --< MenuVersion --< Section --< Item --< ItemPriceBase
                                       |            └-- ItemPriceOverride (opt)
                                       └-- ItemOptionGroup --< OptionGroup --< OptionItem --< OptionItemPrice
    Item --< ItemAllergen >-- Allergen
    Item --< ItemDietaryFlag >-- DietaryFlag
    OptionItem --< OptionItemAllergen >-- Allergen
    MenuVersion --< Section/Item/OptionGroup are version-scoped
    MenuPublication maps (Location, Menu, Version) to what is live

***

## 16) Why this structure works well for SaaS

*   **Tenant safety:** `tenant_id` on all business tables + optional **RLS** gives strong logical isolation in a shared schema. You can migrate heavy tenants to **DB‑per‑tenant** later without changing the logical model.
*   **Version + publication:** lets you stage drafts, schedule rollouts per **location**, and keep historical versions.
*   **Flexible pricing & availability:** base prices plus **override windows** cover lunch specials, happy hours, location‑specific pricing, and service‑type differences.
*   **i18n everywhere:** consistent `*_i18n` tables keep localized fields out of core tables for performance and clarity.
*   **Allergen/dietary accuracy:** master vocabularies with link tables support both item‑level and modifier‑level disclosures.

***

## Next steps (I can tailor this fast)

Tell me:

1.  **Primary database** (PostgreSQL vs SQL Server/Azure SQL).
2.  **Isolation model** (shared schema w/ RLS vs DB‑per‑tenant).
3.  **Scope** (menu only, or include ordering/payment now).

I’ll convert this into **ready‑to‑run DDL** for your chosen DB, add **sample seed scripts** (allergens, dietary flags), and provide **DAO/EF models** plus a couple of **reference queries** (e.g., “get published menu for location”) to accelerate your implementation.
