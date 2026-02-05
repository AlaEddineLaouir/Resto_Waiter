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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('menus.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;

    const menu = await prisma.menu.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        brand: true,
        translations: true,
        availabilityRules: true,
        publications: {
          include: {
            location: { select: { id: true, name: true } },
          },
        },
        // New MenuLine structure
        lines: {
          where: { parentLineId: null }, // Only top-level lines
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
                allergens: { include: { allergen: { include: { translations: true } } } },
                dietaryFlags: { include: { dietaryFlag: { include: { translations: true } } } },
                ingredients: { include: { ingredient: true } },
              },
            },
            childLines: {
              include: {
                section: { include: { translations: true } },
                item: {
                  include: {
                    translations: true,
                    priceBase: true,
                    allergens: { include: { allergen: { include: { translations: true } } } },
                    dietaryFlags: { include: { dietaryFlag: { include: { translations: true } } } },
                    ingredients: { include: { ingredient: true } },
                  },
                },
              },
              orderBy: { displayOrder: 'asc' },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    return NextResponse.json({ menu: serializeBigInt(menu) });
  } catch (error) {
    console.error('Get menu error:', error);
    return NextResponse.json({ error: 'Failed to get menu' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('menus.update');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;
    const { code, translations, currency, priceTaxPolicy, defaultLocale, isActive, status } = await req.json();

    const existing = await prisma.menu.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { translations: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    // Update menu and translations
    const menu = await prisma.$transaction(async (tx) => {
      // Delete old translations and create new ones
      if (translations?.length > 0) {
        await tx.menuI18n.deleteMany({ where: { menuId: id } });
        await tx.menuI18n.createMany({
          data: translations.map((t: { locale: string; name: string; description?: string }) => ({
            tenantId: session.tenantId,
            menuId: id,
            locale: t.locale,
            name: t.name,
            description: t.description,
          })),
        });
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {};
      if (code !== undefined) updateData.code = code.toUpperCase();
      if (currency !== undefined) updateData.currency = currency;
      if (priceTaxPolicy !== undefined) updateData.priceTaxPolicy = priceTaxPolicy;
      if (defaultLocale !== undefined) updateData.defaultLocale = defaultLocale;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (status !== undefined) {
        updateData.status = status;
        // Set publishedAt when publishing for the first time
        if (status === 'published' && !existing.publishedAt) {
          updateData.publishedAt = new Date();
        }
      }

      return tx.menu.update({
        where: { id },
        data: updateData,
        include: {
          brand: { select: { id: true, name: true } },
          translations: true,
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'UPDATE',
        entityType: 'menu',
        entityId: menu.id,
        oldValues: existing,
        newValues: { code, translations },
      },
    });

    return NextResponse.json({ menu });
  } catch (error) {
    console.error('Update menu error:', error);
    return NextResponse.json({ error: 'Failed to update menu' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('menus.delete');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;

    const existing = await prisma.menu.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    await prisma.menu.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'DELETE',
        entityType: 'menu',
        entityId: id,
        oldValues: existing,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete menu error:', error);
    return NextResponse.json({ error: 'Failed to delete menu' }, { status: 500 });
  }
}
