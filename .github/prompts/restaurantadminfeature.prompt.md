# Restaurant Menu Admin Features

## Data Model

### Menu Structure
The menu system uses a **Header/Line** architecture:

#### Menu (Header)
- Contains metadata: name, code, description, status (draft/published/archived)
- Belongs to a Brand
- Can be assigned to one or many Locations
- Has translations for multi-language support

#### MenuLine
- Represents content within a menu
- **Type field**: `section` | `item`
- **Fields**:
  - `type`: Determines if line is a section header or menu item
  - `displayOrder`: Integer for drag-and-drop reordering
  - `isEnabled`: Boolean to show/hide without deleting (availability toggle)
  - `parentId`: Optional, for nested sections
  - Reference to either Section or Item based on type

---

## Menu Management

### Menu List Page
- Display all menus in a table/grid/list view
- Each menu row is **clickable** to open the menu card
- Quick status badges (Draft, Published, Archived)
- Filter by brand, status, location

### Menu Card/Detail View
- **Header bar** with action modes:
  - 👁️ **View Mode**: Read-only display
  - ✏️ **Edit Mode**: Inline editing enabled
  - 🗑️ **Delete**: Confirmation dialog before deletion
- Shows menu header info + all menu lines
- **Drag & Drop**: Reorder sections and items by dragging up/down
- Inline add/edit/delete for lines

### CRUD Operations
| Action | Description |
|--------|-------------|
| Create Menu | New menu with header info |
| Read Menu | View menu with all lines |
| Update Menu | Edit header, add/edit/remove lines |
| Delete Menu | Soft delete with confirmation |
| Add Section | Insert section line at position |
| Add Item | Insert item line under section |
| Reorder | Drag lines to new positions |
| Toggle Line | Enable/disable line availability |

---

## Location Assignment

### Menu → Location Relationship
- A menu can be assigned to **1 or many locations**
- Assignment methods:
  1. From **Menu Card**: Select locations to assign
  2. From **Location List/Card**: Assign menus to location

### Publishing
- Multiple menus can exist per brand
- Can publish **1 or several** menus simultaneously
- Only published menus are visible to customers
- Publishing activates menu at assigned locations

---

## Section Management

### CRUD Operations
| Action | Description |
|--------|-------------|
| Create | New section with title, description |
| Read | View section with items |
| Update | Edit section details |
| Delete | Remove section (with items handling) |
| Reorder | Change section position in menu |

---

## Item Management

### CRUD Operations
| Action | Description |
|--------|-------------|
| Create | New item with name, price, description |
| Read | View item details |
| Update | Edit item properties |
| Delete | Remove item from section |
| Reorder | Change item position within section |
| Toggle | Enable/disable item availability |

### Item Properties
- Name & Description (translatable)
- Price (with currency)
- Allergens & Dietary flags
- Spiciness level
- Calories
- Image (optional)
- Availability status