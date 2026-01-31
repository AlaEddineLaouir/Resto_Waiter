import { createHmac, timingSafeEqual } from 'crypto';
import config from '../config/index.js';

/**
 * Simple JWT implementation without external dependencies
 * For production, consider using the 'jsonwebtoken' package
 */

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Generate a JWT token
 */
export function generateToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = config.jwtExpiresIn;
  let expSeconds = 24 * 60 * 60; // default 24h
  
  if (expiresIn.endsWith('h')) {
    expSeconds = parseInt(expiresIn) * 60 * 60;
  } else if (expiresIn.endsWith('d')) {
    expSeconds = parseInt(expiresIn) * 24 * 60 * 60;
  } else if (expiresIn.endsWith('m')) {
    expSeconds = parseInt(expiresIn) * 60;
  }
  
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expSeconds,
  };
  
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(tokenPayload));
  
  const signature = createHmac('sha256', config.jwtSecret)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const [headerEncoded, payloadEncoded, signature] = parts;
    
    // Verify signature
    const expectedSignature = createHmac('sha256', config.jwtSecret)
      .update(`${headerEncoded}.${payloadEncoded}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    
    if (signatureBuffer.length !== expectedBuffer.length || 
        !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }
    
    // Decode payload
    const payload = JSON.parse(base64UrlDecode(payloadEncoded));
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Express middleware to authenticate JWT
 */
export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.user = payload;
  next();
}

/**
 * Optional authentication - sets user if token present but doesn't require it
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  
  next();
}
