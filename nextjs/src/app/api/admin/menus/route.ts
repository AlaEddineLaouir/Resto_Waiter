import { NextResponse } from 'next/server';
import { getRestaurantSession } from '@/lib/restaurant-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId');

    const menus = await prisma.menu.findMany({
      where: {
        tenantId: session.tenantId,
        ...(brandId && { brandId }),
      },
      include: {
        brand: { select: { id: true, name: true } },
        translations: true,
        _count: { 
          select: { 
            menuSections: true, 
            publications: true,
            lines: { where: { lineType: 'section' } },
          } 
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ menus });
  } catch (error) {
    console.error('Get menus error:', error);
    return NextResponse.json({ error: 'Failed to get menus' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getRestaurantSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brandId, code, translations, currency, priceTaxPolicy, defaultLocale } = await req.json();

    if (!brandId || !code) {
      return NextResponse.json({ error: 'Brand and code are required' }, { status: 400 });
    }

    // Verify brand belongs to tenant
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, tenantId: session.tenantId },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Invalid brand' }, { status: 400 });
    }

    // Create menu with draft status directly (no separate version)
    const menu = await prisma.menu.create({
      data: {
        tenantId: session.tenantId,
        brandId,
        code: code.toUpperCase(),
        currency,
        priceTaxPolicy,
        defaultLocale,
        status: 'draft', // New menus start as draft
        translations: translations?.length > 0 ? {
          create: translations.map((t: { locale: string; name: string; description?: string }) => ({
            tenantId: session.tenantId,
            locale: t.locale,
            name: t.name,
            description: t.description,
          })),
        } : undefined,
      },
      include: {
        brand: { select: { id: true, name: true } },
        translations: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: 'CREATE',
        entityType: 'menu',
        entityId: menu.id,
        newValues: { code, brandId, translations, status: 'draft' },
      },
    });

    return NextResponse.json({ menu }, { status: 201 });
  } catch (error) {
    console.error('Create menu error:', error);
    return NextResponse.json({ error: 'Failed to create menu' }, { status: 500 });
  }
}
