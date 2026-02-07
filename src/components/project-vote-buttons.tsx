"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useVoting } from "@/lib/voting-context";
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
  const { user } = useAuth();
  const {
    addPendingVote,
    removePendingVote,
    hasPendingVote,
    getPendingVote,
  } = useVoting();

  const [currentVotes, setCurrentVotes] = useState(totalVotes);
  const [userVote, setUserVote] = useState<boolean | null>(null);
  const [pendingVote, setPendingVote] = useState<boolean | null>(null);

  // Update local state when pending vote changes
  useEffect(() => {
    const vote = getPendingVote(projectId);
    if (vote) {
      setPendingVote(vote.isUpvote);
    } else {
      setPendingVote(null);
    }
  }, [getPendingVote, projectId]);

  // Calculate display votes (current + pending if different direction)
  const displayVotes = pendingVote !== null
    ? (pendingVote ? currentVotes + 1 : currentVotes - 1)
    : currentVotes;

  function handleVote(direction: "up" | "down") {
    if (!user) {
      toast.error("Please connect your wallet to vote");
      return;
    }

    const isUpvote = direction === "up";

    // Add to pending queue
    addPendingVote(projectId, projectName, isUpvote);
    setUserVote(isUpvote);

    toast(`${isUpvote ? "Upvote" : "Downvote"} added to queue`);
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 rounded-full ${
          pendingVote === true || userVote === true
            ? "text-primary bg-primary/10"
            : pendingVote === false
            ? "text-muted-foreground/50"
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => handleVote("up")}
        aria-label="Upvote"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 4l5 6H3z" />
        </svg>
      </Button>
      <span className="text-sm font-semibold tabular-nums" title={displayVotes.toString()}>
        {displayVotes}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 rounded-full ${
          pendingVote === false || userVote === false
            ? "text-destructive bg-destructive/10"
            : pendingVote === true
            ? "text-muted-foreground/50"
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => handleVote("down")}
        aria-label="Downvote"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 12l5-6H3z" />
        </svg>
      </Button>
    </div>
  );
}
