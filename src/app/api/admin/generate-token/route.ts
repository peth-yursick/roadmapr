import { NextRequest, NextResponse } from "next/server";
import { generateAdminToken, isAuthorizedMarker } from "@/lib/auth-tokens";

export const runtime = 'edge';

/**
 * Generate an admin JWT token for authenticated authorized users
 *
 * POST /api/admin/generate-token
 * Body: { fid, signature?, message? }
 *
 * Returns a short-lived JWT token that can be used for admin operations
 * This token should be included in the Authorization header as "Bearer <token>"
 *
 * Note: In production, this should require a signature proving ownership of the FID.
 * For now, we check if the FID is in the authorized markers list.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid } = body;

    if (!fid || typeof fid !== 'number') {
      return NextResponse.json(
        { error: "FID is required" },
        { status: 400 }
      );
    }

    // Check if user is an authorized marker (admin)
    if (!isAuthorizedMarker(fid)) {
      return NextResponse.json(
        { error: "Unauthorized. Your FID is not in the authorized markers list." },
        { status: 403 }
      );
    }

    // Generate admin token
    const token = await generateAdminToken({
      fid,
      isAdmin: true,
    });

    return NextResponse.json({
      token,
      expiresIn: "1 hour",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate token";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
