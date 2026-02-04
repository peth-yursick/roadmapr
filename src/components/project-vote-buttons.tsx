"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { voteOnProject } from "@/lib/contract-client";
import { toast } from "sonner";

// $ROAD token on Base - used for all project voting
const ROAD_TOKEN_ADDRESS = "0xc7aaba6e953a1c0436295cfaaa9b3ab475eb07" as const;
// Fixed vote increment: 1 million tokens
const VOTE_INCREMENT = 1_000_000;

interface ProjectVoteButtonsProps {
  projectId: string;
  totalVotes: number;
  onVoteChange?: (newVotes: number, userVote: boolean | null) => void;
}

export function ProjectVoteButtons({
  projectId,
  totalVotes,
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

    if (userVote !== null) {
      toast.error("You've already voted on this project");
      return;
    }

    setIsVoting(true);

    try {
      const voteAmount = BigInt(VOTE_INCREMENT);
      const isUpvote = direction === "up";

      // Vote on-chain using $ROAD token (collects 1% fee)
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
          vote_amount: VOTE_INCREMENT,
          tx_hash: txHash,
          token_address: ROAD_TOKEN_ADDRESS,
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
