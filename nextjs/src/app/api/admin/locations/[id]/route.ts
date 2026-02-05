import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('locations.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;

    const location = await prisma.location.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        brand: true,
        diningTables: true,
        menuPublications: {
          include: { menu: true },
        },
      },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    return NextResponse.json({ location });
  } catch (error) {
    console.error('Get location error:', error);
    return NextResponse.json({ error: 'Failed to get location' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('locations.update');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;
    const data = await req.json();

    const existing = await prisma.location.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const location = await prisma.location.update({
      where: { id },
      data: {
        name: data.name,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        postalCode: data.postalCode,
        countryCode: data.countryCode,
        timezone: data.timezone,
        serviceDineIn: data.serviceDineIn,
        serviceTakeaway: data.serviceTakeaway,
        serviceDelivery: data.serviceDelivery,
        isActive: data.isActive,
      },
      include: { brand: { select: { id: true, name: true } } },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'UPDATE',
        entityType: 'location',
        entityId: location.id,
        oldValues: existing,
        newValues: data,
      },
    });

    return NextResponse.json({ location });
  } catch (error) {
    console.error('Update location error:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('locations.delete');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;

    const existing = await prisma.location.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    await prisma.location.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'DELETE',
        entityType: 'location',
        entityId: id,
        oldValues: existing,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete location error:', error);
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}
