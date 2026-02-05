import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

export async function GET() {
  try {
    const guard = await requirePermission('brands.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const brands = await prisma.brand.findMany({
      where: { tenantId: session.tenantId },
      include: {
        _count: { select: { locations: true, menus: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ brands });
  } catch (error) {
    console.error('Get brands error:', error);
    return NextResponse.json({ error: 'Failed to get brands' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission('brands.create');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { name, slug } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const brand = await prisma.brand.create({
      data: {
        tenantId: session.tenantId,
        name,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'CREATE',
        entityType: 'brand',
        entityId: brand.id,
        newValues: { name, slug },
      },
    });

    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    console.error('Create brand error:', error);
    return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 });
  }
}
