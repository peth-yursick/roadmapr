import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = 'edge';

// Fixed values for main page voting
const ROAD_TOKEN_ADDRESS = "0xc7aaba6e953a1c0436295cfaaa9b3ab475eb07f";
const VOTE_INCREMENT = 1000000;
const VOTE_INCREMENT_USD = 0.01;

/**
 * Pre-check project for registration
 * POST /api/projects/register-any
 *
 * This verifies a project exists and is ready for smart contract registration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify project exists
    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Return project info with fixed voting configuration
    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        handle: project.project_handle,
        tokenAddress: ROAD_TOKEN_ADDRESS,
        voteIncrement: VOTE_INCREMENT,
        voteIncrementUsd: VOTE_INCREMENT_USD,
      },
    });
  } catch (err: any) {
    console.error("[Register-Any] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to verify project" },
      { status: 500 }
    );
  }
}
