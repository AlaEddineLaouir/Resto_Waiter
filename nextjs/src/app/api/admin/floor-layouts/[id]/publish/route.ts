import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/admin/floor-layouts/[id]/publish - Publish a layout
export async function POST(req: Request, { params }: Params) {
  try {
    const guard = await requirePermission('floor-layouts.publish');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;
    const { id } = await params;

    const existing = await prisma.floorLayout.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
    }

    // Archive any currently published layout for the same location+floor
    await prisma.floorLayout.updateMany({
      where: {
        tenantId: session.tenantId,
        locationId: existing.locationId,
        floor: existing.floor,
        status: 'published',
        id: { not: id },
      },
      data: { status: 'archived' },
    });

    const layout = await prisma.floorLayout.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
      include: {
        location: { select: { id: true, name: true } },
        _count: { select: { tables: true, zones: true, obstacles: true } },
      },
    });

    return NextResponse.json({ layout });
  } catch (error) {
    console.error('Publish floor layout error:', error);
    return NextResponse.json({ error: 'Failed to publish floor layout' }, { status: 500 });
  }
}
