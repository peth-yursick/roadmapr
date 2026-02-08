/**
 * API Utility Functions
 * Shared helpers for Next.js API routes to reduce code duplication
 */

import { NextResponse } from "next/server";

/**
 * Standard API error response format
 */
export interface ApiError {
  error: string;
  details?: unknown;
}

/**
 * Standard API success response format
 */
export interface ApiSuccess<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Create a standardized error response
 */
export function apiErrorResponse(
  message: string,
  status: number = 500,
  details?: Record<string, unknown>
): NextResponse<ApiError> {
  return NextResponse.json(
    { error: message, ...(details && { details }) },
    { status }
  );
}

/**
 * Create a standardized success response
 */
export function apiSuccessResponse<T>(
  data?: T,
  message?: string
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
  });
}

/**
 * Calculate total weight from votes array
 * Common pattern used across multiple API routes
 */
export function calculateTotalWeight(votes: unknown[] | null | undefined): number {
  if (!votes || votes.length === 0) return 0;
  return votes.reduce((sum: number, v: unknown) => {
    const weight = (v as { weight?: string | number }).weight;
    return sum + (typeof weight === 'number' ? weight : parseFloat(weight || '0'));
  }, 0);
}

/**
 * Validate and parse FID from request
 */
export function getFidFromRequest(
  fid: string | number | null | undefined
): number | null {
  if (!fid) return null;
  const parsed = typeof fid === 'string' ? parseInt(fid, 10) : fid;
  return isNaN(parsed) ? null : parsed;
}

/**
 * Common Supabase error handler
 */
export function handleSupabaseError(error: { message: string; code?: string }): NextResponse<ApiError> {
  // Handle specific Supabase error codes
  if (error.code === 'PGRST116') {
    return apiErrorResponse('Resource not found', 404);
  }
  if (error.code === '23505') {
    return apiErrorResponse('Resource already exists', 409);
  }
  if (error.code === '23503') {
    return apiErrorResponse('Foreign key constraint violation', 400);
  }

  return apiErrorResponse(error.message || 'Database operation failed', 500);
}

/**
 * Wrap an async handler with try-catch error handling
 */
export function withApiHandler<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiError>> {
  return handler().catch((error: unknown) => {
    console.error('[API] Unhandled error:', error);

    if (error instanceof Error) {
      return apiErrorResponse(error.message, 500);
    }

    return apiErrorResponse('An unexpected error occurred', 500);
  });
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): { valid: boolean; missing?: string[] } {
  const missing = requiredFields.filter(field => !body[field]);

  return {
    valid: missing.length === 0,
    ...(missing.length > 0 && { missing }),
  };
}
