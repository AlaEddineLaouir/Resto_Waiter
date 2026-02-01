import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/restaurant_menu' });

// Check menus for dar-el-baraka
const menus = await pool.query(`
  SELECT m.id, m.code, m.status, t.slug as tenant_slug 
  FROM menus m 
  JOIN tenants t ON m.tenant_id = t.id 
  WHERE t.slug = 'dar-el-baraka'
`);
console.log('\nMenus for dar-el-baraka:');
console.log(menus.rows);

const menuId = menus.rows[0]?.id;
if (menuId) {
  // Check menu_sections (join table)
  const sections = await pool.query(`
    SELECT ms.id, ms.menu_id, ms.section_id, ms.display_order,
           s.is_active as section_active
    FROM menu_sections ms 
    JOIN sections s ON ms.section_id = s.id
    WHERE ms.menu_id = $1
  `, [menuId]);
  console.log('\nMenuSections (join table) for main-menu:');
  console.log(sections.rows);
  
  // Check menu_items (join table)
  const items = await pool.query(`
    SELECT mi.id, mi.menu_id, mi.section_id, mi.item_id, mi.display_order,
           i.is_visible as item_visible
    FROM menu_items mi 
    JOIN items i ON mi.item_id = i.id
    WHERE mi.menu_id = $1
  `, [menuId]);
  console.log('\nMenuItems (join table) for main-menu:');
  console.log(items.rows);
  
  // Check menu_lines (hierarchical structure)
  const lines = await pool.query(`
    SELECT ml.id, ml.line_type, ml.section_id, ml.item_id, ml.parent_line_id, ml.display_order, ml.is_enabled
    FROM menu_lines ml
    WHERE ml.menu_id = $1
    ORDER BY ml.display_order
  `, [menuId]);
  console.log('\nMenuLines (hierarchical) for main-menu:');
  console.log(lines.rows);
}

await pool.end();
