/**
 * Seed Floor Layout + Dining Tables for Dar El Baraka — Alger Centre
 *
 * Usage: npx dotenv -e .env.local -- tsx prisma/seed-floor-alger.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/restaurant_menu';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Chair helpers ─────────────────────────────────────────

function chairsRound(count: number, w: number) {
  const pad = 18, r = w / 2 + pad;
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    return { offsetX: Math.cos(a) * r, offsetY: Math.sin(a) * r, rotation: Math.round((a * 180) / Math.PI + 90) };
  });
}
function chairsRect(count: number, w: number, h: number) {
  const pad = 18, hw = w / 2 + pad, hh = h / 2 + pad;
  const sides = [{ len: w, axis: 'top' as const }, { len: h, axis: 'right' as const }, { len: w, axis: 'bottom' as const }, { len: h, axis: 'left' as const }];
  const perim = 2 * (w + h);
  const perSide = sides.map(s => Math.floor((s.len / perim) * count));
  let rem = count - perSide.reduce((a, b) => a + b, 0);
  const sorted = [0, 1, 2, 3].sort((a, b) => sides[b].len - sides[a].len);
  for (const idx of sorted) { if (rem <= 0) break; perSide[idx]++; rem--; }
  const positions: { offsetX: number; offsetY: number; rotation: number }[] = [];
  for (let si = 0; si < 4; si++) {
    const n = perSide[si];
    for (let ci = 0; ci < n; ci++) {
      const f = (ci + 0.5) / n;
      let ox = 0, oy = 0, rot = 0;
      switch (sides[si].axis) {
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
  return chairsRect(count, w, h);
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  console.log('🏗️  Seeding Floor Plan + Dining Tables for Dar El Baraka — Alger Centre\n');

  const tenant = await prisma.tenant.findUnique({ where: { slug: 'dar-el-baraka' } });
  if (!tenant) { console.error('❌ Tenant "dar-el-baraka" not found.'); process.exit(1); }

  const location = await prisma.location.findFirst({
    where: { tenantId: tenant.id, slug: 'alger-centre' },
  });
  if (!location) { console.error('❌ Location "alger-centre" not found.'); process.exit(1); }

  // Clear existing
  await prisma.floorLayout.deleteMany({ where: { tenantId: tenant.id, locationId: location.id } });
  await prisma.diningTable.deleteMany({ where: { tenantId: tenant.id, locationId: location.id } });
  console.log('  🗑️  Cleared existing floor/dining data\n');

  const tid = tenant.id;

  // ═══ Layout ═══
  const layout = await prisma.floorLayout.create({
    data: {
      tenantId: tid, locationId: location.id,
      name: 'Ground Floor', description: 'Main floor — Dar El Baraka Alger Centre',
      floor: 0, status: 'published', version: 1,
      canvasWidth: 1200, canvasHeight: 800,
      gridSize: 20, scale: 1.0, publishedAt: new Date(),
    },
  });
  console.log(`  ✓ Layout: ${layout.name} (${layout.canvasWidth}×${layout.canvasHeight})`);

  // ═══ Zones ═══
  const zoneData = [
    { name: 'Main Hall',  color: '#DBEAFE', x: 40,  y: 40,  width: 520, height: 440, zIndex: 0 },
    { name: 'Terrace',    color: '#D1FAE5', x: 40,  y: 520, width: 520, height: 240, zIndex: 0 },
    { name: 'VIP Room',   color: '#EDE9FE', x: 600, y: 40,  width: 300, height: 240, zIndex: 0 },
    { name: 'Family Area', color: '#FFEDD5', x: 600, y: 320, width: 300, height: 440, zIndex: 0 },
    { name: 'Bar Area',   color: '#FEF3C7', x: 940, y: 40,  width: 220, height: 720, zIndex: 0 },
  ];

  const zones: Record<string, { id: string }> = {};
  for (const z of zoneData) {
    const zone = await prisma.floorZone.create({
      data: { tenantId: tid, layoutId: layout.id, ...z, shape: 'rectangle', metadata: {} },
    });
    zones[z.name] = zone;
  }
  console.log(`  ✓ ${zoneData.length} zones created`);

  // ═══ Tables ═══
  interface TDef {
    label: string; friendlyName: string | null; shape: string;
    x: number; y: number; width: number; height: number;
    capacity: number; minCapacity: number; color: string;
    category: string; zone: string; rotation: number;
    status: string; chairType: string; notes: string | null;
  }

  const C = { dine_in: '#6366F1', outdoor: '#10B981', vip: '#8B5CF6', bar: '#F59E0B', family: '#F97316' };

  const tableDefs: TDef[] = [
    // Main Hall — 2-seaters
    { label: 'T1',  friendlyName: 'Bistro 1',    shape: 'round',     x: 80,  y: 80,  width: 60,  height: 60,  capacity: 2, minCapacity: 1, color: C.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0, status: 'active', chairType: 'normal', notes: null },
    { label: 'T2',  friendlyName: 'Bistro 2',    shape: 'round',     x: 180, y: 80,  width: 60,  height: 60,  capacity: 2, minCapacity: 1, color: C.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0, status: 'active', chairType: 'normal', notes: null },
    { label: 'T3',  friendlyName: 'Bistro 3',    shape: 'round',     x: 280, y: 80,  width: 60,  height: 60,  capacity: 2, minCapacity: 1, color: C.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0, status: 'active', chairType: 'normal', notes: null },
    // Main Hall — 4-seaters
    { label: 'T4',  friendlyName: null,           shape: 'square',    x: 80,  y: 200, width: 80,  height: 80,  capacity: 4, minCapacity: 2, color: C.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0, status: 'active', chairType: 'normal', notes: null },
    { label: 'T5',  friendlyName: null,           shape: 'square',    x: 220, y: 200, width: 80,  height: 80,  capacity: 4, minCapacity: 2, color: C.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0, status: 'active', chairType: 'normal', notes: null },
    { label: 'T6',  friendlyName: null,           shape: 'square',    x: 360, y: 200, width: 80,  height: 80,  capacity: 4, minCapacity: 2, color: C.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0, status: 'active', chairType: 'normal', notes: null },
    // Main Hall — 6-seaters
    { label: 'T7',  friendlyName: 'Family Table', shape: 'rectangle', x: 80,  y: 340, width: 140, height: 80,  capacity: 6, minCapacity: 3, color: C.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0, status: 'active', chairType: 'normal', notes: 'Near entrance' },
    { label: 'T8',  friendlyName: null,           shape: 'rectangle', x: 280, y: 340, width: 140, height: 80,  capacity: 6, minCapacity: 3, color: C.dine_in, category: 'dine_in', zone: 'Main Hall', rotation: 0, status: 'active', chairType: 'normal', notes: null },

    // Terrace — outdoor
    { label: 'T9',  friendlyName: 'Terrace 1',   shape: 'round',     x: 80,  y: 560, width: 70,  height: 70,  capacity: 2, minCapacity: 1, color: C.outdoor, category: 'outdoor', zone: 'Terrace', rotation: 0, status: 'active', chairType: 'normal', notes: 'Street view' },
    { label: 'T10', friendlyName: 'Terrace 2',   shape: 'round',     x: 190, y: 560, width: 70,  height: 70,  capacity: 4, minCapacity: 2, color: C.outdoor, category: 'outdoor', zone: 'Terrace', rotation: 0, status: 'active', chairType: 'normal', notes: null },
    { label: 'T11', friendlyName: 'Terrace Long', shape: 'rectangle', x: 310, y: 560, width: 180, height: 70, capacity: 6, minCapacity: 3, color: C.outdoor, category: 'outdoor', zone: 'Terrace', rotation: 0, status: 'active', chairType: 'normal', notes: null },
    { label: 'T12', friendlyName: null,           shape: 'round',     x: 130, y: 680, width: 70,  height: 70,  capacity: 4, minCapacity: 2, color: C.outdoor, category: 'outdoor', zone: 'Terrace', rotation: 0, status: 'active', chairType: 'normal', notes: null },

    // VIP Room
    { label: 'V1',  friendlyName: 'VIP Booth 1',  shape: 'rectangle', x: 630, y: 80,  width: 120, height: 70, capacity: 4, minCapacity: 2, color: C.vip, category: 'vip', zone: 'VIP Room', rotation: 0, status: 'active', chairType: 'booth', notes: 'Premium booth' },
    { label: 'V2',  friendlyName: 'VIP Booth 2',  shape: 'rectangle', x: 630, y: 190, width: 120, height: 70, capacity: 4, minCapacity: 2, color: C.vip, category: 'vip', zone: 'VIP Room', rotation: 0, status: 'active', chairType: 'booth', notes: 'Premium booth' },
    { label: 'V3',  friendlyName: 'VIP Round',    shape: 'round',     x: 800, y: 120, width: 80,  height: 80, capacity: 6, minCapacity: 3, color: C.vip, category: 'vip', zone: 'VIP Room', rotation: 0, status: 'active', chairType: 'booth', notes: null },

    // Family Area — large tables
    { label: 'F1',  friendlyName: 'Family 1',     shape: 'rectangle', x: 630, y: 360, width: 160, height: 90, capacity: 8,  minCapacity: 4, color: C.family, category: 'dine_in', zone: 'Family Area', rotation: 0, status: 'active', chairType: 'normal', notes: 'For big families' },
    { label: 'F2',  friendlyName: 'Family 2',     shape: 'rectangle', x: 630, y: 500, width: 160, height: 90, capacity: 8,  minCapacity: 4, color: C.family, category: 'dine_in', zone: 'Family Area', rotation: 0, status: 'active', chairType: 'normal', notes: null },
    { label: 'F3',  friendlyName: 'Family Round',  shape: 'round',    x: 700, y: 660, width: 100, height: 100, capacity: 10, minCapacity: 5, color: C.family, category: 'dine_in', zone: 'Family Area', rotation: 0, status: 'active', chairType: 'normal', notes: 'Events & celebrations' },

    // Bar Area — stools
    { label: 'B1',  friendlyName: 'Bar 1',   shape: 'round', x: 970, y: 80,  width: 50, height: 50, capacity: 1, minCapacity: 1, color: C.bar, category: 'bar', zone: 'Bar Area', rotation: 0, status: 'active', chairType: 'bar_stool', notes: null },
    { label: 'B2',  friendlyName: 'Bar 2',   shape: 'round', x: 1040, y: 80, width: 50, height: 50, capacity: 1, minCapacity: 1, color: C.bar, category: 'bar', zone: 'Bar Area', rotation: 0, status: 'active', chairType: 'bar_stool', notes: null },
    { label: 'B3',  friendlyName: 'Bar 3',   shape: 'round', x: 1110, y: 80, width: 50, height: 50, capacity: 1, minCapacity: 1, color: C.bar, category: 'bar', zone: 'Bar Area', rotation: 0, status: 'active', chairType: 'bar_stool', notes: null },
    { label: 'B4',  friendlyName: 'High-Top', shape: 'round', x: 990, y: 200, width: 70, height: 70, capacity: 4, minCapacity: 2, color: C.bar, category: 'bar', zone: 'Bar Area', rotation: 0, status: 'active', chairType: 'bar_stool', notes: 'High table' },
    { label: 'B5',  friendlyName: null,       shape: 'round', x: 1090, y: 200, width: 70, height: 70, capacity: 4, minCapacity: 2, color: C.bar, category: 'bar', zone: 'Bar Area', rotation: 0, status: 'active', chairType: 'bar_stool', notes: null },
  ];

  let chairTotal = 0;
  for (const t of tableDefs) {
    const zoneId = zones[t.zone]?.id;
    const chairs = generateChairs(t.capacity, t.shape, t.width, t.height);
    chairTotal += chairs.length;

    await prisma.floorTable.create({
      data: {
        tenantId: tid, layoutId: layout.id, zoneId: zoneId || null,
        label: t.label, friendlyName: t.friendlyName,
        shape: t.shape, x: t.x, y: t.y, width: t.width, height: t.height,
        rotation: t.rotation, capacity: t.capacity, minCapacity: t.minCapacity,
        color: t.color, category: t.category, status: t.status,
        isActive: t.status !== 'disabled',
        notes: t.notes, metadata: {},
        chairs: {
          create: chairs.map((ch) => ({
            tenantId: tid,
            offsetX: ch.offsetX, offsetY: ch.offsetY, rotation: ch.rotation,
            chairType: t.chairType,
          })),
        },
      },
    });
  }
  console.log(`  ✓ ${tableDefs.length} tables created (${chairTotal} chairs)`);

  // ═══ Obstacles ═══
  const obstacles = [
    { kind: 'wall',    x: 40,  y: 480, width: 520, height: 8,   rotation: 0, label: 'Hall-Terrace Wall' },
    { kind: 'wall',    x: 560, y: 40,  width: 8,   height: 720, rotation: 0, label: 'Center Wall' },
    { kind: 'wall',    x: 900, y: 40,  width: 8,   height: 720, rotation: 0, label: 'Bar Wall' },
    { kind: 'door',    x: 250, y: 478, width: 60,  height: 12,  rotation: 0, label: 'Terrace Door' },
    { kind: 'door',    x: 556, y: 140, width: 12,  height: 60,  rotation: 0, label: 'VIP Door' },
    { kind: 'door',    x: 896, y: 360, width: 12,  height: 60,  rotation: 0, label: 'Bar Door' },
    { kind: 'door',    x: 250, y: 38,  width: 80,  height: 12,  rotation: 0, label: 'Main Entrance' },
    { kind: 'kitchen', x: 940, y: 500, width: 220, height: 260, rotation: 0, label: 'Kitchen' },
    { kind: 'bar',     x: 960, y: 40,  width: 180, height: 30,  rotation: 0, label: 'Bar Counter' },
    { kind: 'pillar',  x: 270, y: 270, width: 20,  height: 20,  rotation: 0, label: 'Pillar 1' },
    { kind: 'pillar',  x: 470, y: 270, width: 20,  height: 20,  rotation: 0, label: 'Pillar 2' },
    { kind: 'stairs',  x: 480, y: 40,  width: 60,  height: 80,  rotation: 0, label: 'Stairs to Roof' },
  ];

  for (const o of obstacles) {
    await prisma.floorObstacle.create({
      data: {
        tenantId: tid, layout: { connect: { id: layout.id } },
        kind: o.kind, x: o.x, y: o.y, width: o.width, height: o.height,
        rotation: o.rotation, label: o.label, metadata: {},
      },
    });
  }
  console.log(`  ✓ ${obstacles.length} obstacles created`);

  // ═══ Dining Tables (for QR code ordering) ═══
  const diningLabels = tableDefs.filter(t => t.status === 'active').map(t => t.label);
  for (const label of diningLabels) {
    await prisma.diningTable.create({
      data: {
        tenantId: tid,
        locationId: location.id,
        label,
        qrCodeValue: `baraka-alger-${label.toLowerCase()}`,
        isActive: true,
      },
    });
  }
  console.log(`  ✓ ${diningLabels.length} dining tables (QR) created`);

  // Summary
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Floor Plan Summary — Alger Centre
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Layout:    Ground Floor (${layout.canvasWidth}×${layout.canvasHeight})
  Zones:     ${zoneData.length} (${zoneData.map(z => z.name).join(', ')})
  Tables:    ${tableDefs.length}
  Chairs:    ${chairTotal}
  Obstacles: ${obstacles.length}
  QR Tables: ${diningLabels.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  // Print all table ordering links
  console.log('🔗 Table Ordering Links (scan or click):');
  console.log('─────────────────────────────────────────');
  for (const t of tableDefs.filter(td => td.status === 'active')) {
    console.log(`  ${t.label.padEnd(4)} (${String(t.capacity).padStart(2)} seats) → http://localhost:3001/t/dar-el-baraka/l/alger-centre/table/${t.label}`);
  }
  console.log('');
  console.log('🌐 Floor Plan Editor: http://localhost:3001/t/dar-el-baraka/admin/floor-plans');
  console.log('✅ Done!');
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
