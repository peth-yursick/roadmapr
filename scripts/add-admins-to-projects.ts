/**
 * Script to add project creators as admins to existing projects
 * This should be run once to fix existing projects
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addAdminsToProjects() {
  // Get all projects
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, creator_fid, owner_fid, name");

  if (projectsError) {
    console.error("Failed to fetch projects:", projectsError);
    return;
  }

  console.log(`Found ${projects.length} projects`);

  for (const project of projects || []) {
    const fid = project.owner_fid || project.creator_fid;

    if (!fid) {
      console.log(`Skipping ${project.name} - no creator/owner`);
      continue;
    }

    // Check if already an admin
    const { data: existingAdmin } = await supabase
      .from("project_admins")
      .select("*")
      .eq("project_id", project.id)
      .eq("fid", fid)
      .single();

    if (existingAdmin) {
      console.log(`${project.name} - already has admin (FID: ${fid})`);
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
      console.error(`Failed to add admin to ${project.name}:`, insertError);
    } else {
      console.log(`✓ Added admin to ${project.name} (FID: ${fid})`);
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
      console.log(`  ✓ Added to authorized_markers`);
    }
  }

  console.log("\nDone!");
}

addAdminsToProjects().catch(console.error);
