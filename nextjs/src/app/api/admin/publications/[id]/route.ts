import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/publications/[id]
 * Update publication (activate/deactivate)
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const guard = await requirePermission('publications.update');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;
    const { isCurrent } = await req.json();

    // Verify publication belongs to tenant
    const existing = await prisma.menuPublication.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { location: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Publication not found' }, { status: 404 });
    }

    // If activating this publication, deactivate others at same location (MA-002)
    if (isCurrent === true) {
      await prisma.$transaction(async (tx) => {
        // Deactivate all other publications at this location
        await tx.menuPublication.updateMany({
          where: {
            tenantId: session.tenantId,
            locationId: existing.locationId,
            isCurrent: true,
            id: { not: id },
          },
          data: { isCurrent: false },
        });
      });
    }

    const publication = await prisma.menuPublication.update({
      where: { id },
      data: {
        ...(isCurrent !== undefined && { isCurrent }),
        ...(isCurrent === true && { goesLiveAt: new Date() }),
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

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'UPDATE',
        entityType: 'menu_publication',
        entityId: publication.id,
        newValues: { isCurrent },
      },
    });

    return NextResponse.json({ publication });
  } catch (error) {
    console.error('Update publication error:', error);
    return NextResponse.json({ error: 'Failed to update publication' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/publications/[id]
 * Remove a publication (deactivate menu at location)
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const guard = await requirePermission('publications.delete');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;

    const existing = await prisma.menuPublication.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Publication not found' }, { status: 404 });
    }

    await prisma.menuPublication.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'DELETE',
        entityType: 'menu_publication',
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete publication error:', error);
    return NextResponse.json({ error: 'Failed to delete publication' }, { status: 500 });
  }
}
