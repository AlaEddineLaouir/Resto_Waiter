import { SignJWT, jwtVerify, JWTPayload as JoseJWTPayload } from 'jose';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key'
);

export interface RestaurantSession {
  id: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createRestaurantToken(payload: RestaurantSession): Promise<string> {
  return new SignJWT(payload as unknown as JoseJWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyRestaurantToken(token: string): Promise<RestaurantSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as RestaurantSession;
  } catch {
    return null;
  }
}

export async function getRestaurantSession(): Promise<RestaurantSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('restaurant-token')?.value;
  
  if (!token) return null;
  
  return verifyRestaurantToken(token);
}

export async function getRestaurantAdmin(tenantId: string, email: string) {
  return prisma.adminUser.findFirst({
    where: {
      tenantId,
      email: email.toLowerCase(),
      isActive: true,
    },
  });
}
