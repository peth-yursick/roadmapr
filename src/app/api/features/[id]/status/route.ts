import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PROJECT_ID = "00000000-0000-0000-0000-000000000001";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { status, marker_fid } = body;

    if (!marker_fid) {
      return NextResponse.json(
        { error: "marker_fid is required" },
        { status: 400 }
      );
    }

    if (!["open", "in_progress", "shipped"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is authorized marker
    const { data: marker } = await supabase
      .from("authorized_markers")
      .select("id")
      .eq("project_id", PROJECT_ID)
      .eq("fid", marker_fid)
      .single();

    if (!marker) {
      return NextResponse.json(
        { error: "Not authorized to change feature status" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("features")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feature: data });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
