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

export async function GET(req: Request) {
  try {
    const guard = await requirePermission('item.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get('sectionId');
    const menuId = searchParams.get('menuId');

    if (menuId) {
      // Get items for a specific menu via join table
      const menuItems = await prisma.menuItem.findMany({
        where: {
          tenantId: session.tenantId,
          menuId,
          ...(sectionId && { sectionId }),
        },
        include: {
          item: {
            include: {
              section: { include: { translations: true } },
              translations: true,
              priceBase: true,
              allergens: { include: { allergen: { include: { translations: true } } } },
              dietaryFlags: { include: { dietaryFlag: { include: { translations: true } } } },
              imageAsset: true,
            },
          },
        },
        orderBy: [{ sectionId: 'asc' }, { displayOrder: 'asc' }],
      });

      // Transform to expected structure
      const items = menuItems.map(mi => ({
        ...mi.item,
        displayOrder: mi.displayOrder,
        menuId: mi.menuId,
        sectionIdInMenu: mi.sectionId,
      }));

      return NextResponse.json({ items: serializeBigInt(items) });
    } else {
      // Get all items for tenant (standalone entities)
      const items = await prisma.item.findMany({
        where: {
          tenantId: session.tenantId,
          ...(sectionId && { sectionId }),
        },
        include: {
          section: { include: { translations: true } },
          translations: true,
          priceBase: true,
          allergens: { include: { allergen: { include: { translations: true } } } },
          dietaryFlags: { include: { dietaryFlag: { include: { translations: true } } } },
          imageAsset: true,
          menuItems: {
            include: {
              menu: {
                include: {
                  translations: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ items: serializeBigInt(items) });
    }
  } catch (error) {
    console.error('Get items error:', error);
    return NextResponse.json({ error: 'Failed to get items' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission('item.create');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const {
      menuId,
      sectionId,
      sku,
      translations,
      price,
      currency,
      spicinessLevel,
      calories,
      allergens,
      dietaryFlags,
    } = await req.json();

    if (!sectionId || !translations?.length) {
      return NextResponse.json(
        { error: 'Section ID and translations are required' },
        { status: 400 }
      );
    }

    // Verify section belongs to tenant
    const section = await prisma.section.findFirst({
      where: { id: sectionId, tenantId: session.tenantId },
    });

    if (!section) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }

    const item = await prisma.$transaction(async (tx) => {
      // Create item entity
      const newItem = await tx.item.create({
        data: {
          tenantId: session.tenantId,
          sectionId,
          sku,
          spicinessLevel,
          calories,
          translations: {
            create: translations.map((t: { locale: string; name: string; description?: string }) => ({
              tenantId: session.tenantId,
              locale: t.locale,
              name: t.name,
              description: t.description,
            })),
          },
        },
      });

      // Create price
      if (price !== undefined) {
        await tx.itemPriceBase.create({
          data: {
            tenantId: session.tenantId,
            itemId: newItem.id,
            currency: currency || 'EUR',
            amountMinor: Math.round(price * 100), // Convert to cents
          },
        });
      }

      // Create allergen links
      if (allergens?.length) {
        await tx.itemAllergen.createMany({
          data: allergens.map((code: string) => ({
            tenantId: session.tenantId,
            itemId: newItem.id,
            allergenCode: code,
          })),
        });
      }

      // Create dietary flag links
      if (dietaryFlags?.length) {
        await tx.itemDietaryFlag.createMany({
          data: dietaryFlags.map((code: string) => ({
            tenantId: session.tenantId,
            itemId: newItem.id,
            dietaryFlagCode: code,
          })),
        });
      }

      // If menuId provided, link item to menu via join table
      if (menuId) {
        // Get max display order for items in this section in this menu
        const maxOrder = await tx.menuItem.findFirst({
          where: { menuId, sectionId },
          orderBy: { displayOrder: 'desc' },
          select: { displayOrder: true },
        });

        await tx.menuItem.create({
          data: {
            tenantId: session.tenantId,
            menuId,
            sectionId,
            itemId: newItem.id,
            displayOrder: (maxOrder?.displayOrder || 0) + 1,
          },
        });
      }

      return newItem;
    });

    // Fetch complete item
    const completeItem = await prisma.item.findUnique({
      where: { id: item.id },
      include: {
        translations: true,
        priceBase: true,
        allergens: { include: { allergen: true } },
        dietaryFlags: { include: { dietaryFlag: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'CREATE',
        entityType: 'item',
        entityId: item.id,
        newValues: { sectionId, translations, price },
      },
    });

    return NextResponse.json({ item: serializeBigInt(completeItem) }, { status: 201 });
  } catch (error) {
    console.error('Create item error:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
