import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

/**
 * GET /api/admin/publications
 * List all menu publications for the tenant
 */
export async function GET(req: Request) {
  try {
    const guard = await requirePermission('publication.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');

    const publications = await prisma.menuPublication.findMany({
      where: {
        tenantId: session.tenantId,
        ...(locationId && { locationId }),
      },
      include: {
        location: { select: { id: true, name: true } },
        menu: {
          select: {
            id: true,
            code: true,
            status: true,
            publishedAt: true,
            translations: { where: { locale: 'en-US' }, take: 1 },
          },
        },
      },
      orderBy: { goesLiveAt: 'desc' },
    });

    return NextResponse.json({ publications });
  } catch (error) {
    console.error('Get publications error:', error);
    return NextResponse.json({ error: 'Failed to get publications' }, { status: 500 });
  }
}

/**
 * POST /api/admin/publications
 * Create a new menu publication (activate a menu at a location)
 * Multiple menus can be active at the same location
 */
export async function POST(req: Request) {
  try {
    const guard = await requirePermission('publication.create');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { locationId, menuId } = await req.json();

    if (!locationId || !menuId) {
      return NextResponse.json(
        { error: 'locationId and menuId are required' },
        { status: 400 }
      );
    }

    // Verify location belongs to tenant
    const location = await prisma.location.findFirst({
      where: { id: locationId, tenantId: session.tenantId },
    });
    if (!location) {
      return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
    }

    // Verify menu belongs to tenant and is published
    const menu = await prisma.menu.findFirst({
      where: {
        id: menuId,
        tenantId: session.tenantId,
        status: 'published',
      },
    });
    if (!menu) {
      return NextResponse.json(
        { error: 'Invalid menu or menu not published. Publish the menu before activating.' },
        { status: 400 }
      );
    }

    // Transaction: create/update publication (multiple menus can be active at same location)
    const publication = await prisma.$transaction(async (tx) => {
      // Check if publication already exists for this menu at this location
      const existing = await tx.menuPublication.findFirst({
        where: {
          tenantId: session.tenantId,
          locationId,
          menuId,
        },
      });

      if (existing) {
        // Update existing publication
        return tx.menuPublication.update({
          where: { id: existing.id },
          data: {
            isCurrent: true,
            goesLiveAt: new Date(),
            retiresAt: null,
          },
          include: {
            location: { select: { id: true, name: true } },
            menu: {
              select: {
                id: true,
                code: true,
                status: true,
              },
            },
          },
        });
      }

      // Create new publication
      return tx.menuPublication.create({
        data: {
          tenantId: session.tenantId,
          locationId,
          menuId,
          isCurrent: true,
          goesLiveAt: new Date(),
        },
        include: {
          location: { select: { id: true, name: true } },
          menu: {
            select: {
              id: true,
              code: true,
              status: true,
            },
          },
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'PUBLISH',
        entityType: 'menu_publication',
        entityId: publication.id,
        newValues: { locationId, menuId },
      },
    });

    return NextResponse.json({ publication }, { status: 201 });
  } catch (error) {
    console.error('Create publication error:', error);
    return NextResponse.json({ error: 'Failed to create publication' }, { status: 500 });
  }
}
