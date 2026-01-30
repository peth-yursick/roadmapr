import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/projects/vote - Vote on a project (upvote or downvote)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      voter_fid,
      voter_address,
      is_upvote = true,
      vote_amount = 0,
      tx_hash = null,
      token_address = null,
    } = body;

    if (!project_id || !voter_fid) {
      return NextResponse.json(
        { error: "project_id and voter_fid are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if project exists
    const { data: project } = await supabase
      .from("projects")
      .select("id, total_votes, vote_count")
      .eq("id", project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if already voted
    const { data: existingVote } = await supabase
      .from("project_votes")
      .select("*")
      .eq("project_id", project_id)
      .eq("voter_fid", voter_fid)
      .single();

    if (existingVote) {
      return NextResponse.json(
        { error: "Already voted on this project" },
        { status: 400 }
      );
    }

    // Create vote record
    const { error: voteError } = await supabase
      .from("project_votes")
      .insert({
        project_id,
        voter_fid,
        voter_address: voter_address || null,
        vote_amount,
        is_upvote: is_upvote,
        tx_hash,
        token_address: token_address || null,
        tokens_locked: vote_amount, // Full amount locked (not just fee)
      });

    if (voteError) {
      return NextResponse.json({ error: voteError.message }, { status: 500 });
    }

    // Get updated vote count
    const { data: updatedProject } = await supabase
      .from("projects")
      .select("total_votes, vote_count")
      .eq("id", project_id)
      .single();

    return NextResponse.json({
      success: true,
      total_votes: updatedProject?.total_votes || 0,
      vote_count: updatedProject?.vote_count || 0,
    });
  } catch (err) {
    console.error("Project vote error:", err);
    return NextResponse.json(
      { error: "Failed to vote on project" },
      { status: 500 }
    );
  }
}
