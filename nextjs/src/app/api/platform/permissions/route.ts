import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET all permissions
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await prisma.systemPermission.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    // Group by category
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }
      acc[perm.category].push(perm);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return NextResponse.json({ permissions, grouped });
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json({ error: 'Failed to get permissions' }, { status: 500 });
  }
}

// POST create new permission
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { key, label, description, category, sortOrder } = body;

    if (!key || !label || !category) {
      return NextResponse.json(
        { error: 'Key, label, and category are required' },
        { status: 400 }
      );
    }

    // Check for duplicate key
    const existing = await prisma.systemPermission.findUnique({
      where: { key },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Permission key already exists' },
        { status: 400 }
      );
    }

    const permission = await prisma.systemPermission.create({
      data: {
        key,
        label,
        description: description || null,
        category,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json({ permission }, { status: 201 });
  } catch (error) {
    console.error('Create permission error:', error);
    return NextResponse.json({ error: 'Failed to create permission' }, { status: 500 });
  }
}
