"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useVoting } from "@/lib/voting-context";
import { voteOnProjectWithTokens } from "@/lib/contract-client";
import { toast } from "sonner";
import { X, ChevronDown } from "lucide-react";

// Token voting configuration
const ROAD_TOKEN_ADDRESS = "0xc7aaba6e953a1c0436295cfaaaea9b3ab475eb07" as const;
const VOTE_INCREMENT = 1; // 1 vote per click
const VOTE_PRICE_TOKENS = 1_000_000; // 1 million tokens per vote
const FEE_PERCENTAGE = 0.01; // 1% fee

export function VoteConfirmationBar() {
  const { user, walletProvider } = useAuth();
  const { pendingVotes, clearPendingVotes, getTotalVotes } = useVoting();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [roadPriceUsd, setRoadPriceUsd] = useState<number>(0.01); // Default fallback

  const totalPendingVotes = getTotalVotes();

  // Fetch ROAD token price
  useEffect(() => {
    async function fetchPrice() {
      try {
        // Use a simple fallback price for now
        setRoadPriceUsd(0.01);
      } catch (e) {
        setRoadPriceUsd(0.01);
      }
    }
    fetchPrice();
  }, []);

  // No pending votes, don't show
  if (totalPendingVotes === 0) {
    return null;
  }

  // Calculate costs
  const totalTokensNeeded = totalPendingVotes * VOTE_PRICE_TOKENS;
  const feeTokens = Math.floor(totalTokensNeeded * FEE_PERCENTAGE);
  const totalTokensWithFee = totalTokensNeeded + feeTokens;
  // totalTokensWithFee is in token units (1M tokens per vote), not wei
  const estimatedUsd = (totalTokensWithFee / 1_000_000) * roadPriceUsd;

  console.log("[VoteConfirmationBar] Cost calculation:", {
    totalPendingVotes,
    totalTokensNeeded,
    feeTokens,
    totalTokensWithFee,
    roadPriceUsd,
    estimatedUsd,
    pendingVotes,
  });

  async function handleConfirm() {
    if (!walletProvider) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsConfirming(true);

    try {
      console.log("[VoteConfirmationBar] Processing pending votes:", pendingVotes);

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

      console.log("[VoteConfirmationBar] Grouped votes by project:", Object.fromEntries(votesByProject));

      const results = await Promise.allSettled(
        Array.from(votesByProject.entries()).map(async ([projectId, votes]) => {
          try {
            const netVoteCount = votes.upvotes - votes.downvotes;
            const isUpvote = netVoteCount > 0;
            const absVoteCount = Math.abs(netVoteCount);

            if (absVoteCount === 0) {
              console.log("[VoteConfirmationBar] Skipping project with net 0 votes:", projectId);
              return { projectId, success: true, skipped: true };
            }

            console.log("[VoteConfirmationBar] Voting on project:", { projectId, absVoteCount, isUpvote });

            const txHash = await voteOnProjectWithTokens(
              projectId,
              absVoteCount,
              isUpvote,
              walletProvider
            );

            console.log("[VoteConfirmationBar] Transaction successful:", txHash);

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

            return {
              projectId,
              success: true,
              txHash
            };
          } catch (error: any) {
            console.error("[VoteConfirmationBar] Vote failed for project:", projectId, error);
            return {
              projectId,
              success: false,
              error: error.message
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
      setIsExpanded(false);
    } catch (error: any) {
      console.error("Vote confirmation error:", error);
      toast.error(error.message || "Failed to confirm votes");
    } finally {
      setIsConfirming(false);
    }
  }

  function handleClear() {
    clearPendingVotes();
    setIsExpanded(false);
    toast.info("Pending votes cleared");
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
      <div className="max-w-4xl mx-auto">
        {/* Collapsed state */}
        {!isExpanded && (
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                {totalPendingVotes} pending vote{totalPendingVotes > 1 ? "s" : ""}
              </div>
              <span className="text-sm text-muted-foreground">
                {(totalTokensWithFee / 1_000_000).toFixed(1)}M $ROAD
              </span>
            </div>
            <Button
              onClick={() => setIsExpanded(true)}
              className="gap-1"
            >
              Review
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Expanded state */}
        {isExpanded && (
          <div className="px-4 py-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Confirm Your Votes</h3>
                <p className="text-sm text-muted-foreground">
                  {totalPendingVotes} project{totalPendingVotes > 1 ? "s" : ""} to vote on
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Cost summary */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total votes:</span>
                <span className="font-medium">{totalPendingVotes}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">$ROAD tokens needed:</span>
                <span className="font-medium">{(totalTokensWithFee / 1_000_000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform fee (1%):</span>
                <span className="font-medium">{(feeTokens / 1_000_000).toFixed(4)}M</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated USD:</span>
                <span className="font-medium">${estimatedUsd.toFixed(2)}</span>
              </div>
              {roadPriceUsd > 0 && (
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  @ ${(estimatedUsd / totalPendingVotes).toFixed(4)} per vote
                  (${(roadPriceUsd * 1_000_000).toFixed(2)} $ROAD per 1M tokens)
                </div>
              )}
            </div>

            {/* Pending votes list */}
            <div className="max-h-40 overflow-y-auto space-y-2">
              {pendingVotes.map((vote, index) => (
                <div
                  key={`${vote.projectId}-${index}`}
                  className="flex items-center justify-between text-sm p-2 bg-background rounded border"
                >
                  <div className="flex items-center gap-2">
                    {vote.isUpvote ? (
                      <span className="text-primary">▲</span>
                    ) : (
                      <span className="text-destructive">▼</span>
                    )}
                    <span className="truncate max-w-[200px]">
                      {vote.projectName || vote.projectId.slice(0, 8)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      /* Remove individual vote */
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={isConfirming}
                className="flex-1"
              >
                Clear All
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isConfirming || !walletProvider}
                className="flex-1"
              >
                {isConfirming ? "Confirming..." : `Confirm ${totalPendingVotes} Vote${totalPendingVotes > 1 ? "s" : ""}`}
              </Button>
            </div>

            {!walletProvider && (
              <p className="text-xs text-center text-muted-foreground">
                Connect your wallet to confirm these votes
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
