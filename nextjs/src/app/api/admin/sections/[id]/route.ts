import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('section.read');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;

    const section = await prisma.section.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        translations: true,
        items: {
          include: {
            translations: true,
            priceBase: true,
            allergens: { include: { allergen: true } },
            dietaryFlags: { include: { dietaryFlag: true } },
          },
        },
      },
    });

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    return NextResponse.json({ section });
  } catch (error) {
    console.error('Get section error:', error);
    return NextResponse.json({ error: 'Failed to get section' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('section.update');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;
    const { translations, displayOrder, isActive } = await req.json();

    const existing = await prisma.section.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { translations: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const section = await prisma.$transaction(async (tx) => {
      // Update translations
      if (translations?.length > 0) {
        await tx.sectionI18n.deleteMany({ where: { sectionId: id } });
        await tx.sectionI18n.createMany({
          data: translations.map((t: { locale: string; title: string; description?: string }) => ({
            tenantId: session.tenantId,
            sectionId: id,
            locale: t.locale,
            title: t.title,
            description: t.description,
          })),
        });
      }

      // When section is deactivated, disable all menu lines that reference this section
      // and all child item lines within those sections
      if (isActive !== undefined && isActive !== existing.isActive) {
        // Get all section MenuLines for this section
        const sectionLines = await tx.menuLine.findMany({
          where: { tenantId: session.tenantId, sectionId: id, lineType: 'section' },
          select: { id: true },
        });

        // Disable the section lines
        await tx.menuLine.updateMany({
          where: { tenantId: session.tenantId, sectionId: id, lineType: 'section' },
          data: { isEnabled: isActive },
        });

        // Disable all child item lines (items nested under these section lines)
        if (sectionLines.length > 0) {
          const sectionLineIds = sectionLines.map((l) => l.id);
          await tx.menuLine.updateMany({
            where: {
              tenantId: session.tenantId,
              parentLineId: { in: sectionLineIds },
              lineType: 'item',
            },
            data: { isEnabled: isActive },
          });
        }
      }

      return tx.section.update({
        where: { id },
        data: {
          isActive,
        },
        include: { translations: true },
      });
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'UPDATE',
        entityType: 'section',
        entityId: section.id,
        oldValues: existing,
        newValues: { translations, displayOrder, isActive },
      },
    });

    return NextResponse.json({ section });
  } catch (error) {
    console.error('Update section error:', error);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission('section.delete');
    if (!guard.authorized) return guard.response;
    const session = guard.user!;

    const { id } = await params;

    const existing = await prisma.section.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    await prisma.section.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'DELETE',
        entityType: 'section',
        entityId: id,
        oldValues: existing,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete section error:', error);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
}
