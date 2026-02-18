import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/admin/floor-layouts/[id]/elements - Batch save all elements for a layout
// This is the primary save endpoint for the canvas editor — saves everything at once
export async function POST(req: Request, { params }: Params) {
  try {
    const guard = await requirePermission('floor-layouts.update');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;
    const { id: layoutId } = await params;

    const existing = await prisma.floorLayout.findFirst({
      where: { id: layoutId, tenantId: session.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
    }

    const body = await req.json();
    const { zones, tables, obstacles, chairs } = body;

    // Use a transaction to replace all elements atomically
    await prisma.$transaction(async (tx) => {
      // Delete existing elements
      await tx.floorChair.deleteMany({ where: { tenantId: session.tenantId, table: { layoutId } } });
      await tx.mergedTableMember.deleteMany({ where: { table: { layoutId, tenantId: session.tenantId } } });
      await tx.mergedTableGroup.deleteMany({ where: { tenantId: session.tenantId, layoutId } });
      await tx.floorTable.deleteMany({ where: { tenantId: session.tenantId, layoutId } });
      await tx.floorObstacle.deleteMany({ where: { tenantId: session.tenantId, layoutId } });
      await tx.floorZone.deleteMany({ where: { tenantId: session.tenantId, layoutId } });

      // Re-create zones
      if (zones?.length > 0) {
        await tx.floorZone.createMany({
          data: zones.map((z: Record<string, unknown>) => ({
            id: z.id as string,
            tenantId: session.tenantId,
            layoutId,
            name: z.name as string,
            color: (z.color as string) || '#E5E7EB',
            x: z.x as number || 0,
            y: z.y as number || 0,
            width: z.width as number || 200,
            height: z.height as number || 200,
            rotation: z.rotation as number || 0,
            shape: (z.shape as string) || 'rectangle',
            points: z.points || null,
            zIndex: z.zIndex as number || 0,
            isLocked: z.isLocked as boolean || false,
            metadata: z.metadata || {},
          })),
        });
      }

      // Re-create tables
      if (tables?.length > 0) {
        await tx.floorTable.createMany({
          data: tables.map((t: Record<string, unknown>) => ({
            id: t.id as string,
            tenantId: session.tenantId,
            layoutId,
            zoneId: (t.zoneId as string) || null,
            label: t.label as string,
            friendlyName: (t.friendlyName as string) || null,
            shape: (t.shape as string) || 'rectangle',
            x: t.x as number || 0,
            y: t.y as number || 0,
            width: t.width as number || 80,
            height: t.height as number || 80,
            rotation: t.rotation as number || 0,
            capacity: t.capacity as number || 4,
            minCapacity: t.minCapacity as number || 1,
            color: (t.color as string) || '#6366F1',
            category: (t.category as string) || 'dine_in',
            zIndex: t.zIndex as number || 10,
            isLocked: t.isLocked as boolean || false,
            isActive: t.isActive !== false,
            status: (t.status as string) || 'active',
            notes: (t.notes as string) || null,
            metadata: t.metadata || {},
          })),
        });
      }

      // Re-create obstacles
      if (obstacles?.length > 0) {
        await tx.floorObstacle.createMany({
          data: obstacles.map((o: Record<string, unknown>) => ({
            id: o.id as string,
            tenantId: session.tenantId,
            layoutId,
            kind: o.kind as string,
            label: (o.label as string) || null,
            x: o.x as number || 0,
            y: o.y as number || 0,
            width: o.width as number || 100,
            height: o.height as number || 20,
            rotation: o.rotation as number || 0,
            points: o.points || null,
            color: (o.color as string) || '#9CA3AF',
            zIndex: o.zIndex as number || 5,
            isLocked: o.isLocked as boolean || false,
            metadata: o.metadata || {},
          })),
        });
      }

      // Re-create chairs (linked to tables)
      if (chairs?.length > 0) {
        await tx.floorChair.createMany({
          data: chairs.map((c: Record<string, unknown>) => ({
            id: c.id as string,
            tenantId: session.tenantId,
            tableId: c.tableId as string,
            offsetX: c.offsetX as number || 0,
            offsetY: c.offsetY as number || 0,
            rotation: c.rotation as number || 0,
            chairType: (c.chairType as string) || 'normal',
          })),
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save floor layout elements error:', error);
    return NextResponse.json({ error: 'Failed to save floor layout elements' }, { status: 500 });
  }
}
