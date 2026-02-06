import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNeynarScore } from "@/lib/neynar";

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { feature_id, voter_fid, direction } = body;

    if (!feature_id || !voter_fid || !direction) {
      return NextResponse.json(
        { error: "feature_id, voter_fid, and direction are required" },
        { status: 400 }
      );
    }

    if (!["up", "down", "remove"].includes(direction)) {
      return NextResponse.json(
        { error: "direction must be 'up', 'down', or 'remove'" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Remove vote
    if (direction === "remove") {
      await supabase
        .from("votes")
        .delete()
        .eq("feature_id", feature_id)
        .eq("voter_fid", voter_fid);

      // Recalculate total weight
      const { data: votes } = await supabase
        .from("votes")
        .select("weight")
        .eq("feature_id", feature_id);

      const totalWeight = (votes || []).reduce((sum, v) => sum + Number(v.weight), 0);

      // Get current feature status
      const { data: feature } = await supabase
        .from("features")
        .select("status")
        .eq("id", feature_id)
        .single();

      const newStatus = totalWeight < 0 ? "hidden" : (feature?.status === "hidden" ? "open" : undefined);

      await supabase
        .from("features")
        .update({
          total_weight: totalWeight,
          ...(newStatus && { status: newStatus }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", feature_id);

      return NextResponse.json({ total_weight: totalWeight, user_vote: null });
    }

    // Get Neynar score for vote weight
    let score: number;
    try {
      score = await getNeynarScore(voter_fid);
    } catch {
      // Fallback for development/when Neynar is unavailable
      score = 1;
    }

    if (score <= 0) {
      return NextResponse.json(
        { error: "Need a Neynar score > 0 to vote" },
        { status: 403 }
      );
    }

    const weight = direction === "up" ? score : -score;

    // Upsert vote
    const { error: voteError } = await supabase.from("votes").upsert(
      {
        feature_id,
        voter_fid,
        weight,
        voting_power_source: "neynar_score",
      },
      { onConflict: "feature_id,voter_fid" }
    );

    if (voteError) {
      return NextResponse.json({ error: voteError.message }, { status: 500 });
    }

    // Recalculate total weight
    const { data: votes } = await supabase
      .from("votes")
      .select("weight")
      .eq("feature_id", feature_id);

    const totalWeight = (votes || []).reduce((sum, v) => sum + Number(v.weight), 0);

    // Get current feature status
    const { data: feature } = await supabase
      .from("features")
      .select("status")
      .eq("id", feature_id)
      .single();

    const updateData: { total_weight: number; updated_at: string; status?: string } = {
      total_weight: totalWeight,
      updated_at: new Date().toISOString(),
    };

    if (totalWeight < 0) {
      updateData.status = "hidden";
    } else if (feature?.status === "hidden") {
      updateData.status = "open";
    }

    await supabase
      .from("features")
      .update(updateData)
      .eq("id", feature_id);

    return NextResponse.json({ total_weight: totalWeight, user_vote: weight });
  } catch (err) {
    console.error("Vote error:", err);
    return NextResponse.json({ error: "Failed to process vote" }, { status: 500 });
  }
}
