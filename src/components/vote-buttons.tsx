"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { formatWeight } from "@/lib/format";
import { toast } from "sonner";
import { ChevronUp, ChevronDown } from "lucide-react";

interface VoteButtonsProps {
  featureId: string;
  totalWeight: number;
  userVote: number | null;
  onVoteChange?: (newWeight: number, newUserVote: number | null) => void;
  compact?: boolean;
}

export function VoteButtons({
  featureId,
  totalWeight,
  userVote,
  onVoteChange,
  compact = false,
}: VoteButtonsProps) {
  const { user } = useAuth();
  const [isVoting, setIsVoting] = useState(false);
  const [currentWeight, setCurrentWeight] = useState(totalWeight);
  const [currentUserVote, setCurrentUserVote] = useState(userVote);

  async function handleVote(direction: "up" | "down") {
    if (!user) {
      toast.error("Sign in with Farcaster to vote");
      return;
    }

    setIsVoting(true);

    // If clicking the same direction they already voted, remove the vote
    const isRemove =
      (direction === "up" && currentUserVote !== null && currentUserVote > 0) ||
      (direction === "down" && currentUserVote !== null && currentUserVote < 0);

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature_id: featureId,
          voter_fid: user.fid,
          direction: isRemove ? "remove" : direction,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to vote");
        return;
      }

      setCurrentWeight(data.total_weight);
      setCurrentUserVote(data.user_vote);
      onVoteChange?.(data.total_weight, data.user_vote);
    } catch {
      toast.error("Failed to vote");
    } finally {
      setIsVoting(false);
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 rounded ${currentUserVote !== null && currentUserVote > 0 ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => handleVote("up")}
          disabled={isVoting}
          aria-label="Upvote"
        >
          <ChevronUp className="w-3 h-3" />
        </Button>
        <span
          className="text-xs font-semibold tabular-nums min-w-[2rem] text-center"
          title={currentWeight.toString()}
        >
          {formatWeight(currentWeight)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 rounded ${currentUserVote !== null && currentUserVote < 0 ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => handleVote("down")}
          disabled={isVoting}
          aria-label="Downvote"
        >
          <ChevronDown className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 rounded-full ${currentUserVote !== null && currentUserVote > 0 ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => handleVote("up")}
        disabled={isVoting}
        aria-label="Upvote"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </Button>
      <span
        className="text-sm font-semibold tabular-nums"
        title={currentWeight.toString()}
      >
        {formatWeight(currentWeight)}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 rounded-full ${currentUserVote !== null && currentUserVote < 0 ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => handleVote("down")}
        disabled={isVoting}
        aria-label="Downvote"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
