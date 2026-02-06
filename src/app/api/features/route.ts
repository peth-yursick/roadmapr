import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";


export const runtime = 'edge';

// Default Farcaster project for backward compatibility
const DEFAULT_PROJECT_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";
  const cursor = searchParams.get("cursor"); // last feature's total_weight for pagination
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const voterFid = searchParams.get("voter_fid");
  const voterAddress = searchParams.get("voter_address");
  const tags = searchParams.get("tags"); // comma-separated tag IDs

  // Multi-project support
  let projectId = searchParams.get("project_id");
  const projectHandle = searchParams.get("project_handle");

  const supabase = await createClient();

  // If project_handle is provided, look up the project ID
  if (projectHandle && !projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("project_handle", projectHandle)
      .single();

    if (project) {
      projectId = project.id;
    } else {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }

  // Default to Farcaster project for backward compatibility
  if (!projectId) {
    projectId = DEFAULT_PROJECT_ID;
  }

  let query = supabase
    .from("features")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_sub_item", false) // Don't show sub-items in main feed
    .order("total_weight", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    if (status === "open") {
      // "Open" shows open + in_progress
      query = query.in("status", ["open", "in_progress"]);
    } else {
      query = query.eq("status", status);
    }
  } else {
    // Default: don't show hidden unless explicitly requested
    query = query.neq("status", "hidden");
  }

  if (cursor) {
    query = query.lt("total_weight", parseFloat(cursor));
  }

  const { data: features, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter by tags if provided
  let filteredFeatures = features || [];
  if (tags && filteredFeatures.length > 0) {
    const tagIds = tags.split(",");
    const featureIds = filteredFeatures.map((f) => f.id);

    const { data: featureTags } = await supabase
      .from("feature_tags")
      .select("feature_id")
      .in("feature_id", featureIds)
      .in("tag_id", tagIds);

    if (featureTags) {
      const featuresWithTags = new Set(featureTags.map((ft) => ft.feature_id));
      filteredFeatures = filteredFeatures.filter((f) => featuresWithTags.has(f.id));
    }
  }

  // If voter_fid is provided, fetch their votes for these features
  let userVotes: Record<string, number> = {};
  let userTokensLocked: Record<string, number> = {};

  if (voterFid && filteredFeatures.length > 0) {
    const featureIds = filteredFeatures.map((f) => f.id);
    const { data: votes } = await supabase
      .from("votes")
      .select("feature_id, weight, tokens_locked")
      .eq("voter_fid", parseInt(voterFid))
      .in("feature_id", featureIds);

    if (votes) {
      userVotes = Object.fromEntries(
        votes.map((v) => [v.feature_id, v.weight])
      );
      userTokensLocked = Object.fromEntries(
        votes.filter((v) => v.tokens_locked > 0).map((v) => [v.feature_id, v.tokens_locked])
      );
    }
  }

  // Also check by address for token voting
  if (voterAddress && filteredFeatures.length > 0) {
    const featureIds = filteredFeatures.map((f) => f.id);
    const { data: votes } = await supabase
      .from("votes")
      .select("feature_id, weight, tokens_locked")
      .eq("voter_address", voterAddress)
      .in("feature_id", featureIds);

    if (votes) {
      for (const v of votes) {
        if (!userVotes[v.feature_id]) {
          userVotes[v.feature_id] = v.weight;
        }
        if (v.tokens_locked > 0) {
          userTokensLocked[v.feature_id] = v.tokens_locked;
        }
      }
    }
  }

  const featuresWithVotes = filteredFeatures.map((f) => ({
    ...f,
    user_vote: userVotes[f.id] ?? null,
    user_tokens_locked: userTokensLocked[f.id] ?? null,
  }));

  return NextResponse.json({
    features: featuresWithVotes,
    hasMore: (features || []).length === limit,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      submitter_fid,
      project_id,
      project_handle,
      tags,
      source_cast_hash,
      source_cast_author_fid,
      parent_feature_id,
    } = body;

    if (!title || !submitter_fid) {
      return NextResponse.json(
        { error: "Title and submitter_fid are required" },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: "Title must be 200 characters or less" },
        { status: 400 }
      );
    }

    if (description && description.length > 2000) {
      return NextResponse.json(
        { error: "Description must be 2000 characters or less" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Resolve project ID
    let resolvedProjectId = project_id;
    if (project_handle && !resolvedProjectId) {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("project_handle", project_handle)
        .single();

      if (project) {
        resolvedProjectId = project.id;
      } else {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    // Default to Farcaster project
    if (!resolvedProjectId) {
      resolvedProjectId = DEFAULT_PROJECT_ID;
    }

    // Determine if this is a sub-item
    const isSubItem = !!parent_feature_id;

    const { data, error } = await supabase
      .from("features")
      .insert({
        project_id: resolvedProjectId,
        title: title.trim(),
        description: description?.trim() || null,
        submitter_fid,
        status: "open",
        total_weight: 0,
        source_cast_hash: source_cast_hash || null,
        source_cast_author_fid: source_cast_author_fid || null,
        parent_feature_id: parent_feature_id || null,
        is_sub_item: isSubItem,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagInserts = tags.map((tagId: string) => ({
        feature_id: data.id,
        tag_id: tagId,
      }));

      await supabase.from("feature_tags").insert(tagInserts);
    }

    // Add source if provided
    if (source_cast_hash) {
      await supabase.from("feature_sources").insert({
        feature_id: data.id,
        source_cast_hash,
        source_cast_author_fid: source_cast_author_fid || null,
      });
    }

    return NextResponse.json({ feature: data }, { status: 201 });
  } catch (err) {
    console.error("Feature submission error:", err);
    return NextResponse.json({ error: "Failed to submit feature" }, { status: 500 });
  }
}
