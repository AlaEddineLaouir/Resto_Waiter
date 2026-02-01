# Menu Management Feature — Business Rules & Technical Specifications

> This document defines the business logic, data relationships, and UX requirements for the restaurant menu admin system.

---

## 1. Data Model Overview

### Entity Hierarchy
```
Tenant (Restaurant)
  └── Brand
       └── Location (physical branch)
            └── MenuPublication (one active menu per location)
                 └── MenuVersion (draft/published snapshots)
                      ├── Section (category groups)
                      │    └── Item (dishes, with i18n, pricing, allergens)
                      └── OptionGroup (customizations)
```

### Key Models (from Prisma schema)
| Model            | Purpose                                         |
|------------------|-------------------------------------------------|
| `Tenant`         | Root entity for multi-tenancy (restaurant)      |
| `Brand`          | Organizational unit within tenant               |
| `Location`       | Physical branch, ghost kitchen, or pop-up       |
| `Menu`           | Container (Lunch, Dinner, Drinks) with i18n     |
| `MenuVersion`    | Immutable snapshot with `draft` or `published` status |
| `MenuPublication`| Links a `MenuVersion` to a `Location` (one active per location) |
| `Section`        | Category group within a version                 |
| `Item`           | Menu item with translations, pricing, allergens |

---

## 2. Business Rules

### 2.1 Menu Activation (Location-Level)

| Rule ID | Rule Description |
|---------|------------------|
| MA-001  | Each `Location` can have **exactly one active menu** at any time |
| MA-002  | Setting a menu to **active** at a location automatically deactivates any other menu at that location |
| MA-003  | Setting a menu to **inactive** does NOT affect other menus (no auto-activation) |
| MA-004  | Menu activation is managed via `MenuPublication.isCurrent` flag |
| MA-005  | A menu can be active at **multiple locations simultaneously** |

### 2.2 Menu Versioning

| Rule ID | Rule Description |
|---------|------------------|
| MV-001  | **Every modification** to menu content creates a new `MenuVersion` |
| MV-002  | Versions have status: `draft` (editable) or `published` (immutable) |
| MV-003  | Only one `draft` version can exist per menu at a time |
| MV-004  | Publishing a draft: changes status to `published`, sets `publishedAt` timestamp |
| MV-005  | Previous versions can be **restored** by cloning into a new draft |
| MV-006  | Version history displays: label, status, createdBy, createdAt, publishedAt |
| MV-007  | Changes between versions should be summarized (sections added/removed, items modified) |

### 2.3 Section Management

| Rule ID | Rule Description |
|---------|------------------|
| SE-001  | Sections belong to a `MenuVersion` (not directly to Menu) |
| SE-002  | Sections have `displayOrder` for sequencing |
| SE-003  | Sections support i18n translations via `SectionI18n` |
| SE-004  | Sections can be **collapsed/expanded** in the UI |
| SE-005  | Sections can be **reordered via drag-and-drop** |
| SE-006  | Deleting a section cascades to delete all contained items |

### 2.4 Item Management

| Rule ID | Rule Description |
|---------|------------------|
| IT-001  | Items belong to a `Section` within a `MenuVersion` |
| IT-002  | Items have `displayOrder` for sequencing within section |
| IT-003  | Items support i18n translations via `ItemI18n` (name, description) |
| IT-004  | Items can have: optional icon (via `imageAssetId`), pricing, allergens, dietary flags |
| IT-005  | Items can be **reordered via drag-and-drop** within section |
| IT-006  | Items can be **moved between sections** via drag-and-drop |
| IT-007  | Item pricing uses `ItemPriceBase` (minor units) with optional `ItemPriceOverride` per location/time |

---

## 3. Admin UI Requirements

### 3.1 Navigation Structure

```
/t/[tenantId]/admin/
  ├── /brands          → List of brands
  ├── /locations       → Hierarchical tree view (Brand → Locations)
  │     └── [locationId]  → Location detail with active menu selector
  ├── /menus           → All menus with activation status badges
  │     └── [menuId]      → Menu editor (sections + items)
  ├── /versions        → Version history timeline
  └── /ingredients     → Ingredient library
```

### 3.2 Location-Menu Tree View

**Component:** `LocationMenuTree`

```
├── Brand: La Bella Italia
│   ├── 📍 Downtown (Amsterdam)
│   │   ├── 📋 Lunch Menu [ACTIVE ✓]
│   │   ├── 📋 Dinner Menu
│   │   └── 📋 Drinks Menu
│   └── 📍 Airport
│       └── 📋 Express Menu [ACTIVE ✓]
```

**Features:**
- Expandable/collapsible brand and location nodes
- Visual badge for active menu per location
- Quick-action dropdown: Set Active, Edit, Duplicate, Delete
- Click location to filter menus

### 3.3 Menu Editor Page

**Route:** `/t/[tenantId]/admin/menus/[menuId]`

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ Header: Menu Name | [Save Draft] [Publish] [Version ▼]  │
├──────────────────────────────────────────────────────────┤
│ Sidebar: Version History Timeline                        │
├──────────────────────────────────────────────────────────┤
│ Main Content:                                            │
│ ┌── Section: Appetizers ─────────── [⋮] ──────┐         │
│ │ ├─ Bruschetta           €8.50    [Edit][✕]  │ ▲       │
│ │ ├─ Caprese Salad        €12.00   [Edit][✕]  │ ≡ drag  │
│ │ └─ [+ Add Item]                              │ ▼       │
│ └─────────────────────────────────────────────┘         │
│ ┌── Section: Pasta (collapsed) ──── [⋮] ──────┐         │
│ └─────────────────────────────────────────────┘         │
│ [+ Add Section]                                          │
└──────────────────────────────────────────────────────────┘
```

**Interactions:**
- Drag-and-drop reordering for sections and items
- Inline expand/collapse sections
- Context menu (⋮): Edit, Duplicate, Delete, Move to Section
- Real-time autosave to draft version

### 3.4 Version History Sidebar

**Component:** `VersionHistorySidebar`

| Version | Status | Created | Published |
|---------|--------|---------|-----------|
| v3 (Current Draft) | 🟡 Draft | Feb 1, 2026 | — |
| v2 | 🟢 Published | Jan 28, 2026 | Jan 29, 2026 |
| v1 | 🟢 Published | Jan 15, 2026 | Jan 16, 2026 |

**Actions per version:**
- View (read-only preview)
- Restore (clone as new draft)
- Compare (diff with current)

---

## 4. API Endpoints

### Menu Publication
```http
POST /api/admin/publications
{ locationId, menuId, versionId }
# Creates publication, auto-deactivates other menus at location

PATCH /api/admin/publications/[id]
{ isCurrent: true }
# Activates this publication, deactivates others at same location
```

### Menu Versioning
```http
POST /api/admin/menus/[menuId]/versions
{ label?: string }
# Creates new draft version (clones current published if exists)

PATCH /api/admin/versions/[versionId]
{ status: "published" }
# Publishes draft, sets publishedAt

POST /api/admin/versions/[versionId]/restore
# Clones version content into new draft
```

### Section & Item Reordering
```http
PATCH /api/admin/sections/reorder
{ versionId, sectionIds: ["uuid1", "uuid2", ...] }
# Updates displayOrder based on array position

PATCH /api/admin/items/reorder
{ sectionId, itemIds: ["uuid1", "uuid2", ...] }
# Updates displayOrder within section

PATCH /api/admin/items/[itemId]/move
{ targetSectionId }
# Moves item to different section
```

---

## 5. UX Patterns

### 5.1 Drag-and-Drop
- Use `@dnd-kit/core` for accessible drag-and-drop
- Visual drag handle (≡) on hover
- Drop zone indicators during drag
- Optimistic UI updates with rollback on error

### 5.2 Collapsible Sections
- Persist collapse state in `localStorage`
- Animate expand/collapse with CSS transitions
- Show item count badge when collapsed: `Pasta (8 items)`

### 5.3 Active Menu Indicator
- Green badge: "ACTIVE" with checkmark
- Gray badge: "INACTIVE"
- Toggle switch in location detail view

### 5.4 Version Status Badges
- 🟡 Yellow: Draft (editable)
- 🟢 Green: Published (locked)
- 🔵 Blue: Scheduled (future `goesLiveAt`)

---

## 6. Validation Rules

| Field | Validation |
|-------|------------|
| Section title | Required, max 255 chars |
| Item name | Required, max 255 chars, i18n required for default locale |
| Item price | Required, non-negative integer (minor units) |
| displayOrder | Auto-generated, 0-indexed |
| Menu per location | Only one `MenuPublication.isCurrent = true` per locationId |

---

## 7. Edge Cases & Error Handling

| Scenario | Behavior |
|----------|----------|
| Attempt to edit published version | Redirect to draft or prompt to create new draft |
| Delete section with items | Confirmation modal with item count |
| Reorder during concurrent edit | Conflict resolution: last-write-wins with toast notification |
| Restore old version with deleted sections/items | Clone with warning: "Some linked data may be missing" |
| Activate menu at location with no published version | Reject with error: "Publish a version before activating" |

---

## 8. Implementation Checklist

### Phase 1: Core CRUD
- [ ] Location-Menu tree component with activation toggle
- [ ] Menu editor with sections and items listing
- [ ] Section CRUD with reorder API
- [ ] Item CRUD with reorder and move APIs

### Phase 2: Versioning
- [ ] Version history sidebar component
- [ ] Create draft from published version
- [ ] Publish draft flow with confirmation
- [ ] Restore previous version

### Phase 3: UX Polish
- [ ] Drag-and-drop reordering with @dnd-kit
- [ ] Collapsible sections with persistence
- [ ] Inline editing for item names/prices
- [ ] Bulk actions (delete selected, move to section)

### Phase 4: Advanced
- [ ] Version diff comparison view
- [ ] Scheduled publication (`goesLiveAt` > now)
- [ ] Audit log integration for menu changes
- [ ] Import/export menu as JSON/CSV
