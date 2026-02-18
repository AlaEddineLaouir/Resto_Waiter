import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

// GET /api/admin/floor-layouts - List all layouts for the tenant
export async function GET(req: Request) {
  try {
    const guard = await requirePermission('floor-layouts.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');
    const status = searchParams.get('status');

    const layouts = await prisma.floorLayout.findMany({
      where: {
        tenantId: session.tenantId,
        ...(locationId && { locationId }),
        ...(status && { status }),
        isActive: true,
      },
      include: {
        location: { select: { id: true, name: true, slug: true } },
        _count: {
          select: { tables: true, zones: true, obstacles: true },
        },
      },
      orderBy: [{ location: { name: 'asc' } }, { name: 'asc' }],
    });

    return NextResponse.json({ layouts });
  } catch (error) {
    console.error('Get floor layouts error:', error);
    return NextResponse.json({ error: 'Failed to get floor layouts' }, { status: 500 });
  }
}

// POST /api/admin/floor-layouts - Create a new floor layout
export async function POST(req: Request) {
  try {
    const guard = await requirePermission('floor-layouts.create');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const body = await req.json();
    const {
      locationId,
      name,
      description,
      floor,
      canvasWidth,
      canvasHeight,
      gridSize,
      scale,
    } = body;

    if (!locationId || !name) {
      return NextResponse.json({ error: 'Location and name are required' }, { status: 400 });
    }

    // Verify location belongs to tenant
    const location = await prisma.location.findFirst({
      where: { id: locationId, tenantId: session.tenantId },
    });
    if (!location) {
      return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
    }

    // Find next version for this name+location combo
    const existingVersions = await prisma.floorLayout.findMany({
      where: { tenantId: session.tenantId, locationId, name },
      select: { version: true },
      orderBy: { version: 'desc' },
      take: 1,
    });
    const nextVersion = existingVersions.length > 0 ? existingVersions[0].version + 1 : 1;

    const layout = await prisma.floorLayout.create({
      data: {
        tenantId: session.tenantId,
        locationId,
        name,
        description: description || null,
        floor: floor ?? 0,
        canvasWidth: canvasWidth ?? 1200,
        canvasHeight: canvasHeight ?? 800,
        gridSize: gridSize ?? 20,
        scale: scale ?? 1.0,
        version: nextVersion,
        status: 'draft',
      },
      include: {
        location: { select: { id: true, name: true } },
        _count: { select: { tables: true, zones: true, obstacles: true } },
      },
    });

    return NextResponse.json({ layout }, { status: 201 });
  } catch (error) {
    console.error('Create floor layout error:', error);
    return NextResponse.json({ error: 'Failed to create floor layout' }, { status: 500 });
  }
}
