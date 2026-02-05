import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('items.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

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
    const guard = await requirePermission('items.update');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

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
      ingredients,
    } = await req.json();

    const existing = await prisma.item.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { translations: true, priceBase: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = await prisma.$transaction(async (tx) => {
      // Update translations using upsert to avoid constraint issues
      if (translations?.length > 0) {
        for (const t of translations as { locale: string; name: string; description?: string }[]) {
          await tx.itemI18n.upsert({
            where: {
              tenantId_itemId_locale: {
                tenantId: session.tenantId,
                itemId: id,
                locale: t.locale,
              },
            },
            create: {
              tenantId: session.tenantId,
              itemId: id,
              locale: t.locale,
              name: t.name,
              description: t.description,
            },
            update: {
              name: t.name,
              description: t.description,
            },
          });
        }
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
        // Delete existing and wait for completion
        const deletedAllergens = await tx.itemAllergen.deleteMany({ where: { itemId: id } });
        console.log(`Deleted ${deletedAllergens.count} allergens for item ${id}`);
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
        const deletedFlags = await tx.itemDietaryFlag.deleteMany({ where: { itemId: id } });
        console.log(`Deleted ${deletedFlags.count} dietary flags for item ${id}`);
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

      // Update ingredients
      if (ingredients) {
        const deletedIngredients = await tx.itemIngredient.deleteMany({ where: { itemId: id } });
        console.log(`Deleted ${deletedIngredients.count} ingredients for item ${id}`);
        if (ingredients.length > 0) {
          await tx.itemIngredient.createMany({
            data: ingredients.map((ing: { ingredientId: string; quantity?: string; unit?: string; isOptional?: boolean }) => ({
              tenantId: session.tenantId,
              itemId: id,
              ingredientId: ing.ingredientId,
              quantity: ing.quantity || null,
              unit: ing.unit || null,
              isOptional: ing.isOptional || false,
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
          ingredients: { include: { ingredient: true } },
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
    const guard = await requirePermission('items.delete');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

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
