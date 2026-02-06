import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";


export const runtime = 'edge';

// GET /api/projects/user-votes - Get current user's project votes
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const fidCookie = cookieStore.get("user_fid");

    if (!fidCookie) {
      return NextResponse.json({ votes: [] });
    }

    const fid = parseInt(fidCookie.value);

    const supabase = await createClient();

    const { data: votes, error } = await supabase
      .from("project_votes")
      .select("project_id, is_upvote")
      .eq("voter_fid", fid);

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
