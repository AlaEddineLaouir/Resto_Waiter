import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/admin/floor-layouts/[id]/merge - Merge tables into a group
export async function POST(req: Request, { params }: Params) {
  try {
    const guard = await requirePermission('floor-tables.merge');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;
    const { id: layoutId } = await params;

    const existing = await prisma.floorLayout.findFirst({
      where: { id: layoutId, tenantId: session.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
    }

    const { tableIds, groupLabel } = await req.json();

    if (!tableIds || tableIds.length < 2) {
      return NextResponse.json({ error: 'At least 2 tables are required to merge' }, { status: 400 });
    }

    // Verify all tables belong to this layout
    const tables = await prisma.floorTable.findMany({
      where: { id: { in: tableIds }, layoutId, tenantId: session.tenantId },
    });
    if (tables.length !== tableIds.length) {
      return NextResponse.json({ error: 'Some tables were not found in this layout' }, { status: 400 });
    }

    // Calculate combined capacity
    const combinedCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);

    // Generate group label if not provided
    const existingGroups = await prisma.mergedTableGroup.count({
      where: { tenantId: session.tenantId, layoutId },
    });
    const label = groupLabel || `G${existingGroups + 1}`;

    const group = await prisma.mergedTableGroup.create({
      data: {
        tenantId: session.tenantId,
        layoutId,
        groupLabel: label,
        capacity: combinedCapacity,
        members: {
          create: tableIds.map((tableId: string) => ({ tableId })),
        },
      },
      include: {
        members: {
          include: {
            table: { select: { id: true, label: true, capacity: true } },
          },
        },
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error('Merge tables error:', error);
    return NextResponse.json({ error: 'Failed to merge tables' }, { status: 500 });
  }
}

// DELETE /api/admin/floor-layouts/[id]/merge - Split (dissolve) a merged group
export async function DELETE(req: Request, { params }: Params) {
  try {
    const guard = await requirePermission('floor-tables.merge');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;
    const { id: layoutId } = await params;

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
    }

    const group = await prisma.mergedTableGroup.findFirst({
      where: { id: groupId, tenantId: session.tenantId, layoutId },
    });
    if (!group) {
      return NextResponse.json({ error: 'Merged group not found' }, { status: 404 });
    }

    await prisma.mergedTableGroup.delete({ where: { id: groupId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Split tables error:', error);
    return NextResponse.json({ error: 'Failed to split tables' }, { status: 500 });
  }
}
