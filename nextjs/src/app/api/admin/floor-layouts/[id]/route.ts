import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/admin/floor-layouts/[id] - Get a single layout with all elements
export async function GET(req: Request, { params }: Params) {
  try {
    const guard = await requirePermission('floor-layouts.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;
    const { id } = await params;

    const layout = await prisma.floorLayout.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        location: { select: { id: true, name: true, slug: true } },
        zones: { orderBy: { zIndex: 'asc' } },
        tables: {
          include: {
            chairs: true,
            zone: { select: { id: true, name: true } },
            mergedGroupLink: {
              include: {
                group: {
                  select: { id: true, groupLabel: true, capacity: true },
                },
              },
            },
          },
          orderBy: { label: 'asc' },
        },
        obstacles: { orderBy: { zIndex: 'asc' } },
      },
    });

    if (!layout) {
      return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
    }

    return NextResponse.json({ layout });
  } catch (error) {
    console.error('Get floor layout error:', error);
    return NextResponse.json({ error: 'Failed to get floor layout' }, { status: 500 });
  }
}

// PUT /api/admin/floor-layouts/[id] - Update layout properties
export async function PUT(req: Request, { params }: Params) {
  try {
    const guard = await requirePermission('floor-layouts.update');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;
    const { id } = await params;

    const existing = await prisma.floorLayout.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      description,
      floor,
      canvasWidth,
      canvasHeight,
      gridSize,
      scale,
      bgImageUrl,
    } = body;

    const layout = await prisma.floorLayout.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(floor !== undefined && { floor }),
        ...(canvasWidth !== undefined && { canvasWidth }),
        ...(canvasHeight !== undefined && { canvasHeight }),
        ...(gridSize !== undefined && { gridSize }),
        ...(scale !== undefined && { scale }),
        ...(bgImageUrl !== undefined && { bgImageUrl }),
      },
      include: {
        location: { select: { id: true, name: true } },
        _count: { select: { tables: true, zones: true, obstacles: true } },
      },
    });

    return NextResponse.json({ layout });
  } catch (error) {
    console.error('Update floor layout error:', error);
    return NextResponse.json({ error: 'Failed to update floor layout' }, { status: 500 });
  }
}

// DELETE /api/admin/floor-layouts/[id] - Delete a layout and all its elements
export async function DELETE(req: Request, { params }: Params) {
  try {
    const guard = await requirePermission('floor-layouts.delete');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;
    const { id } = await params;

    const existing = await prisma.floorLayout.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
    }

    // Hard delete — cascades to zones, tables, chairs, obstacles
    await prisma.floorLayout.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete floor layout error:', error);
    return NextResponse.json({ error: 'Failed to delete floor layout' }, { status: 500 });
  }
}
