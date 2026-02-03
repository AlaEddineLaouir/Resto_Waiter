import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

export async function GET(req: Request) {
  try {
    const guard = await requirePermission('section.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { searchParams } = new URL(req.url);
    const menuId = searchParams.get('menuId');

    if (menuId) {
      // Get sections for a specific menu (via join table)
      const menuSections = await prisma.menuSection.findMany({
        where: {
          tenantId: session.tenantId,
          menuId,
        },
        include: {
          section: {
            include: {
              translations: true,
              _count: { select: { items: true } },
            },
          },
          menu: {
            include: {
              translations: true,
            },
          },
        },
        orderBy: { displayOrder: 'asc' },
      });

      // Transform to expected structure
      const sections = menuSections.map(ms => ({
        ...ms.section,
        displayOrder: ms.displayOrder,
        menu: ms.menu,
      }));

      return NextResponse.json({ sections });
    } else {
      // Get all sections for tenant (standalone entities)
      const sections = await prisma.section.findMany({
        where: {
          tenantId: session.tenantId,
        },
        include: {
          translations: true,
          _count: { select: { items: true } },
          menuSections: {
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

      return NextResponse.json({ sections });
    }
  } catch (error) {
    console.error('Get sections error:', error);
    return NextResponse.json({ error: 'Failed to get sections' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission('section.create');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { menuId, translations, displayOrder } = await req.json();

    if (!translations?.length) {
      return NextResponse.json({ error: 'Translations are required' }, { status: 400 });
    }

    // Create the section entity
    const section = await prisma.section.create({
      data: {
        tenantId: session.tenantId,
        translations: {
          create: translations.map((t: { locale: string; title: string; description?: string }) => ({
            tenantId: session.tenantId,
            locale: t.locale,
            title: t.title,
            description: t.description,
          })),
        },
      },
      include: { translations: true },
    });

    // If menuId provided, also link to the menu
    if (menuId) {
      // Verify menu belongs to tenant
      const menu = await prisma.menu.findFirst({
        where: { id: menuId, tenantId: session.tenantId },
      });

      if (menu) {
        // Get max display order if not provided
        let order = displayOrder;
        if (order === undefined) {
          const maxOrder = await prisma.menuSection.findFirst({
            where: { menuId },
            orderBy: { displayOrder: 'desc' },
            select: { displayOrder: true },
          });
          order = (maxOrder?.displayOrder || 0) + 1;
        }

        await prisma.menuSection.create({
          data: {
            tenantId: session.tenantId,
            menuId,
            sectionId: section.id,
            displayOrder: order,
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'CREATE',
        entityType: 'section',
        entityId: section.id,
        newValues: { menuId, translations },
      },
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    console.error('Create section error:', error);
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}
