import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

// Helper to convert BigInt to Number for JSON serialization
function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  );
}

/**
 * PATCH /api/admin/items/reorder
 * Reorder items within a section in a menu
 * Body: { menuId: string, sectionId: string, itemIds: string[] }
 */
export async function PATCH(req: Request) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { menuId, sectionId, itemIds } = await req.json();

    if (!menuId || !sectionId || !Array.isArray(itemIds)) {
      return NextResponse.json(
        { error: 'menuId, sectionId and itemIds array are required' },
        { status: 400 }
      );
    }

    // Verify menu belongs to tenant and is a draft
    const menu = await prisma.menu.findFirst({
      where: { id: menuId, tenantId: session.tenantId },
    });

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    if (menu.status !== 'draft') {
      return NextResponse.json(
        { error: 'Cannot reorder items in a published menu. Create a new draft first.' },
        { status: 400 }
      );
    }

    // Update display order in the join table
    await prisma.$transaction(
      itemIds.map((itemId, index) =>
        prisma.menuItem.updateMany({
          where: {
            menuId,
            sectionId,
            itemId,
            tenantId: session.tenantId,
          },
          data: { displayOrder: index },
        })
      )
    );

    // Fetch updated items via join table
    const menuItems = await prisma.menuItem.findMany({
      where: { menuId, sectionId, tenantId: session.tenantId },
      include: {
        item: {
          include: {
            translations: true,
            priceBase: true,
            allergens: { include: { allergen: true } },
            dietaryFlags: { include: { dietaryFlag: true } },
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Transform to expected structure
    const items = menuItems.map(mi => ({
      ...mi.item,
      displayOrder: mi.displayOrder,
    }));

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'REORDER',
        entityType: 'item',
        entityId: sectionId,
        newValues: { itemIds },
      },
    });

    return NextResponse.json({ items: serializeBigInt(items) });
  } catch (error) {
    console.error('Reorder items error:', error);
    return NextResponse.json({ error: 'Failed to reorder items' }, { status: 500 });
  }
}
