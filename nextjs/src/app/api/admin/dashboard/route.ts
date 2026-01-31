import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      tenant,
      totalCategories,
      totalDishes,
      totalIngredients,
      todayUsage,
      monthlyUsage,
      recentSessions,
    ] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: session.tenantId },
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      }),
      prisma.category.count({
        where: { tenantId: session.tenantId, deletedAt: null },
      }),
      prisma.dish.count({
        where: { tenantId: session.tenantId, deletedAt: null },
      }),
      prisma.ingredient.count({
        where: { tenantId: session.tenantId },
      }),
      prisma.usageAnalytics.findFirst({
        where: { restaurantId: session.tenantId, date: today },
      }),
      prisma.usageAnalytics.aggregate({
        where: {
          restaurantId: session.tenantId,
          date: { gte: thirtyDaysAgo },
        },
        _sum: {
          apiCalls: true,
          chatSessions: true,
          menuViews: true,
          uniqueUsers: true,
        },
      }),
      prisma.chatSession.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          createdAt: true,
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return NextResponse.json({
      restaurant: {
        name: tenant?.name,
        slug: tenant?.slug,
        isActive: tenant?.isActive,
      },
      subscription: tenant?.subscription
        ? {
            plan: tenant.subscription.plan.name,
            status: tenant.subscription.status,
            endDate: tenant.subscription.endDate,
          }
        : null,
      stats: {
        totalCategories,
        totalDishes,
        totalIngredients,
        todayApiCalls: todayUsage?.apiCalls || 0,
        todayChatSessions: todayUsage?.chatSessions || 0,
        todayMenuViews: todayUsage?.menuViews || 0,
        monthlyApiCalls: monthlyUsage._sum.apiCalls || 0,
        monthlyChatSessions: monthlyUsage._sum.chatSessions || 0,
        monthlyMenuViews: monthlyUsage._sum.menuViews || 0,
        monthlyUniqueUsers: monthlyUsage._sum.uniqueUsers || 0,
      },
      recentSessions: recentSessions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        messageCount: s._count.messages,
      })),
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    return NextResponse.json({ error: 'Failed to get dashboard' }, { status: 500 });
  }
}
