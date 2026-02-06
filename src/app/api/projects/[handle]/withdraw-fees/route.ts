import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withdrawPlatformFees } from "@/lib/contract";


export const runtime = 'edge';

// POST /api/projects/[handle]/withdraw-fees - Withdraw accumulated 1% platform fees
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const body = await request.json();
    // Only platform fee recipient can withdraw (checked in contract)

    const supabase = await createClient();

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, project_handle")
      .eq("project_handle", handle)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Withdraw platform fees on-chain
    const txHash = await withdrawPlatformFees(project.id);

    // Update vote_fees table to mark as collected
    const { error: updateError } = await supabase
      .from("vote_fees")
      .update({ collected: true, collected_at: new Date().toISOString(), tx_hash: txHash })
      .eq("project_id", project.id)
      .eq("collected", false);

    if (updateError) {
      console.error("Failed to update vote_fees:", updateError);
    }

    return NextResponse.json({
      success: true,
      tx_hash: txHash,
      message: "Platform fees withdrawn successfully",
    });
  } catch (error) {
    console.error("Withdraw fees error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to withdraw fees" },
      { status: 500 }
    );
  }
}
