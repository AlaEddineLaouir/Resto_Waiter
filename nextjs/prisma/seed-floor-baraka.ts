/**
 * Seed Floor Plans, Zones, Tables, Chairs & Obstacles for Dar El Baraka
 * Ground Floor layout for Paris Belleville location
 *
 * Usage: npm exec -- dotenv -e .env.local -- tsx prisma/seed-floor-baraka.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/restaurant_menu';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Chair position helpers (mirror the editor's generateChairPositions) ───

function chairsRound(count: number, w: number): { offsetX: number; offsetY: number; rotation: number }[] {
  const pad = 18;
  const r = w / 2 + pad;
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    return { offsetX: Math.cos(a) * r, offsetY: Math.sin(a) * r, rotation: Math.round((a * 180) / Math.PI + 90) };
  });
}

function chairsOval(count: number, w: number, h: number): { offsetX: number; offsetY: number; rotation: number }[] {
  const pad = 18;
  const rx = w / 2 + pad;
  const ry = h / 2 + pad;
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    return { offsetX: Math.cos(a) * rx, offsetY: Math.sin(a) * ry, rotation: Math.round((a * 180) / Math.PI + 90) };
  });
}

function chairsRect(count: number, w: number, h: number): { offsetX: number; offsetY: number; rotation: number }[] {
  const pad = 18;
  const hw = w / 2 + pad;
  const hh = h / 2 + pad;
  const sides = [
    { len: w, axis: 'top' as const },
    { len: h, axis: 'right' as const },
    { len: w, axis: 'bottom' as const },
    { len: h, axis: 'left' as const },
  ];
  const perim = 2 * (w + h);
  const perSide = sides.map((s) => Math.floor((s.len / perim) * count));
  let remainder = count - perSide.reduce((a, b) => a + b, 0);
  const sorted = [0, 1, 2, 3].sort((a, b) => sides[b].len - sides[a].len);
  for (const idx of sorted) { if (remainder <= 0) break; perSide[idx]++; remainder--; }

  const positions: { offsetX: number; offsetY: number; rotation: number }[] = [];
  for (let si = 0; si < 4; si++) {
    const n = perSide[si];
    const axis = sides[si].axis;
    for (let ci = 0; ci < n; ci++) {
      const f = (ci + 0.5) / n;
      let ox = 0, oy = 0, rot = 0;
      switch (axis) {
        case 'top': ox = -w / 2 + f * w; oy = -hh; rot = 0; break;
        case 'right': ox = hw; oy = -h / 2 + f * h; rot = 90; break;
        case 'bottom': ox = w / 2 - f * w; oy = hh; rot = 180; break;
        case 'left': ox = -hw; oy = h / 2 - f * h; rot = 270; break;
      }
      positions.push({ offsetX: ox, offsetY: oy, rotation: rot });
    }
  }
  return positions;
}

function generateChairs(count: number, shape: string, w: number, h: number) {
  if (count === 0) return [];
  if (shape === 'round') return chairsRound(count, w);
  if (shape === 'oval') return chairsOval(count, w, h);
  return chairsRect(count, w, h);
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('🏗️  Seeding Floor Plan for Dar El Baraka — Ground Floor\n');

  // 1. Find tenant + location
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'dar-el-baraka' } });
  if (!tenant) { console.error('❌ Tenant "dar-el-baraka" not found. Run seed-algerian.ts first.'); process.exit(1); }

  const location = await prisma.location.findFirst({
    where: { tenantId: tenant.id, slug: 'paris-belleville' },
  });
  if (!location) { console.error('❌ Location "paris-belleville" not found.'); process.exit(1); }

  // 2. Delete any existing floor data for this location
  await prisma.floorLayout.deleteMany({ where: { tenantId: tenant.id, locationId: location.id } });
  console.log('  🗑️  Cleared existing floor data\n');

  const tid = tenant.id;

  // ═══════════════════════════════════════════════════════════════
  // 3. Create Layout — Ground Floor
  // ═══════════════════════════════════════════════════════════════
  const layout = await prisma.floorLayout.create({
    data: {
      tenantId: tid,
      locationId: location.id,
      name: 'Ground Floor',
      description: 'Main ground floor layout — Dar El Baraka Paris Belleville',
      floor: 0,
      status: 'published',
      version: 1,
      canvasWidth: 1400,
      canvasHeight: 900,
      gridSize: 20,
      scale: 1.0,
      publishedAt: new Date(),
    },
  });
  console.log(`  ✓ Layout: ${layout.name} (${layout.canvasWidth}×${layout.canvasHeight})`);

  // ═══════════════════════════════════════════════════════════════
  // 4. Create Zones
  // ═══════════════════════════════════════════════════════════════
  const zoneData = [
    { name: 'Main Hall',       color: '#DBEAFE', x: 40,   y: 40,  width: 560,  height: 500, zIndex: 0 },
    { name: 'Terrace',         color: '#D1FAE5', x: 40,   y: 580, width: 560,  height: 280, zIndex: 0 },
    { name: 'VIP Room',        color: '#EDE9FE', x: 640,  y: 40,  width: 340,  height: 280, zIndex: 0 },
    { name: 'Bar Area',        color: '#FEF3C7', x: 640,  y: 360, width: 340,  height: 220, zIndex: 0 },
    { name: 'Private Dining',  color: '#FCE7F3', x: 1020, y: 40,  width: 340,  height: 280, zIndex: 0 },
    { name: 'Family Corner',   color: '#FFEDD5', x: 1020, y: 360, width: 340,  height: 500, zIndex: 0 },
  ];

  const zones: Record<string, { id: string }> = {};
  for (const z of zoneData) {
    const zone = await prisma.floorZone.create({
      data: { tenantId: tid, layoutId: layout.id, ...z, shape: 'rectangle', metadata: {} },
    });
    zones[z.name] = zone;
  }
  console.log(`  ✓ ${zoneData.length} zones created`);

  // ═══════════════════════════════════════════════════════════════
  // 5. Create Tables — all shape / category / size combinations
  // ═══════════════════════════════════════════════════════════════

  interface TableDef {
    label: string; friendlyName: string | null; shape: string;
    x: number; y: number; width: number; height: number;
    capacity: number; minCapacity: number; color: string;
    category: string; zone: string; rotation: number;
    status: string; chairType: string; notes: string | null;
  }

  const COLORS = {
    dine_in: '#6366F1', outdoor: '#10B981', vip: '#8B5CF6',
    bar: '#F59E0B', staff: '#6B7280',
  };

  const tableDefs: TableDef[] = [
    // ─── Main Hall (dine_in) — mix of shapes ───────────────
    // 2-seater round bistro tables
    { label: 'T1',  friendlyName: 'Bistro 1',    shape: 'round',     x: 80,  y: 80,  width: 60,  height: 60,  capacity: 2,  minCapacity: 1, color: COLORS.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0,  status: 'active', chairType: 'normal', notes: null },
    { label: 'T2',  friendlyName: 'Bistro 2',    shape: 'round',     x: 180, y: 80,  width: 60,  height: 60,  capacity: 2,  minCapacity: 1, color: COLORS.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0,  status: 'active', chairType: 'normal', notes: null },
    { label: 'T3',  friendlyName: 'Bistro 3',    shape: 'round',     x: 280, y: 80,  width: 60,  height: 60,  capacity: 2,  minCapacity: 1, color: COLORS.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0,  status: 'active', chairType: 'normal', notes: null },
    // 4-seater square tables
    { label: 'T4',  friendlyName: null,           shape: 'square',    x: 80,  y: 200, width: 80,  height: 80,  capacity: 4,  minCapacity: 2, color: COLORS.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0,  status: 'active', chairType: 'normal', notes: null },
    { label: 'T5',  friendlyName: null,           shape: 'square',    x: 220, y: 200, width: 80,  height: 80,  capacity: 4,  minCapacity: 2, color: COLORS.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0,  status: 'active', chairType: 'normal', notes: null },
    { label: 'T6',  friendlyName: null,           shape: 'square',    x: 360, y: 200, width: 80,  height: 80,  capacity: 4,  minCapacity: 2, color: COLORS.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0,  status: 'active', chairType: 'normal', notes: null },
    // 6-seater rectangle tables
    { label: 'T7',  friendlyName: 'Family Table', shape: 'rectangle', x: 80,  y: 340, width: 140, height: 80,  capacity: 6,  minCapacity: 3, color: COLORS.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0,  status: 'active', chairType: 'normal', notes: 'Near entrance' },
    { label: 'T8',  friendlyName: null,           shape: 'rectangle', x: 280, y: 340, width: 140, height: 80,  capacity: 6,  minCapacity: 3, color: COLORS.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0,  status: 'active', chairType: 'normal', notes: null },
    // 8-seater large oval
    { label: 'T9',  friendlyName: 'Grand Oval',   shape: 'oval',      x: 80,  y: 460, width: 180, height: 100, capacity: 8,  minCapacity: 4, color: COLORS.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0,  status: 'active', chairType: 'normal', notes: 'Great for groups' },
    // Rotated rectangle
    { label: 'T10', friendlyName: 'Angled Table', shape: 'rectangle', x: 440, y: 100, width: 120, height: 60,  capacity: 4,  minCapacity: 2, color: COLORS.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 45, status: 'active', chairType: 'normal', notes: null },

    // ─── Terrace (outdoor) — mix ──────────────────────────
    { label: 'T11', friendlyName: 'Terrace 1',    shape: 'round',     x: 80,  y: 620, width: 70,  height: 70,  capacity: 2,  minCapacity: 1, color: COLORS.outdoor, category: 'outdoor', zone: 'Terrace', rotation: 0,  status: 'active',   chairType: 'normal', notes: 'Street view' },
    { label: 'T12', friendlyName: 'Terrace 2',    shape: 'round',     x: 190, y: 620, width: 70,  height: 70,  capacity: 2,  minCapacity: 1, color: COLORS.outdoor, category: 'outdoor', zone: 'Terrace', rotation: 0,  status: 'active',   chairType: 'normal', notes: null },
    { label: 'T13', friendlyName: 'Terrace 3',    shape: 'round',     x: 300, y: 620, width: 70,  height: 70,  capacity: 4,  minCapacity: 2, color: COLORS.outdoor, category: 'outdoor', zone: 'Terrace', rotation: 0,  status: 'active',   chairType: 'normal', notes: null },
    { label: 'T14', friendlyName: 'Terrace Long', shape: 'rectangle', x: 80,  y: 740, width: 180, height: 70,  capacity: 6,  minCapacity: 3, color: COLORS.outdoor, category: 'outdoor', zone: 'Terrace', rotation: 0,  status: 'active',   chairType: 'normal', notes: null },
    { label: 'T15', friendlyName: null,            shape: 'square',    x: 310, y: 740, width: 80,  height: 80,  capacity: 4,  minCapacity: 2, color: COLORS.outdoor, category: 'outdoor', zone: 'Terrace', rotation: 0,  status: 'seasonal', chairType: 'normal', notes: 'Summer only' },
    { label: 'T16', friendlyName: null,            shape: 'oval',      x: 440, y: 620, width: 140, height: 80,  capacity: 6,  minCapacity: 3, color: COLORS.outdoor, category: 'outdoor', zone: 'Terrace', rotation: 0,  status: 'active',   chairType: 'normal', notes: null },

    // ─── VIP Room — booth + round ─────────────────────────
    { label: 'V1',  friendlyName: 'VIP Booth 1',  shape: 'rectangle', x: 670, y: 80,  width: 140, height: 70,  capacity: 4,  minCapacity: 2, color: COLORS.vip,     category: 'vip', zone: 'VIP Room', rotation: 0,  status: 'active', chairType: 'booth',  notes: 'Cushioned booth' },
    { label: 'V2',  friendlyName: 'VIP Booth 2',  shape: 'rectangle', x: 670, y: 190, width: 140, height: 70,  capacity: 4,  minCapacity: 2, color: COLORS.vip,     category: 'vip', zone: 'VIP Room', rotation: 0,  status: 'active', chairType: 'booth',  notes: 'Cushioned booth' },
    { label: 'V3',  friendlyName: 'VIP Round',    shape: 'round',     x: 860, y: 110, width: 100, height: 100, capacity: 6,  minCapacity: 3, color: COLORS.vip,     category: 'vip', zone: 'VIP Room', rotation: 0,  status: 'active', chairType: 'booth',  notes: 'Premium round table' },

    // ─── Bar Area — bar stools ────────────────────────────
    { label: 'B1',  friendlyName: 'Bar Seat 1',   shape: 'round',     x: 670, y: 400, width: 50,  height: 50,  capacity: 1,  minCapacity: 1, color: COLORS.bar,     category: 'bar', zone: 'Bar Area', rotation: 0,  status: 'active', chairType: 'bar_stool', notes: null },
    { label: 'B2',  friendlyName: 'Bar Seat 2',   shape: 'round',     x: 740, y: 400, width: 50,  height: 50,  capacity: 1,  minCapacity: 1, color: COLORS.bar,     category: 'bar', zone: 'Bar Area', rotation: 0,  status: 'active', chairType: 'bar_stool', notes: null },
    { label: 'B3',  friendlyName: 'Bar Seat 3',   shape: 'round',     x: 810, y: 400, width: 50,  height: 50,  capacity: 1,  minCapacity: 1, color: COLORS.bar,     category: 'bar', zone: 'Bar Area', rotation: 0,  status: 'active', chairType: 'bar_stool', notes: null },
    { label: 'B4',  friendlyName: 'Bar Seat 4',   shape: 'round',     x: 880, y: 400, width: 50,  height: 50,  capacity: 1,  minCapacity: 1, color: COLORS.bar,     category: 'bar', zone: 'Bar Area', rotation: 0,  status: 'active', chairType: 'bar_stool', notes: null },
    { label: 'B5',  friendlyName: 'Bar High-Top', shape: 'round',     x: 700, y: 490, width: 70,  height: 70,  capacity: 4,  minCapacity: 2, color: COLORS.bar,     category: 'bar', zone: 'Bar Area', rotation: 0,  status: 'active', chairType: 'bar_stool', notes: 'High table' },
    { label: 'B6',  friendlyName: 'Bar Square',   shape: 'square',    x: 830, y: 490, width: 70,  height: 70,  capacity: 4,  minCapacity: 2, color: COLORS.bar,     category: 'bar', zone: 'Bar Area', rotation: 0,  status: 'active', chairType: 'bar_stool', notes: null },

    // ─── Private Dining — large tables ────────────────────
    { label: 'P1',  friendlyName: 'Private Large', shape: 'rectangle', x: 1050, y: 80,  width: 200, height: 100, capacity: 10, minCapacity: 6,  color: COLORS.vip,     category: 'vip', zone: 'Private Dining', rotation: 0,  status: 'active', chairType: 'booth',  notes: 'Private events' },
    { label: 'P2',  friendlyName: 'Private Oval',  shape: 'oval',      x: 1060, y: 220, width: 180, height: 80,  capacity: 8,  minCapacity: 4,  color: COLORS.vip,     category: 'vip', zone: 'Private Dining', rotation: 0,  status: 'active', chairType: 'booth',  notes: 'Celebrations' },

    // ─── Family Corner — kids-friendly ────────────────────
    { label: 'F1',  friendlyName: 'Family Rect 1', shape: 'rectangle', x: 1050, y: 400, width: 140, height: 80,  capacity: 6,  minCapacity: 3, color: COLORS.dine_in, category: 'dine_in', zone: 'Family Corner', rotation: 0,  status: 'active', chairType: 'normal',    notes: 'Near play area' },
    { label: 'F2',  friendlyName: 'Family Rect 2', shape: 'rectangle', x: 1050, y: 520, width: 140, height: 80,  capacity: 6,  minCapacity: 3, color: COLORS.dine_in, category: 'dine_in', zone: 'Family Corner', rotation: 0,  status: 'active', chairType: 'normal',    notes: 'Highchair available' },
    { label: 'F3',  friendlyName: 'Kids Table',    shape: 'round',     x: 1240, y: 420, width: 80,  height: 80,  capacity: 4,  minCapacity: 2, color: '#EC4899',       category: 'dine_in', zone: 'Family Corner', rotation: 0,  status: 'active', chairType: 'normal',    notes: 'Booster seats' },
    { label: 'F4',  friendlyName: 'Family Large',  shape: 'oval',      x: 1050, y: 660, width: 200, height: 100, capacity: 10, minCapacity: 5, color: COLORS.dine_in, category: 'dine_in', zone: 'Family Corner', rotation: 0,  status: 'active', chairType: 'normal',    notes: 'Large family gatherings' },
    // Disabled table example
    { label: 'F5',  friendlyName: 'Under Repair',  shape: 'square',    x: 1240, y: 560, width: 80,  height: 80,  capacity: 4,  minCapacity: 2, color: '#9CA3AF',       category: 'dine_in', zone: 'Family Corner', rotation: 0,  status: 'disabled', chairType: 'normal', notes: 'Wobbly leg — needs fix' },
  ];

  let totalChairs = 0;
  for (const def of tableDefs) {
    const zoneId = zones[def.zone]?.id || null;
    const chairPositions = generateChairs(def.capacity, def.shape, def.width, def.height);

    await prisma.floorTable.create({
      data: {
        tenantId: tid,
        layoutId: layout.id,
        zoneId,
        label: def.label,
        friendlyName: def.friendlyName,
        shape: def.shape,
        x: def.x,
        y: def.y,
        width: def.width,
        height: def.height,
        rotation: def.rotation,
        capacity: def.capacity,
        minCapacity: def.minCapacity,
        color: def.color,
        category: def.category,
        zIndex: 10,
        isActive: def.status !== 'disabled',
        status: def.status,
        notes: def.notes,
        metadata: {},
        chairs: {
          create: chairPositions.map((p) => ({
            tenantId: tid,
            offsetX: p.offsetX,
            offsetY: p.offsetY,
            rotation: p.rotation,
            chairType: def.chairType,
          })),
        },
      },
    });
    totalChairs += chairPositions.length;
  }
  console.log(`  ✓ ${tableDefs.length} tables created (${totalChairs} chairs)`);

  // ═══════════════════════════════════════════════════════════════
  // 6. Create Obstacles
  // ═══════════════════════════════════════════════════════════════

  const obstacleDefs = [
    // Outer walls — Main Hall
    { kind: 'wall',    label: 'North Wall',     x: 40,   y: 40,  width: 560, height: 8,  rotation: 0,   color: '#6B7280' },
    { kind: 'wall',    label: 'West Wall',      x: 40,   y: 40,  width: 8,   height: 500, rotation: 0,   color: '#6B7280' },
    { kind: 'wall',    label: 'South Wall MH',  x: 40,   y: 532, width: 560, height: 8,  rotation: 0,   color: '#6B7280' },
    { kind: 'wall',    label: 'East Wall MH',   x: 592,  y: 40,  width: 8,   height: 500, rotation: 0,   color: '#6B7280' },

    // Door
    { kind: 'door',    label: 'Main Entrance',  x: 200,  y: 532, width: 80,  height: 12, rotation: 0,   color: '#8B5CF6' },
    { kind: 'door',    label: 'Terrace Door',   x: 200,  y: 576, width: 80,  height: 12, rotation: 0,   color: '#8B5CF6' },
    { kind: 'door',    label: 'VIP Door',       x: 640,  y: 160, width: 10,  height: 60, rotation: 0,   color: '#8B5CF6' },

    // Windows — Main Hall
    { kind: 'window',  label: 'Front Window 1', x: 80,   y: 40,  width: 80,  height: 6,  rotation: 0,   color: '#93C5FD' },
    { kind: 'window',  label: 'Front Window 2', x: 320,  y: 40,  width: 80,  height: 6,  rotation: 0,   color: '#93C5FD' },
    { kind: 'window',  label: 'Side Window',    x: 40,   y: 200, width: 6,   height: 80, rotation: 0,   color: '#93C5FD' },

    // Pillars
    { kind: 'pillar',  label: 'Pillar A',       x: 290,  y: 270, width: 20,  height: 20, rotation: 0,   color: '#D1D5DB' },
    { kind: 'pillar',  label: 'Pillar B',       x: 290,  y: 430, width: 20,  height: 20, rotation: 0,   color: '#D1D5DB' },
    { kind: 'pillar',  label: 'Pillar C',       x: 800,  y: 340, width: 20,  height: 20, rotation: 0,   color: '#D1D5DB' },

    // Bar counter (rotated)
    { kind: 'bar',     label: 'Bar Counter',    x: 660,  y: 380, width: 280, height: 16, rotation: 0,   color: '#92400E' },

    // Kitchen
    { kind: 'kitchen', label: 'Kitchen Area',   x: 640,  y: 620, width: 340, height: 240, rotation: 0,  color: '#FCA5A5' },

    // Pathway
    { kind: 'pathway', label: 'Main Aisle',     x: 420,  y: 80,  width: 20,  height: 440, rotation: 0,  color: '#E5E7EB' },

    // Stairs
    { kind: 'stairs',  label: 'Stairs Up',      x: 1320, y: 40,  width: 40,  height: 100, rotation: 0,  color: '#A78BFA' },

    // Terrace railing
    { kind: 'wall',    label: 'Terrace Rail',   x: 40,   y: 850, width: 560, height: 6,  rotation: 0,   color: '#059669' },

    // Angled divider (rotated wall between VIP and Private)
    { kind: 'wall',    label: 'Angled Divider', x: 990,  y: 40,  width: 8,   height: 280, rotation: 0,  color: '#6B7280' },
  ];

  for (const obs of obstacleDefs) {
    await prisma.floorObstacle.create({
      data: {
        tenantId: tid,
        layoutId: layout.id,
        kind: obs.kind,
        label: obs.label,
        x: obs.x,
        y: obs.y,
        width: obs.width,
        height: obs.height,
        rotation: obs.rotation,
        color: obs.color,
        zIndex: obs.kind === 'kitchen' ? 1 : 5,
        isLocked: obs.kind === 'wall' || obs.kind === 'kitchen',
        metadata: {},
      },
    });
  }
  console.log(`  ✓ ${obstacleDefs.length} obstacles created`);

  // ═══════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════
  const totalCap = tableDefs.reduce((s, t) => s + t.capacity, 0);
  const shapes = [...new Set(tableDefs.map(t => t.shape))];
  const categories = [...new Set(tableDefs.map(t => t.category))];
  const chairTypes = [...new Set(tableDefs.map(t => t.chairType))];
  const statuses = [...new Set(tableDefs.map(t => t.status))];
  const obstacleKinds = [...new Set(obstacleDefs.map(o => o.kind))];

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Floor Plan Summary — Ground Floor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Layout:       ${layout.name} (1400×900, grid=20)`);
  console.log(`  Zones:        ${zoneData.length} (${zoneData.map(z => z.name).join(', ')})`);
  console.log(`  Tables:       ${tableDefs.length}`);
  console.log(`  Chairs:       ${totalChairs}`);
  console.log(`  Total seats:  ${totalCap}`);
  console.log(`  Obstacles:    ${obstacleDefs.length}`);
  console.log(`  Shapes:       ${shapes.join(', ')}`);
  console.log(`  Categories:   ${categories.join(', ')}`);
  console.log(`  Chair types:  ${chairTypes.join(', ')}`);
  console.log(`  Statuses:     ${statuses.join(', ')}`);
  console.log(`  Obstacle kinds: ${obstacleKinds.join(', ')}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n🌐 Open: http://localhost:3001/t/dar-el-baraka/admin/floor-plans`);
  console.log('✅ Done!\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
