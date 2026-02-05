import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

export async function GET() {
  try {
    const guard = await requirePermission('dashboard.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      tenant,
      totalBrands,
      totalLocations,
      totalMenus,
      totalItems,
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
      prisma.brand.count({
        where: { tenantId: session.tenantId },
      }),
      prisma.location.count({
        where: { tenantId: session.tenantId },
      }),
      prisma.menu.count({
        where: { tenantId: session.tenantId },
      }),
      prisma.item.count({
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
        totalBrands,
        totalLocations,
        totalMenus,
        totalItems,
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
