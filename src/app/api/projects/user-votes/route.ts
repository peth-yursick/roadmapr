import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

// GET /api/projects/user-votes - Get current user's project votes
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.fid) {
      return NextResponse.json({ votes: [] });
    }

    const supabase = await createClient();

    const { data: votes, error } = await supabase
      .from("project_votes")
      .select("project_id, is_upvote")
      .eq("voter_fid", session.fid);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ votes: votes || [] });
  } catch (err) {
    console.error("Get user votes error:", err);
    return NextResponse.json(
      { error: "Failed to fetch user votes" },
      { status: 500 }
    );
  }
}
