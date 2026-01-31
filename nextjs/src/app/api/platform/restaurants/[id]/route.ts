import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const restaurant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
        categories: { include: { _count: { select: { dishes: true } } } },
        _count: { select: { dishes: true, chatSessions: true } },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('Get restaurant error:', error);
    return NextResponse.json({ error: 'Failed to get restaurant' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();

    const restaurant = await prisma.tenant.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        isActive: data.isActive,
      },
      include: {
        subscription: { include: { plan: true } },
      },
    });

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('Update restaurant error:', error);
    return NextResponse.json({ error: 'Failed to update restaurant' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.tenant.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    return NextResponse.json({ error: 'Failed to delete restaurant' }, { status: 500 });
  }
}
