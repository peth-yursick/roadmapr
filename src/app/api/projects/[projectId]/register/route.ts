import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

interface RegisterRequest {
  txHash: string;
  tokenAddress: string;
}

async function getCurrentUserFid(): Promise<number | null> {
  const cookieStore = await cookies();
  const fidCookie = cookieStore.get("user_fid");
  return fidCookie ? parseInt(fidCookie.value) : null;
}

// POST /api/projects/[projectId]/register - Record project registration in smart contract
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const currentFid = await getCurrentUserFid();

  if (!currentFid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const body: RegisterRequest = await request.json();
  const { txHash, tokenAddress } = body;

  if (!txHash || !tokenAddress) {
    return NextResponse.json(
      { error: "txHash and tokenAddress are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Verify the user is the project owner
  const { data: project } = await supabase
    .from("projects")
    .select("creator_fid, owner_fid")
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.creator_fid !== currentFid && project.owner_fid !== currentFid) {
    return NextResponse.json(
      { error: "Only the project owner can register the project" },
      { status: 403 }
    );
  }

  // Update project with token address and mark as registered
  const { error: updateError } = await supabase
    .from("projects")
    .update({
      token_address: tokenAddress,
      vote_increment: 1000000, // 1 million tokens
      chain: "base",
    })
    .eq("id", projectId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    txHash,
    projectId,
  });
}
