import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markFeatureShippedOnChain } from "@/lib/contract";

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

    // Get feature to check project_id
    const { data: feature } = await supabase
      .from("features")
      .select("project_id")
      .eq("id", id)
      .single();

    if (!feature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    // Check if user is authorized marker for this project
    const { data: marker } = await supabase
      .from("project_admins")
      .select("id, role")
      .eq("project_id", feature.project_id)
      .eq("fid", marker_fid)
      .single();

    if (!marker) {
      return NextResponse.json(
        { error: "Not authorized to change feature status" },
        { status: 403 }
      );
    }

    // Update feature status
    const { data, error } = await supabase
      .from("features")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If marking as shipped, also update on-chain (if project uses token voting)
    if (status === "shipped") {
      try {
        const txHash = await markFeatureShippedOnChain(id);
        console.log(`Feature ${id} marked as shipped on-chain: ${txHash}`);
      } catch (contractError) {
        console.error("Failed to mark shipped on-chain:", contractError);
        // Don't fail the request if contract call fails - log it for manual retry
      }
    }

    return NextResponse.json({ feature: data });
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
