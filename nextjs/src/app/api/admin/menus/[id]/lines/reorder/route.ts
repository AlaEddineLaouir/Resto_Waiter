import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

interface ReorderItem {
  id: string;
  displayOrder: number;
  parentLineId?: string | null;
}

// PATCH - Reorder lines within a menu
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: menuId } = await params;
    const { lines } = await req.json() as { lines: ReorderItem[] };

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'Lines array is required' }, { status: 400 });
    }

    // Verify menu belongs to tenant
    const menu = await prisma.menu.findFirst({
      where: { id: menuId, tenantId: session.tenantId },
    });

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    // Verify all lines belong to this menu and tenant
    const lineIds = lines.map(l => l.id);
    const existingLines = await prisma.menuLine.findMany({
      where: {
        id: { in: lineIds },
        menuId,
        tenantId: session.tenantId,
      },
      select: { id: true },
    });

    if (existingLines.length !== lineIds.length) {
      return NextResponse.json({ error: 'Some lines not found or do not belong to this menu' }, { status: 400 });
    }

    // Update all lines in a transaction
    await prisma.$transaction(
      lines.map(line =>
        prisma.menuLine.update({
          where: { id: line.id },
          data: {
            displayOrder: line.displayOrder,
            ...(line.parentLineId !== undefined && { parentLineId: line.parentLineId }),
          },
        })
      )
    );

    // Log the action
    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'REORDER',
        entityType: 'menu_lines',
        entityId: menuId,
        newValues: { lines: lines.map(l => ({ id: l.id, displayOrder: l.displayOrder })) },
      },
    });

    // Fetch updated lines
    const updatedLines = await prisma.menuLine.findMany({
      where: {
        tenantId: session.tenantId,
        menuId,
      },
      include: {
        section: { include: { translations: true } },
        item: {
          include: {
            translations: true,
            priceBase: true,
          },
        },
        childLines: {
          include: {
            section: { include: { translations: true } },
            item: {
              include: {
                translations: true,
                priceBase: true,
              },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Filter to top-level lines
    const topLevelLines = updatedLines.filter(line => !line.parentLineId);

    // Helper to convert BigInt to Number for JSON serialization
    const serialized = JSON.parse(
      JSON.stringify(topLevelLines, (_, value) =>
        typeof value === 'bigint' ? Number(value) : value
      )
    );

    return NextResponse.json({ lines: serialized });
  } catch (error) {
    console.error('Reorder menu lines error:', error);
    return NextResponse.json({ error: 'Failed to reorder menu lines' }, { status: 500 });
  }
}
