import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const item = await prisma.item.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        section: { include: { translations: true } },
        translations: true,
        priceBase: true,
        priceOverrides: true,
        allergens: { include: { allergen: { include: { translations: true } } } },
        dietaryFlags: { include: { dietaryFlag: { include: { translations: true } } } },
        optionGroups: {
          include: {
            optionGroup: {
              include: {
                translations: true,
                options: {
                  include: {
                    translations: true,
                    price: true,
                  },
                },
              },
            },
          },
        },
        ingredients: { include: { ingredient: true } },
        imageAsset: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Get item error:', error);
    return NextResponse.json({ error: 'Failed to get item' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const {
      sectionId,
      sku,
      translations,
      price,
      currency,
      spicinessLevel,
      calories,
      isVisible,
      allergens,
      dietaryFlags,
    } = await req.json();

    const existing = await prisma.item.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { translations: true, priceBase: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = await prisma.$transaction(async (tx) => {
      // Update translations
      if (translations?.length > 0) {
        await tx.itemI18n.deleteMany({ where: { itemId: id } });
        await tx.itemI18n.createMany({
          data: translations.map((t: { locale: string; name: string; description?: string }) => ({
            tenantId: session.tenantId,
            itemId: id,
            locale: t.locale,
            name: t.name,
            description: t.description,
          })),
        });
      }

      // Update price
      if (price !== undefined) {
        await tx.itemPriceBase.upsert({
          where: { itemId: id },
          create: {
            tenantId: session.tenantId,
            itemId: id,
            currency: currency || 'EUR',
            amountMinor: Math.round(price * 100),
          },
          update: {
            currency: currency || 'EUR',
            amountMinor: Math.round(price * 100),
          },
        });
      }

      // Update allergens
      if (allergens) {
        await tx.itemAllergen.deleteMany({ where: { itemId: id } });
        if (allergens.length > 0) {
          await tx.itemAllergen.createMany({
            data: allergens.map((code: string) => ({
              tenantId: session.tenantId,
              itemId: id,
              allergenCode: code,
            })),
          });
        }
      }

      // Update dietary flags
      if (dietaryFlags) {
        await tx.itemDietaryFlag.deleteMany({ where: { itemId: id } });
        if (dietaryFlags.length > 0) {
          await tx.itemDietaryFlag.createMany({
            data: dietaryFlags.map((code: string) => ({
              tenantId: session.tenantId,
              itemId: id,
              dietaryFlagCode: code,
            })),
          });
        }
      }

      // Update the item
      const updatedItem = await tx.item.update({
        where: { id },
        data: {
          sectionId,
          sku,
          spicinessLevel,
          calories,
          isVisible,
        },
        include: {
          translations: true,
          priceBase: true,
          allergens: { include: { allergen: true } },
          dietaryFlags: { include: { dietaryFlag: true } },
        },
      });

      // If isVisible changed, sync all menu lines for this item across all menus
      if (isVisible !== undefined && isVisible !== existing.isVisible) {
        await tx.menuLine.updateMany({
          where: {
            tenantId: session.tenantId,
            itemId: id,
            lineType: 'item',
          },
          data: {
            isEnabled: isVisible,
          },
        });
      }

      return updatedItem;
    });

    // Serialize existing for audit log (handle BigInt)
    const serializeForAudit = (obj: unknown) => {
      return JSON.parse(
        JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v))
      );
    };

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'UPDATE',
        entityType: 'item',
        entityId: item.id,
        oldValues: serializeForAudit(existing) as object,
        newValues: { translations, price, allergens, dietaryFlags } as object,
      },
    });

    return NextResponse.json({ item: serializeForAudit(item) });
  } catch (error) {
    console.error('Update item error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.item.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    await prisma.item.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'DELETE',
        entityType: 'item',
        entityId: id,
        oldValues: existing,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete item error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
