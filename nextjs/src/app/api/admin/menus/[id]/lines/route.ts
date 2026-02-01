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

// GET all lines for a menu (hierarchical structure)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: menuId } = await params;

    // Verify menu belongs to tenant
    const menu = await prisma.menu.findFirst({
      where: { id: menuId, tenantId: session.tenantId },
      select: { id: true, code: true, status: true },
    });

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    // Fetch all lines for this menu with related data
    const lines = await prisma.menuLine.findMany({
      where: {
        tenantId: session.tenantId,
        menuId,
      },
      include: {
        section: {
          include: {
            translations: true,
          },
        },
        item: {
          include: {
            translations: true,
            priceBase: true,
            allergens: {
              include: {
                allergen: {
                  include: { translations: true },
                },
              },
            },
            dietaryFlags: {
              include: {
                dietaryFlag: {
                  include: { translations: true },
                },
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
      orderBy: { displayOrder: 'asc' },
    });

    // Build hierarchical structure - only return top-level lines (no parent)
    const topLevelLines = lines.filter(line => !line.parentLineId);

    return NextResponse.json({
      menu,
      lines: serializeBigInt(topLevelLines),
    });
  } catch (error) {
    console.error('Get menu lines error:', error);
    return NextResponse.json({ error: 'Failed to get menu lines' }, { status: 500 });
  }
}

// POST - Add a new line to the menu
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: menuId } = await params;
    const { lineType, sectionId, itemId, parentLineId, displayOrder } = await req.json();

    // Validate lineType
    if (!lineType || !['section', 'item'].includes(lineType)) {
      return NextResponse.json({ error: 'Invalid lineType' }, { status: 400 });
    }

    // Validate that section or item is provided based on lineType
    if (lineType === 'section' && !sectionId) {
      return NextResponse.json({ error: 'sectionId is required for section lines' }, { status: 400 });
    }
    if (lineType === 'item' && !itemId) {
      return NextResponse.json({ error: 'itemId is required for item lines' }, { status: 400 });
    }

    // Verify menu belongs to tenant
    const menu = await prisma.menu.findFirst({
      where: { id: menuId, tenantId: session.tenantId },
    });

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    // Verify section or item belongs to tenant
    if (lineType === 'section' && sectionId) {
      const section = await prisma.section.findFirst({
        where: { id: sectionId, tenantId: session.tenantId },
      });
      if (!section) {
        return NextResponse.json({ error: 'Section not found' }, { status: 404 });
      }
    }

    if (lineType === 'item' && itemId) {
      const item = await prisma.item.findFirst({
        where: { id: itemId, tenantId: session.tenantId },
      });
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
    }

    // Verify parent line if provided
    if (parentLineId) {
      const parentLine = await prisma.menuLine.findFirst({
        where: {
          id: parentLineId,
          tenantId: session.tenantId,
          menuId,
          lineType: 'section', // Only sections can be parents
        },
      });
      if (!parentLine) {
        return NextResponse.json({ error: 'Parent line not found or is not a section' }, { status: 400 });
      }
    }

    // Calculate display order if not provided
    let calculatedOrder = displayOrder;
    if (calculatedOrder === undefined) {
      const lastLine = await prisma.menuLine.findFirst({
        where: {
          tenantId: session.tenantId,
          menuId,
          parentLineId: parentLineId || null,
        },
        orderBy: { displayOrder: 'desc' },
      });
      calculatedOrder = (lastLine?.displayOrder ?? -1) + 1;
    }

    // Create the line
    const line = await prisma.menuLine.create({
      data: {
        tenantId: session.tenantId,
        menuId,
        lineType,
        sectionId: lineType === 'section' ? sectionId : null,
        itemId: lineType === 'item' ? itemId : null,
        parentLineId: parentLineId || null,
        displayOrder: calculatedOrder,
        isEnabled: true,
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
        action: 'CREATE',
        entityType: 'menu_line',
        entityId: line.id,
        newValues: { lineType, sectionId, itemId, parentLineId, displayOrder: calculatedOrder },
      },
    });

    return NextResponse.json({ line: serializeBigInt(line) }, { status: 201 });
  } catch (error) {
    console.error('Create menu line error:', error);
    return NextResponse.json({ error: 'Failed to create menu line' }, { status: 500 });
  }
}
