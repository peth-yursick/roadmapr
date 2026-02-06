import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNeynarUser } from "@/lib/neynar";
import { cookies } from "next/headers";


export const runtime = 'edge';

async function getCurrentUserFid(): Promise<number | null> {
  const cookieStore = await cookies();
  const fidCookie = cookieStore.get("user_fid");
  return fidCookie ? parseInt(fidCookie.value) : null;
}

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    console.log("[API /projects] Fetching projects...");
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const cursor = searchParams.get("cursor");
    const search = searchParams.get("search");

    console.log("[API /projects] Query params:", { limit, cursor, search });

    const supabase = await createClient();

    let query = supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(`name.ilike.%${search}%,project_handle.ilike.%${search}%`);
    }

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data: projects, error } = await query;

    if (error) {
      console.error("[API /projects] Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[API /projects] Success, returning", projects?.length || 0, "projects");

    return NextResponse.json({
      projects: projects || [],
      hasMore: (projects || []).length === limit,
    });
  } catch (err) {
    console.error("[API /projects] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  const currentFid = await getCurrentUserFid();

  if (!currentFid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    project_handle,
    bio,
    voting_type,
    token_address,
    chain,
    vote_increment,
    vote_increment_usd,
    fee_recipient_address,
    external_link,
    website_url,
  } = body;

  // Validation
  if (!name || !project_handle) {
    return NextResponse.json(
      { error: "Name and project_handle are required" },
      { status: 400 }
    );
  }

  if (name.length > 100) {
    return NextResponse.json(
      { error: "Name must be 100 characters or less" },
      { status: 400 }
    );
  }

  if (!/^[a-z0-9_-]+$/.test(project_handle)) {
    return NextResponse.json(
      { error: "Handle must be lowercase alphanumeric with dashes/underscores" },
      { status: 400 }
    );
  }

  if (project_handle.length < 3 || project_handle.length > 30) {
    return NextResponse.json(
      { error: "Handle must be 3-30 characters" },
      { status: 400 }
    );
  }

  // For token voting, require token address and validate increment
  if (voting_type === "token") {
    if (!token_address) {
      return NextResponse.json(
        { error: "Token address is required for token voting" },
        { status: 400 }
      );
    }

    if (!vote_increment || vote_increment <= 0) {
      return NextResponse.json(
        { error: "Vote increment must be a positive number" },
        { status: 400 }
      );
    }

    // Confirm USD value is provided for user confirmation
    if (vote_increment_usd === undefined || vote_increment_usd === null) {
      return NextResponse.json(
        { error: "USD value per vote is required for confirmation" },
        { status: 400 }
      );
    }
  }

  const supabase = await createClient();

  // Check if handle is taken
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("project_handle", project_handle.toLowerCase())
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Project handle is already taken" },
      { status: 400 }
    );
  }

  // Get creator's address if token voting
  let creatorAddress = fee_recipient_address;
  if (voting_type === "token" && !fee_recipient_address) {
    try {
      const user = await getNeynarUser(currentFid);
      // In a real implementation, we'd get their verified ETH address
      // For now, we leave it null and they can set it later
    } catch (err) {
      console.error("Failed to get creator info:", err);
    }
  }

  // Create project
  const { data: project, error: insertError } = await supabase
    .from("projects")
    .insert({
      name: name.trim(),
      project_handle: project_handle.toLowerCase(),
      description: bio?.trim() || null,
      bio: bio?.trim() || null,
      creator_fid: currentFid,
      owner_fid: currentFid,
      voting_type: voting_type || "score",
      token_address: token_address || null,
      chain: chain || (token_address ? "base" : null),
      vote_increment: vote_increment || 1,
      vote_increment_usd: vote_increment_usd || null,
      fee_recipient_address: creatorAddress || null,
      external_link: external_link || null,
      website_url: website_url || null,
      is_verified: false,
      created_by_bot: false,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "Project handle is already taken" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Add creator as owner admin
  await supabase.from("project_admins").insert({
    project_id: project.id,
    fid: currentFid,
    role: "owner",
    added_by_fid: null,
  });

  // Add to authorized_markers for backward compatibility
  await supabase.from("authorized_markers").insert({
    project_id: project.id,
    fid: currentFid,
    added_by_fid: null,
  });

  return NextResponse.json({ project }, { status: 201 });
}
