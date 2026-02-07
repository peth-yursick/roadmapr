"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useVoting } from "@/lib/voting-context";
import { voteOnProjectRanking } from "@/lib/contract-client";
import { toast } from "sonner";
import { X, ChevronDown } from "lucide-react";

// Simple voting - just gas cost, no tokens needed
const ESTIMATED_GAS_COST_USD = 0.001;

export function VoteConfirmationBar() {
  const { user, walletProvider } = useAuth();
  const { pendingVotes, clearPendingVotes, getTotalVotes } = useVoting();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const totalPendingVotes = getTotalVotes();

  // No pending votes, don't show
  if (totalPendingVotes === 0) {
    return null;
  }

  async function handleConfirm() {
    if (!walletProvider) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsConfirming(true);

    try {
      // Execute all pending votes
      const results = await Promise.allSettled(
        Array.from(pendingVotes.values()).map(async (vote) => {
          try {
            const txHash = await voteOnProjectRanking(
              vote.projectId,
              vote.isUpvote,
              walletProvider
            );

            // Record in database
            await fetch("/api/projects/vote", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                project_id: vote.projectId,
                voter_fid: user?.fid || 0,
                voter_address: user?.custodyAddress || null,
                is_upvote: vote.isUpvote,
                vote_amount: 1,
                tx_hash: txHash,
              }),
            });

            return {
              projectId: vote.projectId,
              success: true,
              txHash
            };
          } catch (error: any) {
            return {
              projectId: vote.projectId,
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
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                {totalPendingVotes} pending vote{totalPendingVotes > 1 ? "s" : ""}
              </div>
              <span className="text-sm text-muted-foreground">
                Review your votes before signing
              </span>
            </div>
            <Button
              size="sm"
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
                <span className="text-muted-foreground">Transaction cost:</span>
                <span className="font-medium">Gas only (~${ESTIMATED_GAS_COST_USD.toFixed(3)})</span>
              </div>
              <div className="text-xs text-muted-foreground">
                🎉 Simple voting - no tokens required! Just sign to confirm your votes.
              </div>
            </div>

            {/* Pending votes list */}
            <div className="max-h-40 overflow-y-auto space-y-2">
              {Array.from(pendingVotes.values()).map((vote) => (
                <div
                  key={vote.projectId}
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
