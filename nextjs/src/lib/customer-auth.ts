/**
 * Customer Authentication Helper
 *
 * Handles JWT-based auth for restaurant customers (guests / registered users).
 * Stored in a `customer-token` cookie scoped to the tenant path.
 */

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'customer-secret-change-in-production'
);

const COOKIE_NAME = 'customer-token';
const TOKEN_EXPIRY = '30d'; // customers stay logged in longer

export interface CustomerPayload {
  customerId: string;
  tenantId: string;
  email: string;
  name: string | null;
}

export async function createCustomerToken(payload: CustomerPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyCustomerToken(token: string): Promise<CustomerPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as CustomerPayload;
  } catch {
    return null;
  }
}

/**
 * Get current customer session from cookies (server-side).
 */
export async function getCustomerSession(): Promise<CustomerPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyCustomerToken(token);
}

/**
 * Set the customer cookie (server-side).
 */
export async function setCustomerCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}
