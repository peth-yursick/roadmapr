import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimFeatureTokens } from "@/lib/contract";


export const runtime = 'edge';

// POST /api/features/[id]/claim - Claim tokens from a shipped feature
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { claimer_fid } = body;

    if (!claimer_fid) {
      return NextResponse.json(
        { error: "claimer_fid is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get feature and project info
    const { data: feature } = await supabase
      .from("features")
      .select("id, title, project_id, status, tokens_claimable")
      .eq("id", id)
      .single();

    if (!feature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    // Check if feature is shipped
    if (feature.status !== "shipped") {
      return NextResponse.json(
        { error: "Can only claim tokens from shipped features" },
        { status: 400 }
      );
    }

    // Check if user is project admin
    const { data: admin } = await supabase
      .from("project_admins")
      .select("id, role")
      .eq("project_id", feature.project_id)
      .eq("fid", claimer_fid)
      .single();

    if (!admin) {
      return NextResponse.json(
        { error: "Not authorized to claim tokens for this project" },
        { status: 403 }
      );
    }

    // Get all votes for this feature that haven't been claimed
    const { data: votes } = await supabase
      .from("votes")
      .select("id, voter_address, tokens_locked")
      .eq("feature_id", id)
      .gt("tokens_locked", 0)
      .eq("claimed_by_owner", false);

    if (!votes || votes.length === 0) {
      return NextResponse.json(
        { error: "No tokens available to claim" },
        { status: 400 }
      );
    }

    // Extract voter addresses
    const voterAddresses = votes
      .map((v) => v.voter_address)
      .filter((addr): addr is string => addr !== null);

    if (voterAddresses.length === 0) {
      return NextResponse.json(
        { error: "No valid voter addresses found" },
        { status: 400 }
      );
    }

    // Claim tokens on-chain
    const txHash = await claimFeatureTokens(id, voterAddresses as `0x${string}`[]);

    // Mark votes as claimed in database
    const voteIds = votes.map((v) => v.id);
    const { error: updateError } = await supabase
      .from("votes")
      .update({
        claimed_by_owner: true,
        claim_tx_hash: txHash,
      })
      .in("id", voteIds);

    if (updateError) {
      console.error("Failed to update votes:", updateError);
    }

    // Record the claim
    const { error: claimRecordError } = await supabase
      .from("token_claims")
      .insert({
        feature_id: id,
        project_id: feature.project_id,
        claimer_fid,
        claimer_address: "", // Would be project owner's address
        amount: feature.tokens_claimable || 0,
        token_address: "", // Would get from project
        tx_hash: txHash,
      });

    if (claimRecordError) {
      console.error("Failed to record claim:", claimRecordError);
    }

    return NextResponse.json({
      success: true,
      tx_hash: txHash,
      amount_claimed: feature.tokens_claimable || 0,
      votes_claimed: voteIds.length,
    });
  } catch (error) {
    console.error("Claim tokens error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to claim tokens" },
      { status: 500 }
    );
  }
}
