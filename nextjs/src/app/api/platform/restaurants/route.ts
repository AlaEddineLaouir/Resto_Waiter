import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [restaurants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          subscription: {
            include: { plan: true },
          },
          _count: {
            select: { dishes: true, categories: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tenant.count({ where }),
    ]);

    return NextResponse.json({
      restaurants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get restaurants error:', error);
    return NextResponse.json({ error: 'Failed to get restaurants' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { name, slug, email, phone, address, planId } = data;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug required' }, { status: 400 });
    }

    // Check if slug is already taken
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 400 });
    }

    const restaurant = await prisma.tenant.create({
      data: {
        name,
        slug,
        email,
        phone,
        address,
        subscription: planId
          ? {
              create: {
                planId,
                status: 'active',
                startDate: new Date(),
              },
            }
          : undefined,
      },
      include: {
        subscription: { include: { plan: true } },
      },
    });

    return NextResponse.json({ restaurant }, { status: 201 });
  } catch (error) {
    console.error('Create restaurant error:', error);
    return NextResponse.json({ error: 'Failed to create restaurant' }, { status: 500 });
  }
}
