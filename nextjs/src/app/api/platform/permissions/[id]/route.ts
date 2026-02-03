import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET single permission
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const permission = await prisma.systemPermission.findUnique({
      where: { id },
    });

    if (!permission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
    }

    return NextResponse.json({ permission });
  } catch (error) {
    console.error('Get permission error:', error);
    return NextResponse.json({ error: 'Failed to get permission' }, { status: 500 });
  }
}

// PUT update permission
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { key, label, description, category, sortOrder, isActive } = body;

    const permission = await prisma.systemPermission.update({
      where: { id },
      data: {
        ...(key && { key }),
        ...(label && { label }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ permission });
  } catch (error) {
    console.error('Update permission error:', error);
    return NextResponse.json({ error: 'Failed to update permission' }, { status: 500 });
  }
}

// DELETE permission
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.systemPermission.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete permission error:', error);
    return NextResponse.json({ error: 'Failed to delete permission' }, { status: 500 });
  }
}
