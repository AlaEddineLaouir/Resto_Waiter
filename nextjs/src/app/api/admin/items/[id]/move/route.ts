import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/items/[id]/move
 * Move an item to a different section within the same menu
 * Body: { menuId: string, targetSectionId: string }
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: itemId } = await params;
    const { menuId, targetSectionId } = await req.json();

    if (!menuId || !targetSectionId) {
      return NextResponse.json(
        { error: 'menuId and targetSectionId are required' },
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
        { error: 'Cannot move items in a published menu. Create a new draft first.' },
        { status: 400 }
      );
    }

    // Verify item is in this menu
    const menuItem = await prisma.menuItem.findFirst({
      where: { menuId, itemId, tenantId: session.tenantId },
      include: { item: { include: { translations: true, priceBase: true } } },
    });

    if (!menuItem) {
      return NextResponse.json({ error: 'Item not found in this menu' }, { status: 404 });
    }

    // Verify target section is in this menu
    const targetSectionLink = await prisma.menuSection.findFirst({
      where: { menuId, sectionId: targetSectionId, tenantId: session.tenantId },
      include: { section: { include: { translations: true } } },
    });

    if (!targetSectionLink) {
      return NextResponse.json(
        { error: 'Target section not found in this menu' },
        { status: 400 }
      );
    }

    // Get max display order in target section
    const maxOrder = await prisma.menuItem.findFirst({
      where: { menuId, sectionId: targetSectionId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    // Update the item's section in the join table
    await prisma.menuItem.updateMany({
      where: { menuId, itemId, tenantId: session.tenantId },
      data: {
        sectionId: targetSectionId,
        displayOrder: (maxOrder?.displayOrder || 0) + 1,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'MOVE',
        entityType: 'menuItem',
        entityId: `${menuId}:${itemId}`,
        oldValues: { sectionId: menuItem.sectionId },
        newValues: { sectionId: targetSectionId },
      },
    });

    // Convert BigInt for JSON serialization
    const serializedItem = {
      ...menuItem.item,
      sectionId: targetSectionId,
      displayOrder: (maxOrder?.displayOrder || 0) + 1,
      priceBase: menuItem.item.priceBase
        ? {
            ...menuItem.item.priceBase,
            amountMinor: Number(menuItem.item.priceBase.amountMinor),
          }
        : null,
    };

    return NextResponse.json({ item: serializedItem });
  } catch (error) {
    console.error('Move item error:', error);
    return NextResponse.json({ error: 'Failed to move item' }, { status: 500 });
  }
}
