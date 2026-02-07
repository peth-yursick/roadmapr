"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { voteOnProjectWithTokens } from "@/lib/contract-client";
import { toast } from "sonner";

interface ProjectVoteButtonsProps {
  projectId: string;
  projectName: string;
  totalVotes: number;
  onVoteChange?: (newVotes: number, userVote: boolean | null) => void;
}

export function ProjectVoteButtons({
  projectId,
  projectName,
  totalVotes,
  onVoteChange,
}: ProjectVoteButtonsProps) {
  const { user, walletProvider } = useAuth();
  const [currentVotes, setCurrentVotes] = useState(totalVotes);
  const [isVoting, setIsVoting] = useState(false);

  async function handleVote(direction: "up" | "down") {
    if (!user) {
      toast.error("Please connect your wallet to vote");
      return;
    }

    if (!walletProvider) {
      toast.error("Please connect your wallet to vote");
      return;
    }

    const isUpvote = direction === "up";
    setIsVoting(true);

    try {
      console.log("[VoteButtons] Voting", { projectId, projectName, isUpvote });

      // Send transaction directly
      const txHash = await voteOnProjectWithTokens(
        projectId,
        1, // 1 vote per click
        isUpvote,
        walletProvider
      );

      console.log("[VoteButtons] Transaction successful:", txHash);

      // Update vote count visually
      setCurrentVotes(prev => isUpvote ? prev + 1 : prev - 1);

      // Record in database
      await fetch("/api/projects/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          voter_fid: user?.fid || 0,
          voter_address: user?.custodyAddress || null,
          is_upvote: isUpvote,
          vote_amount: 1_000_000,
          tx_hash: txHash,
          token_address: "0xc7aaba6e953a1c0436295cfaaaea9b3ab475eb07",
        }),
      });

      toast.success(`${isUpvote ? "Upvote" : "Downvote"} successful!`);
    } catch (error: any) {
      console.error("[VoteButtons] Vote failed:", error);
      toast.error(error.message || "Vote failed. Please try again.");
    } finally {
      setIsVoting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 rounded-full ${
          isVoting
            ? "opacity-50 cursor-not-allowed"
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => handleVote("up")}
        disabled={isVoting}
        aria-label="Upvote"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 4l5 6H3z" />
        </svg>
      </Button>
      <span className="text-sm font-semibold tabular-nums" title={currentVotes.toString()}>
        {currentVotes}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 rounded-full ${
          isVoting
            ? "opacity-50 cursor-not-allowed"
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => handleVote("down")}
        disabled={isVoting}
        aria-label="Downvote"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 12l5-6H3z" />
        </svg>
      </Button>
    </div>
  );
}
