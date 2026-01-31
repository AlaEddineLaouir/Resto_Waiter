import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getRestaurantSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ admin });
  } catch (error) {
    console.error('Get restaurant admin error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
