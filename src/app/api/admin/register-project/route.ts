import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = 'edge';

/**
 * Admin endpoint to register any project in the smart contract
 * This is useful for registering official projects like Farcaster
 *
 * POST /api/admin/register-project
 * Body: { projectHandle, tokenAddress, voteIncrement, privateKey }
 *
 * SECURITY: In production, this should be protected with proper authentication
 */
export async function POST(request: NextRequest) {
  try {
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

    // Note: The actual smart contract registration needs to be done separately
    // with a wallet. This endpoint just marks the project as ready for token voting.
    // For the actual on-chain registration, we would need a server wallet with
    // private key access, which should be handled securely.

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        handle: project.project_handle,
        tokenAddress,
        voteIncrement,
      },
      message: "Project updated with token voting configuration. Note: Smart contract registration requires a wallet transaction.",
    });
  } catch (err: any) {
    console.error("[Admin Register] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to register project" },
      { status: 500 }
    );
  }
}
