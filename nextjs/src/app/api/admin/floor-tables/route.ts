import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

// GET /api/admin/floor-tables - List all tables across layouts
export async function GET(req: Request) {
  try {
    const guard = await requirePermission('floor-tables.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { searchParams } = new URL(req.url);
    const layoutId = searchParams.get('layoutId');
    const locationId = searchParams.get('locationId');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const tables = await prisma.floorTable.findMany({
      where: {
        tenantId: session.tenantId,
        layout: { isActive: true },
        ...(layoutId && { layoutId }),
        ...(locationId && { layout: { locationId, isActive: true } }),
        ...(category && { category }),
        ...(status && { status }),
      },
      include: {
        layout: {
          select: { id: true, name: true, status: true, location: { select: { id: true, name: true } } },
        },
        zone: { select: { id: true, name: true } },
        _count: { select: { chairs: true } },
        mergedGroupLink: {
          include: {
            group: { select: { id: true, groupLabel: true, capacity: true } },
          },
        },
      },
      orderBy: [{ layout: { name: 'asc' } }, { label: 'asc' }],
    });

    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Get floor tables error:', error);
    return NextResponse.json({ error: 'Failed to get floor tables' }, { status: 500 });
  }
}
