import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

export async function GET(req: Request) {
  try {
    const guard = await requirePermission('location.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId');

    const locations = await prisma.location.findMany({
      where: {
        tenantId: session.tenantId,
        ...(brandId && { brandId }),
      },
      include: {
        brand: { select: { id: true, name: true } },
        _count: { select: { diningTables: true, menuPublications: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Get locations error:', error);
    return NextResponse.json({ error: 'Failed to get locations' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission('location.create');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const {
      brandId,
      name,
      slug,
      addressLine1,
      addressLine2,
      city,
      postalCode,
      countryCode,
      timezone,
      phone,
      email,
      serviceDineIn,
      serviceTakeaway,
      serviceDelivery,
    } = await req.json();

    if (!brandId || !name) {
      return NextResponse.json({ error: 'Brand and name are required' }, { status: 400 });
    }

    // Generate slug if not provided
    const locationSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Verify brand belongs to tenant
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, tenantId: session.tenantId },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Invalid brand' }, { status: 400 });
    }

    // Check slug uniqueness within tenant
    const existingSlug = await prisma.location.findFirst({
      where: { tenantId: session.tenantId, slug: locationSlug },
    });

    if (existingSlug) {
      return NextResponse.json({ error: 'A location with this slug already exists' }, { status: 400 });
    }

    const location = await prisma.location.create({
      data: {
        tenantId: session.tenantId,
        brandId,
        name,
        slug: locationSlug,
        addressLine1,
        addressLine2,
        city,
        postalCode,
        countryCode: countryCode || 'FR',
        timezone: timezone || 'Europe/Paris',
        phone,
        email,
        serviceDineIn: serviceDineIn ?? true,
        serviceTakeaway: serviceTakeaway ?? true,
        serviceDelivery: serviceDelivery ?? false,
      },
      include: { brand: { select: { id: true, name: true } } },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'CREATE',
        entityType: 'location',
        entityId: location.id,
        newValues: { name, brandId },
      },
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    console.error('Create location error:', error);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}
