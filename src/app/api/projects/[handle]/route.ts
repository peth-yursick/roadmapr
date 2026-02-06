import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNeynarUser, getBulkUsers } from "@/lib/neynar";
import { cookies } from "next/headers";


export const runtime = 'edge';

// Helper to get current user FID from auth context
async function getCurrentUserFid(): Promise<number | null> {
  // In a real implementation, this would decode the auth token
  // For now, we check for a user_fid cookie or header
  const cookieStore = await cookies();
  const fidCookie = cookieStore.get("user_fid");
  return fidCookie ? parseInt(fidCookie.value) : null;
}

// GET /api/projects/[handle] - Get project details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const supabase = await createClient();

  // Get project by handle
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("project_handle", handle)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Get project admins
  const { data: admins } = await supabase
    .from("project_admins")
    .select("*")
    .eq("project_id", project.id)
    .order("role", { ascending: true });

  // Fetch admin user data from Neynar
  let adminsWithUsers = admins || [];
  if (admins && admins.length > 0) {
    const adminFids = admins.map((a) => a.fid);
    try {
      const users = await getBulkUsers(adminFids);
      const userMap = new Map(users.map((u: { fid: number }) => [u.fid, u]));
      adminsWithUsers = admins.map((admin) => ({
        ...admin,
        user: userMap.get(admin.fid) || null,
      }));
    } catch (err) {
      console.error("Failed to fetch admin users:", err);
    }
  }

  // Get creator user data
  let creator = null;
  if (project.owner_fid) {
    try {
      creator = await getNeynarUser(project.owner_fid);
    } catch (err) {
      console.error("Failed to fetch creator:", err);
    }
  }

  // Check if current user is admin
  const currentFid = await getCurrentUserFid();
  const isAdmin =
    currentFid !== null &&
    admins?.some((a) => a.fid === currentFid);
  const isOwner =
    currentFid !== null &&
    admins?.some((a) => a.fid === currentFid && a.role === "owner");

  return NextResponse.json({
    project,
    creator,
    admins: adminsWithUsers,
    isAdmin,
    isOwner,
  });
}

// PATCH /api/projects/[handle] - Update project settings
export async function PATCH(
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

  // Check if user is admin
  const { data: adminCheck } = await supabase
    .from("project_admins")
    .select("id, role")
    .eq("project_id", project.id)
    .eq("fid", currentFid)
    .single();

  if (!adminCheck) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse update body
  const body = await request.json();
  const allowedFields = [
    "bio",
    "avatar_url",
    "website_url",
    "external_link",
    "fee_recipient_address",
    "vote_increment",
    "vote_increment_usd",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  // Update project
  const { data: updatedProject, error: updateError } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", project.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ project: updatedProject });
}
