import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('brands.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;

    const brand = await prisma.brand.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        locations: true,
        menus: { include: { translations: true } },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    return NextResponse.json({ brand });
  } catch (error) {
    console.error('Get brand error:', error);
    return NextResponse.json({ error: 'Failed to get brand' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('brands.update');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;
    const { name, slug } = await req.json();

    const existing = await prisma.brand.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const brand = await prisma.brand.update({
      where: { id },
      data: {
        name,
        slug: slug?.toLowerCase().replace(/\s+/g, '-'),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'UPDATE',
        entityType: 'brand',
        entityId: brand.id,
        oldValues: existing,
        newValues: { name, slug },
      },
    });

    return NextResponse.json({ brand });
  } catch (error) {
    console.error('Update brand error:', error);
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('brands.delete');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;

    const existing = await prisma.brand.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    await prisma.brand.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'DELETE',
        entityType: 'brand',
        entityId: id,
        oldValues: existing,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete brand error:', error);
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 });
  }
}
