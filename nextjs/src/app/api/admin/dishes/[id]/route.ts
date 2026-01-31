import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const dish = await prisma.dish.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
        deletedAt: null,
      },
      include: {
        category: { select: { id: true, name: true } },
        ingredients: {
          include: { ingredient: true },
        },
      },
    });

    if (!dish) {
      return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
    }

    return NextResponse.json({ dish });
  } catch (error) {
    console.error('Get dish error:', error);
    return NextResponse.json({ error: 'Failed to get dish' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.dish.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const name = formData.get('name') as string | null;
    const description = formData.get('description') as string | null;
    const priceStr = formData.get('price') as string | null;
    const categoryId = formData.get('categoryId') as string | null;
    const isVegetarian = formData.get('isVegetarian');
    const isAvailable = formData.get('isAvailable');
    const allergensStr = formData.get('allergens') as string | null;
    const image = formData.get('image') as File | null;

    // Handle image upload
    let imageUrl: string | undefined;
    if (image && image.size > 0) {
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      // Delete old image if exists
      if (existing.imageUrl) {
        const oldPath = join(process.cwd(), 'public', existing.imageUrl);
        if (existsSync(oldPath)) {
          await unlink(oldPath).catch(() => {});
        }
      }

      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-${image.name}`;
      const filepath = join(uploadDir, filename);
      await writeFile(filepath, buffer);
      imageUrl = `/uploads/${filename}`;
    }

    const dish = await prisma.dish.update({
      where: { id },
      data: {
        ...(name !== null && { name }),
        ...(description !== null && { description }),
        ...(priceStr !== null && { price: parseFloat(priceStr) }),
        ...(categoryId !== null && { categoryId }),
        ...(isVegetarian !== null && { isVegetarian: isVegetarian === 'true' }),
        ...(isAvailable !== null && { isAvailable: isAvailable === 'true' }),
        ...(allergensStr !== null && { allergens: JSON.parse(allergensStr) }),
        ...(imageUrl && { imageUrl }),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'UPDATE',
        entityType: 'dish',
        entityId: id,
        oldValues: { name: existing.name, price: existing.price },
        newValues: { name: dish.name, price: dish.price },
      },
    });

    return NextResponse.json({ dish });
  } catch (error) {
    console.error('Update dish error:', error);
    return NextResponse.json({ error: 'Failed to update dish' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.dish.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
    }

    // Soft delete
    await prisma.dish.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'DELETE',
        entityType: 'dish',
        entityId: id,
        oldValues: { name: existing.name },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete dish error:', error);
    return NextResponse.json({ error: 'Failed to delete dish' }, { status: 500 });
  }
}
