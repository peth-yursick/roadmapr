import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminFromHeader, isAuthorizedMarker } from "@/lib/auth-tokens";

export const runtime = 'edge';

/**
 * Admin endpoint to register any project in the smart contract
 * This is useful for registering official projects like Farcaster
 *
 * POST /api/admin/register-project
 * Body: { projectHandle, tokenAddress, voteIncrement }
 * Headers: Authorization: Bearer <admin_jwt_token>
 *
 * SECURITY: Protected by JWT token - call /api/admin/generate-token first
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin JWT token from Authorization header
    const authHeader = request.headers.get("authorization");
    const admin = await getAdminFromHeader(authHeader);

    if (!admin || !admin.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required. Include valid JWT token in Authorization header." },
        { status: 401 }
      );
    }

    // Double-check FID authorization as defense in depth
    if (!isAuthorizedMarker(admin.fid)) {
      return NextResponse.json(
        { error: "Forbidden. Your account is not authorized for admin operations." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { projectHandle, tokenAddress, voteIncrement } = body;

    if (!projectHandle || !tokenAddress || !voteIncrement) {
      return NextResponse.json(
        { error: "projectHandle, tokenAddress, and voteIncrement are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get project by handle
    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("project_handle", projectHandle)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update project with token voting configuration
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        token_address: tokenAddress,
        vote_increment: voteIncrement,
        vote_increment_usd: 0.01, // Default USD value
        chain: "base",
        voting_type: "token",
      })
      .eq("id", project.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        handle: project.project_handle,
        tokenAddress,
        voteIncrement,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to register project";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
