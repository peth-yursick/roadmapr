import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";


export const runtime = 'edge';

async function getCurrentUserFid(): Promise<number | null> {
  const cookieStore = await cookies();
  const fidCookie = cookieStore.get("user_fid");
  return fidCookie ? parseInt(fidCookie.value) : null;
}

// DELETE /api/projects/[handle]/admins/[adminId] - Remove an admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string; adminId: string }> }
) {
  const { handle, adminId } = await params;
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
      { error: "Only the project owner can remove admins" },
      { status: 403 }
    );
  }

  // Get the admin to remove
  const { data: adminToRemove } = await supabase
    .from("project_admins")
    .select("*")
    .eq("id", adminId)
    .eq("project_id", project.id)
    .single();

  if (!adminToRemove) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  // Can't remove the owner
  if (adminToRemove.role === "owner") {
    return NextResponse.json(
      { error: "Cannot remove the project owner" },
      { status: 400 }
    );
  }

  // Remove admin
  const { error: deleteError } = await supabase
    .from("project_admins")
    .delete()
    .eq("id", adminId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Also remove from authorized_markers
  await supabase
    .from("authorized_markers")
    .delete()
    .eq("project_id", project.id)
    .eq("fid", adminToRemove.fid);

  return NextResponse.json({ success: true });
}
