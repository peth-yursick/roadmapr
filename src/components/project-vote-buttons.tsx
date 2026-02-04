"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { voteOnProject } from "@/lib/contract-client";
import { toast } from "sonner";

interface ProjectVoteButtonsProps {
  projectId: string;
  totalVotes: number;
  tokenAddress?: string | null;
  voteIncrement?: number | null;
  onVoteChange?: (newVotes: number, userVote: boolean | null) => void;
}

export function ProjectVoteButtons({
  projectId,
  totalVotes,
  tokenAddress,
  voteIncrement,
  onVoteChange,
}: ProjectVoteButtonsProps) {
  const { user, walletProvider } = useAuth();
  const [isVoting, setIsVoting] = useState(false);
  const [currentVotes, setCurrentVotes] = useState(totalVotes);
  const [userVote, setUserVote] = useState<boolean | null>(null);

  async function handleVote(direction: "up" | "down") {
    if (!user?.fid) {
      toast.error("Sign in with Farcaster to vote");
      return;
    }

    if (!walletProvider) {
      toast.error("Wallet not connected. Open in Farcaster miniapp.");
      return;
    }

    if (!tokenAddress || !voteIncrement) {
      toast.error("This project doesn't support token voting yet");
      return;
    }

    if (userVote !== null) {
      toast.error("You've already voted on this project");
      return;
    }

    setIsVoting(true);

    try {
      const voteAmount = BigInt(voteIncrement);
      const isUpvote = direction === "up";

      // Vote on-chain (collects 1% fee)
      const txHash = await voteOnProject(projectId, voteAmount, isUpvote, walletProvider);

      // Record in database
      const res = await fetch("/api/projects/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          voter_fid: user.fid,
          voter_address: user?.custodyAddress || null,
          is_upvote: isUpvote,
          vote_amount: voteIncrement,
          tx_hash: txHash,
          token_address: tokenAddress,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record vote");
      }

      const data = await res.json();

      setCurrentVotes(data.total_votes || 0);
      setUserVote(isUpvote);
      onVoteChange?.(data.total_votes || 0, isUpvote);

      toast.success(`${isUpvote ? "Upvote" : "Downvote"} recorded! TX: ${txHash.slice(0, 10)}...`);
    } catch (err) {
      console.error("Vote error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to vote");
    } finally {
      setIsVoting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 rounded-full ${userVote === true ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => handleVote("up")}
        disabled={isVoting || userVote !== null}
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
        className={`h-7 w-7 p-0 rounded-full ${userVote === false ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => handleVote("down")}
        disabled={isVoting || userVote !== null}
        aria-label="Downvote"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 12l5-6H3z" />
        </svg>
      </Button>
    </div>
  );
}
