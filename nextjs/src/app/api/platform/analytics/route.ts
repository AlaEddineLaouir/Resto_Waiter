import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get counts
    const [
      totalRestaurants,
      activeRestaurants,
      totalPlans,
      recentRestaurants,
      subscriptionsByPlan,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.subscriptionPlan.count({ where: { isActive: true } }),
      prisma.tenant.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.restaurantSubscription.groupBy({
        by: ['planId'],
        _count: { id: true },
        where: { status: 'active' },
      }),
    ]);

    // Get plan names for subscription breakdown
    const planIds = subscriptionsByPlan.map((s) => s.planId);
    const plans = await prisma.subscriptionPlan.findMany({
      where: { id: { in: planIds } },
      select: { id: true, name: true, priceMonthly: true },
    });

    const subscriptionBreakdown = subscriptionsByPlan.map((sub) => {
      const plan = plans.find((p) => p.id === sub.planId);
      return {
        planId: sub.planId,
        planName: plan?.name || 'Unknown',
        count: sub._count.id,
        revenue: Number(plan?.priceMonthly || 0) * sub._count.id,
      };
    });

    const totalMRR = subscriptionBreakdown.reduce((sum, s) => sum + Number(s.revenue), 0);

    return NextResponse.json({
      overview: {
        totalRestaurants,
        activeRestaurants,
        totalPlans,
        recentRestaurants,
        totalMRR,
      },
      subscriptionBreakdown,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json({ error: 'Failed to get analytics' }, { status: 500 });
  }
}
