import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = 'edge';

// Authorized admin FIDs from environment
const AUTHORIZED_MARKER_FIDS = process.env.NEXT_PUBLIC_AUTHORIZED_MARKER_FIDS
  ? process.env.NEXT_PUBLIC_AUTHORIZED_MARKER_FIDS.split(",").map(Number)
  : [];

/**
 * Admin endpoint to register any project in the smart contract
 * This is useful for registering official projects like Farcaster
 *
 * POST /api/admin/register-project
 * Body: { projectHandle, tokenAddress, voteIncrement, privateKey }
 *
 * SECURITY: Protected by NEXT_PUBLIC_AUTHORIZED_MARKER_FIDS
 */
export async function POST(request: NextRequest) {
  try {
    // Get user FID from headers (set by middleware/auth.ts if present)
    const userFid = request.headers.get("x-user-fid");
    const fid = userFid ? parseInt(userFid, 10) : null;

    // Check authorization
    if (!fid || !AUTHORIZED_MARKER_FIDS.includes(fid)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
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
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to register project" },
      { status: 500 }
    );
  }
}
