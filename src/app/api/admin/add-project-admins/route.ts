import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = 'edge';

/**
 * Admin endpoint to add missing admins to projects
 * This ensures all project creators are in the project_admins table
 */
export async function POST() {
  const supabase = await createClient();

  // Get all projects
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, creator_fid, owner_fid, name");

  if (projectsError) {
    return NextResponse.json({ error: projectsError.message }, { status: 500 });
  }

  const results: { project: string; added: boolean; error?: string }[] = [];

  for (const project of projects || []) {
    const fid = project.owner_fid || project.creator_fid;

    if (!fid) {
      results.push({ project: project.name, added: false, error: "No creator/owner" });
      continue;
    }

    try {
      // Check if already an admin
      const { data: existingAdmin } = await supabase
        .from("project_admins")
        .select("*")
        .eq("project_id", project.id)
        .eq("fid", fid)
        .single();

      if (existingAdmin) {
        results.push({ project: project.name, added: false });
        continue;
      }

      // Add as admin
      const { error: insertError } = await supabase
        .from("project_admins")
        .insert({
          project_id: project.id,
          fid: fid,
          role: "owner",
          added_by_fid: null,
        });

      if (insertError) {
        results.push({ project: project.name, added: false, error: insertError.message });
      } else {
        results.push({ project: project.name, added: true });
      }

      // Also add to authorized_markers
      const { data: existingMarker } = await supabase
        .from("authorized_markers")
        .select("*")
        .eq("project_id", project.id)
        .eq("fid", fid)
        .single();

      if (!existingMarker) {
        await supabase.from("authorized_markers").insert({
          project_id: project.id,
          fid: fid,
          added_by_fid: null,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({ project: project.name, added: false, error: message });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    summary: {
      total: projects.length,
      updated: results.filter((r) => r.added).length,
    },
  });
}
