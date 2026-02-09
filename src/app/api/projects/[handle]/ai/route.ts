import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = 'edge';

// GET /api/projects/[handle]/ai - AI-friendly endpoint for autonomous agents
// Returns structured data optimized for LLM consumption
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const { searchParams } = new URL(request.url);

  // AI agents can specify how many top features to fetch
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
  const includeCompleted = searchParams.get("include_completed") === "true";

  const supabase = await createClient();

  // Get project by handle
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("project_handle", handle)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: "Project not found", instructions: "Verify the project handle is correct" },
      { status: 404 }
    );
  }

  // Build status filter
  let statusFilter = ["open", "in_progress"];
  if (includeCompleted) {
    statusFilter.push("shipped");
  }

  // Get top features by vote weight
  const { data: features, error: featuresError } = await supabase
    .from("features")
    .select("*")
    .eq("project_id", project.id)
    .in("status", statusFilter)
    .eq("is_sub_item", false)
    .order("total_weight", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (featuresError) {
    return NextResponse.json({ error: featuresError.message }, { status: 500 });
  }

  // For each feature, get sub-items if any
  const featuresWithSubItems = await Promise.all(
    (features || []).map(async (feature) => {
      const { data: subItems } = await supabase
        .from("features")
        .select("*")
        .eq("parent_feature_id", feature.id)
        .order("total_weight", { ascending: false });

      return {
        ...feature,
        sub_items: subItems || [],
      };
    })
  );

  // Format for AI consumption
  const aiResponse = {
    // Meta-instructions for the AI agent
    _meta: {
      version: "1.0",
      generated_at: new Date().toISOString(),
      instructions: `You are an AI development agent working on the ${project.name} project. Below are the top-voted features and bugs from the community roadmap. Your task is to implement these requests in priority order (highest votes first). When you start working on a feature, mark it as 'in_progress' using the status update endpoint. When complete, mark it as 'shipped'.`,
      api_endpoints: {
        base_url: `${request.nextUrl.protocol}//${request.nextUrl.host}/api`,
        update_feature_status: `/api/features/{feature_id}/status`,
        create_feature: `/api/features`,
      },
      authentication: "Include API key in Authorization header if required",
    },

    // Project context
    project: {
      id: project.id,
      name: project.name,
      handle: project.project_handle,
      description: project.bio || project.description,
      website: project.website_url,
      repository: project.external_link,
      voting_type: project.voting_type,
      tech_stack: {
        // Projects can add this to their project bio or settings
        // AI agents can parse this from description
      },
    },

    // Top priority features
    features: (featuresWithSubItems || []).map((f, index) => ({
      rank: index + 1,
      id: f.id,
      title: f.title,
      description: f.description,
      status: f.status,
      priority: {
        score: f.total_weight,
        label: f.total_weight > 100 ? "high" : f.total_weight > 20 ? "medium" : "low",
      },
      created_at: f.created_at,
      submitted_by: {
        fid: f.submitter_fid,
      },
      // Sub-tasks that need to be completed
      sub_items: (f.sub_items || []).map((sub: any) => ({
        id: sub.id,
        title: sub.title,
        description: sub.description,
        status: sub.status,
      })),
    })),

    // Quick actions for the AI
    suggested_actions: [
      "Start with the highest-ranked feature",
      "Before implementing, check if there are sub-items to complete first",
      "Update feature status to 'in_progress' when you start working",
      "Mark as 'shipped' when complete and deployed",
      "Add comments/notes in the description for context",
    ],
  };

  // Add CORS headers for AI agent access
  return NextResponse.json(aiResponse, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "X-Roadmapr-AI-Version": "1.0",
    },
  });
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
