import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

/**
 * PATCH /api/admin/sections/reorder
 * Reorder sections within a menu
 * Body: { menuId: string, sectionIds: string[] }
 */
export async function PATCH(req: Request) {
  try {
    const guard = await requirePermission('section.update');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { menuId, sectionIds } = await req.json();

    if (!menuId || !Array.isArray(sectionIds)) {
      return NextResponse.json(
        { error: 'menuId and sectionIds array are required' },
        { status: 400 }
      );
    }

    // Verify menu belongs to tenant and is a draft (editable)
    const menu = await prisma.menu.findFirst({
      where: { id: menuId, tenantId: session.tenantId },
    });

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    if (menu.status !== 'draft') {
      return NextResponse.json(
        { error: 'Cannot reorder sections in a published menu. Create a new draft first.' },
        { status: 400 }
      );
    }

    // Update display order in the join table
    await prisma.$transaction(
      sectionIds.map((sectionId, index) =>
        prisma.menuSection.updateMany({
          where: {
            menuId,
            sectionId,
            tenantId: session.tenantId,
          },
          data: { displayOrder: index },
        })
      )
    );

    // Fetch updated sections via join table
    const menuSections = await prisma.menuSection.findMany({
      where: { menuId, tenantId: session.tenantId },
      include: {
        section: {
          include: {
            translations: true,
            _count: { select: { items: true } },
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Transform to expected structure
    const sections = menuSections.map(ms => ({
      ...ms.section,
      displayOrder: ms.displayOrder,
    }));

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'REORDER',
        entityType: 'section',
        entityId: menuId,
        newValues: { sectionIds },
      },
    });

    return NextResponse.json({ sections });
  } catch (error) {
    console.error('Reorder sections error:', error);
    return NextResponse.json({ error: 'Failed to reorder sections' }, { status: 500 });
  }
}
