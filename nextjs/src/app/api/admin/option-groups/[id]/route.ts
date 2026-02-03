import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('option.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;

    const optionGroup = await prisma.optionGroup.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        translations: true,
        menu: { include: { translations: true } },
        options: {
          include: {
            translations: true,
            price: true,
            allergens: { include: { allergen: { include: { translations: true } } } },
          },
          orderBy: { displayOrder: 'asc' },
        },
        items: {
          include: {
            item: { include: { translations: true } },
          },
        },
      },
    });

    if (!optionGroup) {
      return NextResponse.json({ error: 'Option group not found' }, { status: 404 });
    }

    return NextResponse.json({ optionGroup });
  } catch (error) {
    console.error('Get option group error:', error);
    return NextResponse.json({ error: 'Failed to get option group' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('option.update');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;
    const {
      code,
      selectionMode,
      minSelect,
      maxSelect,
      isRequired,
      displayOrder,
      isActive,
      translations,
    } = await req.json();

    const existing = await prisma.optionGroup.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Option group not found' }, { status: 404 });
    }

    const optionGroup = await prisma.$transaction(async (tx) => {
      // Update translations if provided
      if (translations?.length > 0) {
        await tx.optionGroupI18n.deleteMany({ where: { optionGroupId: id } });
        await tx.optionGroupI18n.createMany({
          data: translations.map((t: { locale: string; name: string; description?: string }) => ({
            tenantId: session.tenantId,
            optionGroupId: id,
            locale: t.locale,
            name: t.name,
            description: t.description || null,
          })),
        });
      }

      return tx.optionGroup.update({
        where: { id },
        data: {
          code: code !== undefined ? code : undefined,
          selectionMode: selectionMode !== undefined ? selectionMode : undefined,
          minSelect: minSelect !== undefined ? minSelect : undefined,
          maxSelect: maxSelect !== undefined ? maxSelect : undefined,
          isRequired: isRequired !== undefined ? isRequired : undefined,
          displayOrder: displayOrder !== undefined ? displayOrder : undefined,
          isActive: isActive !== undefined ? isActive : undefined,
        },
        include: {
          translations: true,
          options: { include: { translations: true, price: true } },
        },
      });
    });

    return NextResponse.json({ optionGroup });
  } catch (error) {
    console.error('Update option group error:', error);
    return NextResponse.json({ error: 'Failed to update option group' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('option.delete');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;

    const existing = await prisma.optionGroup.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Option group not found' }, { status: 404 });
    }

    await prisma.optionGroup.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete option group error:', error);
    return NextResponse.json({ error: 'Failed to delete option group' }, { status: 500 });
  }
}
