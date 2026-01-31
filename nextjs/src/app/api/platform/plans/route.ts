import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Get plans error:', error);
    return NextResponse.json({ error: 'Failed to get plans' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        description: data.description,
        priceMonthly: data.priceMonthly || data.price || 0,
        priceYearly: data.priceYearly || (data.price * 10) || 0,
        maxMenuItems: data.maxMenuItems || 100,
        maxApiCallsMonthly: data.maxApiCallsMonthly || 10000,
        features: data.features || [],
      },
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error('Create plan error:', error);
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}
