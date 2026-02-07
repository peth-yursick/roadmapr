import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";


export const runtime = 'edge';

interface RegisterRequest {
  txHash: string;
  tokenAddress: string;
}

async function getCurrentUser(): Promise<{ fid: number | null; walletAddress: string | null }> {
  const cookieStore = await cookies();
  const fidCookie = cookieStore.get("user_fid");
  const walletCookie = cookieStore.get("wallet_address");

  return {
    fid: fidCookie ? parseInt(fidCookie.value) : null,
    walletAddress: walletCookie?.value || null,
  };
}

// POST /api/projects/[projectId]/register - Record project registration in smart contract
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { fid, walletAddress } = await getCurrentUser();

  // Allow either Farcaster (fid) or wallet authentication
  if (!fid && !walletAddress) {
    return NextResponse.json({ error: "Unauthorized - please connect your wallet or sign in" }, { status: 401 });
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

  // Get project to verify ownership
  const { data: project } = await supabase
    .from("projects")
    .select("creator_fid, owner_fid")
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Verify ownership - for wallet-only users, we skip ownership check
  // since they're registering via their own wallet transaction
  if (fid && project.creator_fid !== fid && project.owner_fid !== fid) {
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
