import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNeynarUser } from "@/lib/neynar";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const voterFid = searchParams.get("voter_fid");
  const voterAddress = searchParams.get("voter_address");
  const includeDetails = searchParams.get("include_details") === "true";

  const supabase = await createClient();

  const { data: feature, error } = await supabase
    .from("features")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !feature) {
    return NextResponse.json({ error: "Feature not found" }, { status: 404 });
  }

  // Get user's vote
  let userVote = null;
  let userTokensLocked = null;

  if (voterFid) {
    const { data: vote } = await supabase
      .from("votes")
      .select("weight, tokens_locked")
      .eq("feature_id", id)
      .eq("voter_fid", parseInt(voterFid))
      .single();
    userVote = vote?.weight ?? null;
    userTokensLocked = vote?.tokens_locked ?? null;
  }

  if (voterAddress && userVote === null) {
    const { data: vote } = await supabase
      .from("votes")
      .select("weight, tokens_locked")
      .eq("feature_id", id)
      .eq("voter_address", voterAddress)
      .single();
    userVote = vote?.weight ?? null;
    userTokensLocked = vote?.tokens_locked ?? null;
  }

  // Get submitter info
  let submitter = null;
  if (feature.submitter_fid) {
    try {
      submitter = await getNeynarUser(feature.submitter_fid);
    } catch (err) {
      console.error("Failed to fetch submitter:", err);
    }
  }

  // Build response
  const response: Record<string, unknown> = {
    ...feature,
    user_vote: userVote,
    user_tokens_locked: userTokensLocked,
    submitter,
  };

  // Include additional details if requested
  if (includeDetails) {
    // Get project info
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", feature.project_id)
      .single();

    response.project = project;

    // Get feature sources
    const { data: sources } = await supabase
      .from("feature_sources")
      .select("*")
      .eq("feature_id", id)
      .order("added_at", { ascending: true });

    response.sources = sources || [];

    // Get sub-items
    const { data: subItems } = await supabase
      .from("features")
      .select("*")
      .eq("parent_feature_id", id)
      .eq("is_sub_item", true)
      .order("total_weight", { ascending: false });

    // Get user votes for sub-items
    if (subItems && subItems.length > 0 && (voterFid || voterAddress)) {
      const subItemIds = subItems.map((s) => s.id);
      let subItemVotes: Record<string, number> = {};

      if (voterFid) {
        const { data: votes } = await supabase
          .from("votes")
          .select("feature_id, weight")
          .eq("voter_fid", parseInt(voterFid))
          .in("feature_id", subItemIds);

        if (votes) {
          subItemVotes = Object.fromEntries(
            votes.map((v) => [v.feature_id, v.weight])
          );
        }
      }

      if (voterAddress) {
        const { data: votes } = await supabase
          .from("votes")
          .select("feature_id, weight")
          .eq("voter_address", voterAddress)
          .in("feature_id", subItemIds);

        if (votes) {
          for (const v of votes) {
            if (!subItemVotes[v.feature_id]) {
              subItemVotes[v.feature_id] = v.weight;
            }
          }
        }
      }

      response.sub_items = subItems.map((item) => ({
        ...item,
        user_vote: subItemVotes[item.id] ?? null,
      }));
    } else {
      response.sub_items = subItems || [];
    }

    // Get tags
    const { data: featureTags } = await supabase
      .from("feature_tags")
      .select("tag_id")
      .eq("feature_id", id);

    if (featureTags && featureTags.length > 0) {
      const tagIds = featureTags.map((ft) => ft.tag_id);
      const { data: tags } = await supabase
        .from("tags")
        .select("*")
        .in("id", tagIds);

      response.tags = tags || [];
    } else {
      response.tags = [];
    }
  }

  return NextResponse.json({ feature: response });
}
