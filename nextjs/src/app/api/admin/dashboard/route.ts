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

    // --- Common queries for all roles ---
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

    // --- Role-specific data ---
    const role = session.role;
    let roleData: Record<string, unknown> = {};

    if (role === 'admin' || role === 'manager') {
      // Staff counts by role for admin/manager dashboards
      const staffByRole = await prisma.adminUser.groupBy({
        by: ['role'],
        where: { tenantId: session.tenantId, isActive: true },
        _count: { id: true },
      });

      const totalSections = await prisma.section.count({
        where: { tenantId: session.tenantId },
      });

      const publishedMenus = await prisma.menu.count({
        where: { tenantId: session.tenantId, status: 'published' },
      });

      roleData = {
        staffByRole: staffByRole.map((s) => ({
          role: s.role,
          count: s._count.id,
        })),
        totalStaff: staffByRole.reduce((sum, s) => sum + s._count.id, 0),
        totalSections,
        publishedMenus,
        draftMenus: totalMenus - publishedMenus,
      };
    }

    if (role === 'chef') {
      // Chef gets item counts and ingredient/allergen info
      const totalSections = await prisma.section.count({
        where: { tenantId: session.tenantId },
      });

      roleData = {
        totalSections,
        // Placeholder order queue stats (expand when orders are implemented)
        orderQueue: { pending: 0, inProgress: 0, ready: 0 },
        completedToday: 0,
      };
    }

    if (role === 'waiter') {
      // Waiter gets menu overview for customer questions
      const totalSections = await prisma.section.count({
        where: { tenantId: session.tenantId },
      });

      roleData = {
        totalSections,
        // Placeholder order stats (expand when orders are implemented)
        myActiveOrders: 0,
        todayOrdersServed: 0,
        todayCovers: 0,
      };
    }

    return NextResponse.json({
      role,
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
      ...roleData,
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
