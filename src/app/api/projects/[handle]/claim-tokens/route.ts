import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/projects/[handle]/claim-tokens - Claim upvote tokens for a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const body = await request.json();
    const { claimer_address } = body;

    if (!claimer_address) {
      return NextResponse.json(
        { error: "claimer_address is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, project_handle, total_tokens_claimable")
      .eq("project_handle", handle)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if there are tokens to claim
    if (!project.total_tokens_claimable || project.total_tokens_claimable <= 0) {
      return NextResponse.json(
        { error: "No tokens available to claim" },
        { status: 400 }
      );
    }

    // Get all unclaimed votes for this project
    const { data: unclaimedVotes, error: votesError } = await supabase
      .from("project_votes")
      .select("id, voter_address, tokens_locked, token_address")
      .eq("project_id", project.id)
      .eq("claimed_by_owner", false)
      .gt("tokens_locked", 0);

    if (votesError) {
      return NextResponse.json(
        { error: "Failed to fetch votes" },
        { status: 500 }
      );
    }

    if (!unclaimedVotes || unclaimedVotes.length === 0) {
      return NextResponse.json(
        { error: "No tokens available to claim" },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = unclaimedVotes.reduce(
      (sum, vote) => sum + Number(vote.tokens_locked),
      0
    );

    // In production, you would:
    // 1. Call your smart contract to transfer tokens from escrow to claimer_address
    // 2. Get the transaction hash
    // 3. Store the transaction hash

    // For now, mark as claimed (in production, add tx_hash after contract call)
    const voteIds = unclaimedVotes.map((v) => v.id);
    const { error: updateError } = await supabase
      .from("project_votes")
      .update({
        claimed_by_owner: true,
        claim_tx_hash: null, // Add actual tx_hash after contract call
      })
      .in("id", voteIds);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to mark votes as claimed" },
        { status: 500 }
      );
    }

    // Record the claim
    const { error: claimRecordError } = await supabase
      .from("token_claims")
      .insert({
        project_id: project.id,
        claimer_fid: 0, // Project owner (would be passed from auth in production)
        claimer_address,
        amount: totalAmount,
        token_address: unclaimedVotes[0]?.token_address || "0x0",
        tx_hash: null, // Add actual tx_hash after contract call
      });

    if (claimRecordError) {
      console.error("Failed to record claim:", claimRecordError);
    }

    return NextResponse.json({
      success: true,
      amount_claimed: totalAmount,
      votes_claimed: voteIds.length,
    });
  } catch (err) {
    console.error("Claim tokens error:", err);
    return NextResponse.json(
      { error: "Failed to claim tokens" },
      { status: 500 }
    );
  }
}

// GET /api/projects/[handle]/claim-tokens - Get claimable tokens info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const supabase = await createClient();

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, total_tokens_claimable")
      .eq("project_handle", handle)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get unclaimed votes count
    const { count, error: countError } = await supabase
      .from("project_votes")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id)
      .eq("claimed_by_owner", false)
      .gt("tokens_locked", 0);

    if (countError) {
      return NextResponse.json(
        { error: "Failed to fetch claim info" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      total_tokens_claimable: project.total_tokens_claimable || 0,
      unclaimed_votes: count || 0,
    });
  } catch (err) {
    console.error("Get claim info error:", err);
    return NextResponse.json(
      { error: "Failed to get claim info" },
      { status: 500 }
    );
  }
}
