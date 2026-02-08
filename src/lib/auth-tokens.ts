/**
 * JSON Web Token utilities for admin authentication
 * Generates and validates short-lived tokens for privileged operations
 */

import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'roadmapr-jwt-secret-change-in-production'
);

const JWT_ISSUER = 'roadmapr';
const JWT_AUDIENCE = 'roadmapr-admin';

export interface AdminTokenPayload {
  fid: number;
  address?: string;
  isAdmin: boolean;
}

/**
 * Generate a short-lived JWT token for authenticated admins
 * Tokens expire after 1 hour
 */
export async function generateAdminToken(payload: AdminTokenPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    fid: payload.fid,
    address: payload.address,
    isAdmin: payload.isAdmin,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(now + 60 * 60) // 1 hour
    .sign(JWT_SECRET);
}

/**
 * Verify and decode an admin JWT token
 * Returns the payload if valid, throws if invalid
 */
export async function verifyAdminToken(token: string): Promise<AdminTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    // Validate payload structure
    if (typeof payload.fid !== 'number') {
      throw new Error('Invalid token: missing or invalid fid');
    }

    return {
      fid: payload.fid as number,
      address: payload.address as string | undefined,
      isAdmin: payload.isAdmin as boolean ?? true,
    };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Extract and verify admin token from Authorization header
 * Format: "Bearer <token>"
 */
export async function getAdminFromHeader(
  authHeader: string | null
): Promise<AdminTokenPayload | null> {
  if (!authHeader) {
    return null;
  }

  // Extract token from "Bearer <token>" format
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) {
    return null;
  }

  const token = match[1];
  try {
    return await verifyAdminToken(token);
  } catch {
    return null;
  }
}

/**
 * Check if an FID is in the authorized marker list
 */
export function isAuthorizedMarker(fid: number): boolean {
  const authorizedFids = process.env.NEXT_PUBLIC_AUTHORIZED_MARKER_FIDS
    ? process.env.NEXT_PUBLIC_AUTHORIZED_MARKER_FIDS.split(',').map(Number)
    : [];

  return authorizedFids.includes(fid);
}
