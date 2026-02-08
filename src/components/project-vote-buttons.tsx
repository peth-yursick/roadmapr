"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useVoting } from "@/lib/voting-context";
import { toast } from "sonner";
import { ChevronUp, ChevronDown } from "lucide-react";

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
  const { addPendingVote, getPendingVotesForProject, getConfirmedVoteDelta } = useVoting();

  const [currentVotes, setCurrentVotes] = useState(totalVotes);
  const confirmedDelta = getConfirmedVoteDelta(projectId);

  // Get pending votes for this project
  const pendingVotesForProject = getPendingVotesForProject(projectId);
  const pendingUpvotes = pendingVotesForProject.filter(v => v.isUpvote).length;
  const pendingDownvotes = pendingVotesForProject.filter(v => !v.isUpvote).length;
  const netPendingVotes = pendingUpvotes - pendingDownvotes;

  // Display votes = current + confirmed + pending
  const displayVotes = currentVotes + confirmedDelta + netPendingVotes;

  function handleVote(direction: "up" | "down") {
    if (!user) {
      toast.error("Please connect your wallet to vote");
      return;
    }

    const isUpvote = direction === "up";

    // Add to pending queue (no toast notification)
    addPendingVote(projectId, projectName, isUpvote);
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 rounded-full ${
          netPendingVotes > 0 || pendingUpvotes > 0
            ? "text-primary bg-primary/10"
            : netPendingVotes < 0 || pendingDownvotes > 0
            ? "text-muted-foreground/50"
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => handleVote("up")}
        aria-label="Upvote"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </Button>
      <span className="text-sm font-semibold tabular-nums" title={displayVotes.toString()}>
        {displayVotes}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 rounded-full ${
          netPendingVotes < 0 || pendingDownvotes > 0
            ? "text-destructive bg-destructive/10"
            : netPendingVotes > 0 || pendingUpvotes > 0
            ? "text-muted-foreground/50"
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => handleVote("down")}
        aria-label="Downvote"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
