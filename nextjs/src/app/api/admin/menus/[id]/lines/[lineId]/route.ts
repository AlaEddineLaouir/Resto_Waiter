import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

// Helper to convert BigInt to Number for JSON serialization
function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  );
}

// GET a specific line
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  try {
    const guard = await requirePermission('menus.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id: menuId, lineId } = await params;

    const line = await prisma.menuLine.findFirst({
      where: {
        id: lineId,
        menuId,
        tenantId: session.tenantId,
      },
      include: {
        section: { include: { translations: true } },
        item: {
          include: {
            translations: true,
            priceBase: true,
            allergens: {
              include: {
                allergen: { include: { translations: true } },
              },
            },
            dietaryFlags: {
              include: {
                dietaryFlag: { include: { translations: true } },
              },
            },
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
    });

    if (!line) {
      return NextResponse.json({ error: 'Line not found' }, { status: 404 });
    }

    return NextResponse.json({ line: serializeBigInt(line) });
  } catch (error) {
    console.error('Get menu line error:', error);
    return NextResponse.json({ error: 'Failed to get menu line' }, { status: 500 });
  }
}

// PUT - Update a line
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  try {
    const guard = await requirePermission('menus.update');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id: menuId, lineId } = await params;
    const { parentLineId, displayOrder, isEnabled } = await req.json();

    // Verify line exists and belongs to tenant
    const existing = await prisma.menuLine.findFirst({
      where: {
        id: lineId,
        menuId,
        tenantId: session.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Line not found' }, { status: 404 });
    }

    // Verify parent line if provided and changing
    if (parentLineId !== undefined && parentLineId !== existing.parentLineId) {
      if (parentLineId) {
        const parentLine = await prisma.menuLine.findFirst({
          where: {
            id: parentLineId,
            tenantId: session.tenantId,
            menuId,
            lineType: 'section',
          },
        });
        if (!parentLine) {
          return NextResponse.json({ error: 'Parent line not found or is not a section' }, { status: 400 });
        }
        // Prevent circular references
        if (parentLineId === lineId) {
          return NextResponse.json({ error: 'Line cannot be its own parent' }, { status: 400 });
        }
      }
    }

    const line = await prisma.menuLine.update({
      where: { id: lineId },
      data: {
        ...(parentLineId !== undefined && { parentLineId }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(isEnabled !== undefined && { isEnabled }),
      },
      include: {
        section: { include: { translations: true } },
        item: {
          include: {
            translations: true,
            priceBase: true,
          },
        },
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'UPDATE',
        entityType: 'menu_line',
        entityId: line.id,
        oldValues: { parentLineId: existing.parentLineId, displayOrder: existing.displayOrder, isEnabled: existing.isEnabled },
        newValues: { parentLineId, displayOrder, isEnabled },
      },
    });

    return NextResponse.json({ line: serializeBigInt(line) });
  } catch (error) {
    console.error('Update menu line error:', error);
    return NextResponse.json({ error: 'Failed to update menu line' }, { status: 500 });
  }
}

// DELETE - Remove a line from the menu
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  try {
    const guard = await requirePermission('menus.update');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id: menuId, lineId } = await params;

    // Verify line exists and belongs to tenant
    const existing = await prisma.menuLine.findFirst({
      where: {
        id: lineId,
        menuId,
        tenantId: session.tenantId,
      },
      include: {
        childLines: { select: { id: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Line not found' }, { status: 404 });
    }

    // If this is a section with children, move children to parent level or reject
    if (existing.lineType === 'section' && existing.childLines.length > 0) {
      // Move children to the parent of this line (or top level if no parent)
      await prisma.menuLine.updateMany({
        where: {
          id: { in: existing.childLines.map(c => c.id) },
        },
        data: {
          parentLineId: existing.parentLineId,
        },
      });
    }

    // Delete the line
    await prisma.menuLine.delete({
      where: { id: lineId },
    });

    // Re-order remaining lines at same level
    const siblingLines = await prisma.menuLine.findMany({
      where: {
        tenantId: session.tenantId,
        menuId,
        parentLineId: existing.parentLineId,
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Reorder to fill gaps
    for (let i = 0; i < siblingLines.length; i++) {
      if (siblingLines[i].displayOrder !== i) {
        await prisma.menuLine.update({
          where: { id: siblingLines[i].id },
          data: { displayOrder: i },
        });
      }
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'DELETE',
        entityType: 'menu_line',
        entityId: lineId,
        oldValues: { lineType: existing.lineType, sectionId: existing.sectionId, itemId: existing.itemId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete menu line error:', error);
    return NextResponse.json({ error: 'Failed to delete menu line' }, { status: 500 });
  }
}
