import { SignJWT, jwtVerify, JWTPayload as JoseJWTPayload } from 'jose';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key'
);

export interface SessionPayload {
  id: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as JoseJWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('platform-token')?.value;
  
  if (!token) return null;
  
  return verifyToken(token);
}

export async function getPlatformAdmin(email: string) {
  return prisma.platformAdmin.findUnique({
    where: { email },
  });
}
