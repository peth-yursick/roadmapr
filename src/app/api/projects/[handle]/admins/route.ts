import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNeynarUser } from "@/lib/neynar";
import { cookies } from "next/headers";

async function getCurrentUserFid(): Promise<number | null> {
  const cookieStore = await cookies();
  const fidCookie = cookieStore.get("user_fid");
  return fidCookie ? parseInt(fidCookie.value) : null;
}

// POST /api/projects/[handle]/admins - Add a new admin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const currentFid = await getCurrentUserFid();

  if (!currentFid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Get project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("project_handle", handle)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Check if user is owner
  const { data: ownerCheck } = await supabase
    .from("project_admins")
    .select("id")
    .eq("project_id", project.id)
    .eq("fid", currentFid)
    .eq("role", "owner")
    .single();

  if (!ownerCheck) {
    return NextResponse.json(
      { error: "Only the project owner can add admins" },
      { status: 403 }
    );
  }

  // Parse body
  const body = await request.json();
  const { fid } = body;

  if (!fid || typeof fid !== "number") {
    return NextResponse.json({ error: "Valid FID is required" }, { status: 400 });
  }

  // Verify the FID exists on Farcaster
  let newAdminUser = null;
  try {
    newAdminUser = await getNeynarUser(fid);
    if (!newAdminUser) {
      return NextResponse.json(
        { error: "User not found on Farcaster" },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("Failed to verify FID:", err);
    return NextResponse.json(
      { error: "Failed to verify FID on Farcaster" },
      { status: 400 }
    );
  }

  // Check if already an admin
  const { data: existingAdmin } = await supabase
    .from("project_admins")
    .select("id")
    .eq("project_id", project.id)
    .eq("fid", fid)
    .single();

  if (existingAdmin) {
    return NextResponse.json(
      { error: "User is already an admin" },
      { status: 400 }
    );
  }

  // Add admin
  const { data: admin, error: insertError } = await supabase
    .from("project_admins")
    .insert({
      project_id: project.id,
      fid,
      role: "admin",
      added_by_fid: currentFid,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Also add to authorized_markers for backward compatibility
  await supabase
    .from("authorized_markers")
    .insert({
      project_id: project.id,
      fid,
      added_by_fid: currentFid,
    })
    .select()
    .single();

  return NextResponse.json({
    admin: {
      ...admin,
      user: newAdminUser,
    },
  }, { status: 201 });
}
