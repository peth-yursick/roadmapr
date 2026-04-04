import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

function checkAdminAuth(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const provided =
    request.headers.get("x-admin-secret") ||
    new URL(request.url).searchParams.get("secret");
  return provided === secret;
}

/**
 * GET /api/admin/intel-digest?since=ISO
 * Aggregates: errors, engagement signals, project activity, voting patterns.
 */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const since =
    searchParams.get("since") ||
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const supabase = await createClient();

  // Fetch all data sources in parallel
  const [errorsResult, projectsResult, votesResult, featuresResult] =
    await Promise.all([
      // 1. Client errors (deduplicated)
      supabase
        .from("client_errors")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),

      // 2. Projects overview (activity)
      supabase
        .from("projects")
        .select("id, name, project_handle, total_votes, created_at")
        .order("total_votes", { ascending: false })
        .limit(50),

      // 3. Recent votes (engagement)
      supabase
        .from("votes")
        .select("id, feature_id, fid, weight, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200),

      // 4. Recent features submitted
      supabase
        .from("features")
        .select("id, title, project_id, submitted_by_fid, status, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  // --- Errors: deduplicate ---
  const errorMap = new Map<
    string,
    { error: string; count: number; sources: Set<string>; lastSeen: string }
  >();
  for (const row of errorsResult.data || []) {
    const key = row.error_text.slice(0, 200);
    const existing = errorMap.get(key);
    if (existing) {
      existing.count++;
      existing.sources.add(row.source);
      if (row.created_at > existing.lastSeen) existing.lastSeen = row.created_at;
    } else {
      errorMap.set(key, {
        error: row.error_text,
        count: 1,
        sources: new Set([row.source]),
        lastSeen: row.created_at,
      });
    }
  }
  const clientErrors = Array.from(errorMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map((e) => ({
      error: e.error,
      count: e.count,
      sources: Array.from(e.sources),
      lastSeen: e.lastSeen,
    }));

  // --- Engagement: voting activity ---
  const votes = votesResult.data || [];
  const uniqueVoters = new Set(votes.map((v) => v.fid)).size;
  const totalVoteWeight = votes.reduce(
    (sum, v) => sum + (parseFloat(v.weight) || 1),
    0
  );

  // --- Features submitted ---
  const features = featuresResult.data || [];
  const featuresByStatus: Record<string, number> = {};
  for (const f of features) {
    featuresByStatus[f.status || "open"] =
      (featuresByStatus[f.status || "open"] || 0) + 1;
  }

  // --- Projects overview ---
  const projects = (projectsResult.data || []).map((p) => ({
    name: p.name,
    handle: p.project_handle,
    totalVotes: p.total_votes || 0,
  }));

  // --- Stale projects (no votes recently) ---
  const activeProjectIds = new Set(
    votes.map((v) => {
      // votes don't have project_id directly, derive from features
      const feature = features.find((f) => f.id === v.feature_id);
      return feature?.project_id;
    })
  );
  const staleProjects = projects.filter(
    (p) => !activeProjectIds.has(p.handle)
  );

  return NextResponse.json({
    since,
    generatedAt: new Date().toISOString(),
    clientErrors: {
      total: (errorsResult.data || []).length,
      unique: clientErrors.length,
      top: clientErrors,
    },
    engagement: {
      votesInPeriod: votes.length,
      uniqueVoters,
      totalVoteWeight: Math.round(totalVoteWeight * 100) / 100,
    },
    features: {
      submittedInPeriod: features.length,
      byStatus: featuresByStatus,
      recent: features.slice(0, 10).map((f) => ({
        title: f.title,
        status: f.status,
        submittedBy: f.submitted_by_fid,
        createdAt: f.created_at,
      })),
    },
    projects: {
      total: projects.length,
      topByVotes: projects.slice(0, 10),
      stale: staleProjects.slice(0, 5),
    },
  });
}
