import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(req: Request) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');

    const dishes = await prisma.dish.findMany({
      where: {
        tenantId: session.tenantId,
        deletedAt: null,
        ...(categoryId && { categoryId }),
      },
      include: {
        category: { select: { id: true, name: true } },
        ingredients: {
          include: { ingredient: true },
        },
      },
      orderBy: [{ categoryId: 'asc' }, { displayOrder: 'asc' }],
    });

    return NextResponse.json({ dishes });
  } catch (error) {
    console.error('Get dishes error:', error);
    return NextResponse.json({ error: 'Failed to get dishes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const categoryId = formData.get('categoryId') as string;
    const isVegetarian = formData.get('isVegetarian') === 'true';
    const isAvailable = formData.get('isAvailable') !== 'false';
    const allergensStr = formData.get('allergens') as string;
    const allergens = allergensStr ? JSON.parse(allergensStr) : [];
    const image = formData.get('image') as File | null;

    if (!name || !categoryId || isNaN(price)) {
      return NextResponse.json(
        { error: 'Name, category, and price are required' },
        { status: 400 }
      );
    }

    // Verify category belongs to tenant
    const category = await prisma.category.findFirst({
      where: { id: categoryId, tenantId: session.tenantId },
    });

    if (!category) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Handle image upload
    let imageUrl: string | null = null;
    if (image) {
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-${image.name}`;
      const filepath = join(uploadDir, filename);
      await writeFile(filepath, buffer);
      imageUrl = `/uploads/${filename}`;
    }

    // Get max display order
    const maxOrder = await prisma.dish.findFirst({
      where: { categoryId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    const dish = await prisma.dish.create({
      data: {
        tenantId: session.tenantId,
        categoryId,
        name,
        description,
        price,
        imageUrl,
        isVegetarian,
        isAvailable,
        allergens,
        displayOrder: (maxOrder?.displayOrder || 0) + 1,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'CREATE',
        entityType: 'dish',
        entityId: dish.id,
        newValues: { name, price },
      },
    });

    return NextResponse.json({ dish }, { status: 201 });
  } catch (error) {
    console.error('Create dish error:', error);
    return NextResponse.json({ error: 'Failed to create dish' }, { status: 500 });
  }
}
