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
 * GET /api/admin/client-errors?since=ISO&limit=100
 * Returns deduplicated errors with counts and affected users.
 */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const since =
    searchParams.get("since") ||
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const limit = Math.min(parseInt(searchParams.get("limit") || "500"), 1000);

  const supabase = await createClient();

  const { data: errors, error } = await supabase
    .from("client_errors")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Deduplicate by error text
  const grouped = new Map<
    string,
    {
      error: string;
      count: number;
      sources: Set<string>;
      uniqueFids: Set<number>;
      lastSeen: string;
      latestContext: Record<string, unknown>;
    }
  >();

  for (const row of errors || []) {
    const key = row.error_text.slice(0, 200);
    const existing = grouped.get(key);
    if (existing) {
      existing.count++;
      existing.sources.add(row.source);
      if (row.user_fid) existing.uniqueFids.add(row.user_fid);
      if (row.created_at > existing.lastSeen) {
        existing.lastSeen = row.created_at;
        existing.latestContext = row.context;
      }
    } else {
      grouped.set(key, {
        error: row.error_text,
        count: 1,
        sources: new Set([row.source]),
        uniqueFids: new Set(row.user_fid ? [row.user_fid] : []),
        lastSeen: row.created_at,
        latestContext: row.context || {},
      });
    }
  }

  const deduplicated = Array.from(grouped.values())
    .sort((a, b) => b.count - a.count)
    .map((g) => ({
      error: g.error,
      count: g.count,
      sources: Array.from(g.sources),
      uniqueUsers: g.uniqueFids.size,
      lastSeen: g.lastSeen,
      context: g.latestContext,
    }));

  return NextResponse.json({
    since,
    totalEvents: (errors || []).length,
    uniqueErrors: deduplicated.length,
    errors: deduplicated,
  });
}
