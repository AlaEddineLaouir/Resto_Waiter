import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

// PATCH - Toggle isEnabled on a line
// - Section: toggles all child item lines in this menu only
// - Item: toggles isVisible on Item itself (affects all menus)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: menuId, lineId } = await params;

    // Verify line exists and belongs to tenant
    const existing = await prisma.menuLine.findFirst({
      where: {
        id: lineId,
        menuId,
        tenantId: session.tenantId,
      },
      include: {
        item: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Line not found' }, { status: 404 });
    }

    const newEnabled = !existing.isEnabled;

    // If it's a SECTION line, toggle all child lines under it
    if (existing.lineType === 'section' && existing.sectionId) {
      // Toggle the section line itself
      await prisma.menuLine.update({
        where: { id: lineId },
        data: { isEnabled: newEnabled },
      });

      // When enabling a section, only enable child lines whose items are visible
      // When disabling, disable all child lines regardless
      if (newEnabled) {
        // Get all child lines with their items
        const childLines = await prisma.menuLine.findMany({
          where: {
            menuId,
            tenantId: session.tenantId,
            parentLineId: lineId,
            lineType: 'item',
          },
          include: { item: true },
        });

        // Only enable lines where the item is visible
        const enableableLineIds = childLines
          .filter(cl => cl.item?.isVisible === true)
          .map(cl => cl.id);

        const skippedCount = childLines.length - enableableLineIds.length;

        if (enableableLineIds.length > 0) {
          await prisma.menuLine.updateMany({
            where: { id: { in: enableableLineIds } },
            data: { isEnabled: true },
          });
        }

        // Log how many were skipped due to deactivated items
        if (skippedCount > 0) {
          console.log(`Skipped enabling ${skippedCount} item lines because their items are deactivated`);
        }
      } else {
        // Disable all child lines
        await prisma.menuLine.updateMany({
          where: {
            menuId,
            tenantId: session.tenantId,
            parentLineId: lineId,
          },
          data: { isEnabled: false },
        });
      }

      // Log the action
      await prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          userId: session.id,
          action: 'UPDATE',
          entityType: 'menu_line',
          entityId: lineId,
          oldValues: { isEnabled: existing.isEnabled, cascadeToChildren: true },
          newValues: { isEnabled: newEnabled },
        },
      });
    }
    // If it's an ITEM line, toggle isVisible on the Item itself (affects all menus)
    else if (existing.lineType === 'item' && existing.itemId) {
      const item = existing.item;
      if (item) {
        // Toggle isVisible on the Item (affects all menus)
        await prisma.item.update({
          where: { id: existing.itemId },
          data: { isVisible: !item.isVisible },
        });

        // Also toggle the line's isEnabled to keep in sync
        await prisma.menuLine.update({
          where: { id: lineId },
          data: { isEnabled: !item.isVisible },
        });

        // Update all other menu lines for this item to sync isEnabled
        await prisma.menuLine.updateMany({
          where: {
            tenantId: session.tenantId,
            itemId: existing.itemId,
          },
          data: { isEnabled: !item.isVisible },
        });

        // Log the action
        await prisma.auditLog.create({
          data: {
            tenantId: session.tenantId,
            userId: session.id,
            action: 'UPDATE',
            entityType: 'item',
            entityId: existing.itemId,
            oldValues: { isVisible: item.isVisible },
            newValues: { isVisible: !item.isVisible },
          },
        });
      }
    }

    // Fetch the updated line for response
    const line = await prisma.menuLine.findUnique({
      where: { id: lineId },
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

    // Helper to convert BigInt to Number for JSON serialization
    const serialized = JSON.parse(
      JSON.stringify(line, (_, value) =>
        typeof value === 'bigint' ? Number(value) : value
      )
    );

    return NextResponse.json({ line: serialized });
  } catch (error) {
    console.error('Toggle menu line error:', error);
    return NextResponse.json({ error: 'Failed to toggle menu line' }, { status: 500 });
  }
}
