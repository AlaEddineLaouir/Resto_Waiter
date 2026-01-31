# PostgreSQL Database Integration & Admin Dashboard

## Objective
Integrate PostgreSQL database into the existing Node.js restaurant menu chatbot project and create a comprehensive admin dashboard for dynamic menu and ingredient management.

## Database Requirements

### PostgreSQL Setup
- Use `pg` (node-postgres) package for database connectivity
- Implement connection pooling for performance
- Support environment-based configuration (DATABASE_URL)
- Include database migrations for schema versioning

### Database Schema
Design tables for:
1. **categories** - Menu categories (id, name, description, display_order, tenant_id)
2. **dishes** - Menu items (id, name, description, price, category_id, vegetarian, available, image_url, tenant_id)
3. **ingredients** - Ingredient master list (id, name, allergen_info, tenant_id)
4. **dish_ingredients** - Many-to-many relationship (dish_id, ingredient_id, quantity, unit)
5. **tenants** - Multi-tenant support (id, name, slug, config, created_at)

### Data Access Layer
- Create repository pattern classes for each entity
- Implement CRUD operations with parameterized queries (SQL injection prevention)
- Add transaction support for related operations
- Include soft delete functionality

## Admin Dashboard Requirements

### Authentication & Authorization
- Protect admin routes with JWT authentication
- Add admin role verification middleware
- Implement session management

### Admin Pages
Create responsive admin UI at `/admin/` with:

1. **Dashboard** (`/admin/`)
   - Overview statistics (total dishes, categories, ingredients)
   - Recent activity log
   - Quick actions

2. **Menu Management** (`/admin/menu`)
   - List all categories with drag-and-drop reordering
   - Add/Edit/Delete categories
   - List dishes with filtering and search
   - Add/Edit/Delete dishes with image upload
   - Toggle dish availability
   - Assign ingredients to dishes

3. **Ingredients Management** (`/admin/ingredients`)
   - List all ingredients with search
   - Add/Edit/Delete ingredients
   - Allergen tagging
   - View dishes using each ingredient

4. **Settings** (`/admin/settings`)
   - Restaurant branding (name, logo, colors)
   - API key management
   - Export/Import menu data

### API Endpoints
Create RESTful admin API at `/api/admin/`:
- `GET/POST /api/admin/categories`
- `GET/PUT/DELETE /api/admin/categories/:id`
- `GET/POST /api/admin/dishes`
- `GET/PUT/DELETE /api/admin/dishes/:id`
- `POST /api/admin/dishes/:id/ingredients`
- `GET/POST /api/admin/ingredients`
- `GET/PUT/DELETE /api/admin/ingredients/:id`
- `GET/PUT /api/admin/settings`

## Technical Stack
- **Database**: PostgreSQL 14+
- **ORM/Query**: Raw `pg` with parameterized queries (no ORM)
- **Migrations**: Custom migration runner or `node-pg-migrate`
- **Frontend**: Vanilla JS with existing styles, or add Alpine.js for reactivity
- **File Upload**: `multer` for dish images


## Security Considerations
- Parameterized queries only (no string concatenation)
- Input validation and sanitization
- CSRF protection for admin forms
- Rate limiting on admin endpoints
- Audit logging for all admin actions

## Migration from JSON
- Create seed script to migrate existing `data/menu.json` to PostgreSQL
- Maintain backward compatibility during transition
