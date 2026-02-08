"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useVoting } from "@/lib/voting-context";
import { voteOnProjectWithTokens } from "@/lib/contract-client";
import { toast } from "sonner";
import { X } from "lucide-react";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Token voting configuration
const ROAD_TOKEN_ADDRESS = "0xc7aaba6e953a1c0436295cfaaaea9b3ab475eb07" as const;
const VOTE_PRICE_TOKENS = 1_000_000; // 1 million tokens per vote
const FEE_PERCENTAGE = 0.01; // 1% fee

export function VoteConfirmationBar() {
  const { user, walletProvider } = useAuth();
  const { pendingVotes, clearPendingVotes, getTotalVotes, markVotesAsConfirmed } = useVoting();
  const [isConfirming, setIsConfirming] = useState(false);

  const totalPendingVotes = getTotalVotes();

  // No pending votes, don't show
  if (totalPendingVotes === 0) {
    return null;
  }

  // Calculate costs
  const totalTokensNeeded = totalPendingVotes * VOTE_PRICE_TOKENS;
  const feeTokens = Math.floor(totalTokensNeeded * FEE_PERCENTAGE);
  const totalTokensWithFee = totalTokensNeeded + feeTokens;

  async function handleConfirm() {
    if (!walletProvider) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsConfirming(true);

    try {
      // Group votes by project to batch them into single transactions
      const votesByProject = new Map<string, { upvotes: number; downvotes: number; projectName: string }>();

      for (const vote of pendingVotes) {
        if (!votesByProject.has(vote.projectId)) {
          votesByProject.set(vote.projectId, { upvotes: 0, downvotes: 0, projectName: vote.projectName || vote.projectId });
        }
        const projectVotes = votesByProject.get(vote.projectId)!;
        if (vote.isUpvote) {
          projectVotes.upvotes++;
        } else {
          projectVotes.downvotes++;
        }
      }

      const results = await Promise.allSettled(
        Array.from(votesByProject.entries()).map(async ([projectId, votes]) => {
          try {
            const netVoteCount = votes.upvotes - votes.downvotes;
            const isUpvote = netVoteCount > 0;
            const absVoteCount = Math.abs(netVoteCount);

            if (absVoteCount === 0) {
              return { projectId, success: true, skipped: true };
            }

            const txHash = await voteOnProjectWithTokens(
              projectId,
              absVoteCount,
              isUpvote,
              walletProvider
            );

            // Record in database
            await fetch("/api/projects/vote", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                project_id: projectId,
                voter_fid: user?.fid || 0,
                voter_address: user?.custodyAddress || null,
                is_upvote: isUpvote,
                vote_amount: absVoteCount * VOTE_PRICE_TOKENS,
                tx_hash: txHash,
                token_address: ROAD_TOKEN_ADDRESS,
              }),
            });

            // Mark votes as confirmed in the context so UI doesn't reset
            markVotesAsConfirmed(projectId, isUpvote ? absVoteCount : -absVoteCount);

            return {
              projectId,
              success: true,
              txHash
            };
          } catch (error: unknown) {
            return {
              projectId,
              success: false,
              error: getErrorMessage(error)
            };
          }
        })
      );

      const successful = results.filter(r => r.status === "fulfilled" && r.value.success);
      const failed = results.filter(r => r.status === "rejected" || !r.value.success);

      if (failed.length > 0) {
        toast.error(
          `${failed.length} vote${failed.length > 1 ? "s" : ""} failed. ${successful.length > 0 ? `${successful.length} succeeded.` : ""}`
        );
      } else {
        toast.success(
          `Successfully voted on ${successful.length} project${successful.length > 1 ? "s" : ""}!`
        );
      }

      // Clear pending votes
      clearPendingVotes();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to confirm votes");
    } finally {
      setIsConfirming(false);
    }
  }

  function handleClear() {
    clearPendingVotes();
    toast.info("Pending votes cleared");
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
              {totalPendingVotes} pending vote{totalPendingVotes > 1 ? "s" : ""}
            </div>
            <span className="text-sm text-muted-foreground">
              {(totalTokensWithFee / 1_000_000).toFixed(1)}M $ROAD
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={isConfirming}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isConfirming || !walletProvider}
            >
              {isConfirming ? "Confirming..." : "Confirm"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleClear}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {!walletProvider && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Connect your wallet to confirm these votes
          </p>
        )}
      </div>
    </div>
  );
}
