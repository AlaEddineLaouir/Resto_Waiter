import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/t/[tenantId]/table-session
// Creates or resumes a table session for a given table
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId: tenantSlug } = await params;
    const body = await request.json();
    const { tableLabel, locationSlug } = body;

    if (!tableLabel || !locationSlug) {
      return NextResponse.json(
        { error: 'tableLabel and locationSlug are required' },
        { status: 400 }
      );
    }

    // Find tenant by slug
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Find location by slug
    const location = await prisma.location.findFirst({
      where: { tenantId: tenant.id, slug: locationSlug, isActive: true },
      select: { id: true },
    });
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Find the floor table by label in any active published layout for this location
    const floorTable = await prisma.floorTable.findFirst({
      where: {
        tenantId: tenant.id,
        label: tableLabel,
        isActive: true,
        layout: {
          locationId: location.id,
          status: 'published',
        },
      },
      select: { id: true, label: true, layoutId: true },
    });
    if (!floorTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Check for existing open session at this table
    const existingSession = await prisma.tableSession.findFirst({
      where: {
        tenantId: tenant.id,
        tableId: floorTable.id,
        status: 'open',
      },
      select: {
        id: true,
        sessionCode: true,
        status: true,
        guestCount: true,
        openedAt: true,
      },
    });

    if (existingSession) {
      return NextResponse.json({
        session: existingSession,
        resumed: true,
      });
    }

    // Generate a unique session code (6 chars alphanumeric)
    const sessionCode = generateSessionCode();

    const newSession = await prisma.tableSession.create({
      data: {
        tenantId: tenant.id,
        locationId: location.id,
        tableId: floorTable.id,
        sessionCode,
        status: 'open',
        guestCount: 1,
      },
      select: {
        id: true,
        sessionCode: true,
        status: true,
        guestCount: true,
        openedAt: true,
      },
    });

    return NextResponse.json({
      session: newSession,
      resumed: false,
    });
  } catch (error) {
    console.error('Error creating table session:', error);
    return NextResponse.json(
      { error: 'Failed to create table session' },
      { status: 500 }
    );
  }
}

function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 for readability
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
