import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

export async function GET() {
  try {
    const guard = await requirePermission('option.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const optionGroups = await prisma.optionGroup.findMany({
      where: { tenantId: session.tenantId },
      include: {
        translations: true,
        menu: {
          include: {
            translations: true,
          },
        },
        options: {
          include: {
            translations: true,
            price: true,
          },
          orderBy: { displayOrder: 'asc' },
        },
        items: {
          include: {
            item: { include: { translations: true } },
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Convert BigInt to string for JSON serialization
    const serializedOptionGroups = optionGroups.map(group => ({
      ...group,
      options: group.options.map(option => ({
        ...option,
        price: option.price ? {
          ...option.price,
          deltaMinor: option.price.deltaMinor?.toString() || null,
        } : null,
      })),
    }));

    return NextResponse.json({ optionGroups: serializedOptionGroups });
  } catch (error) {
    console.error('Get option groups error:', error);
    return NextResponse.json({ error: 'Failed to get option groups' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission('option.create');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const {
      menuId,
      code,
      selectionMode,
      minSelect,
      maxSelect,
      isRequired,
      displayOrder,
      isActive,
      translations,
      options,
    } = await req.json();

    // Validate menu belongs to tenant
    const menu = await prisma.menu.findFirst({
      where: { id: menuId, tenantId: session.tenantId },
    });

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const optionGroup = await prisma.$transaction(async (tx) => {
      // Create option group
      const group = await tx.optionGroup.create({
        data: {
          tenantId: session.tenantId,
          menuId,
          code: code || null,
          selectionMode: selectionMode || 'single',
          minSelect: minSelect || 0,
          maxSelect: maxSelect || null,
          isRequired: isRequired || false,
          displayOrder: displayOrder || 0,
          isActive: isActive !== false,
        },
      });

      // Create translations
      if (translations?.length > 0) {
        await tx.optionGroupI18n.createMany({
          data: translations.map((t: { locale: string; name: string; description?: string }) => ({
            tenantId: session.tenantId,
            optionGroupId: group.id,
            locale: t.locale,
            name: t.name,
            description: t.description || null,
          })),
        });
      }

      // Create options if provided
      if (options?.length > 0) {
        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          const optionItem = await tx.optionItem.create({
            data: {
              tenantId: session.tenantId,
              optionGroupId: group.id,
              code: opt.code || null,
              displayOrder: opt.displayOrder ?? i,
              isDefault: opt.isDefault || false,
              isActive: opt.isActive !== false,
            },
          });

          // Option translations
          if (opt.translations?.length > 0) {
            await tx.optionItemI18n.createMany({
              data: opt.translations.map(
                (t: { locale: string; name: string; description?: string }) => ({
                  tenantId: session.tenantId,
                  optionItemId: optionItem.id,
                  locale: t.locale,
                  name: t.name,
                  description: t.description || null,
                })
              ),
            });
          }

          // Option price
          if (opt.price && opt.currency) {
            await tx.optionItemPrice.create({
              data: {
                tenantId: session.tenantId,
                optionItemId: optionItem.id,
                currency: opt.currency,
                deltaMinor: BigInt(opt.price),
              },
            });
          }
        }
      }

      return tx.optionGroup.findUnique({
        where: { id: group.id },
        include: {
          translations: true,
          options: { include: { translations: true, price: true } },
        },
      });
    });

    return NextResponse.json({ optionGroup }, { status: 201 });
  } catch (error) {
    console.error('Create option group error:', error);
    return NextResponse.json({ error: 'Failed to create option group' }, { status: 500 });
  }
}
