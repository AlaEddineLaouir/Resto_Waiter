import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/t/[tenantId]/table-session/[code]
// Get session details with orders
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; code: string }> }
) {
  try {
    const { tenantId: tenantSlug, code } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const session = await prisma.tableSession.findUnique({
      where: { sessionCode: code },
      include: {
        table: { select: { label: true, friendlyName: true } },
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!session || session.tenantId !== tenant.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
