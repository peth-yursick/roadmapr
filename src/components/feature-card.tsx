"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { VoteButtons } from "@/components/vote-buttons";
import { timeAgo } from "@/lib/format";
import type { FeatureWithSubmitter } from "@/lib/types";

interface FeatureCardProps {
  feature: FeatureWithSubmitter;
  onVoteChange?: (featureId: string, newWeight: number, newUserVote: number | null) => void;
}

export function FeatureCard({ feature, onVoteChange }: FeatureCardProps) {
  const statusBadge = () => {
    switch (feature.status) {
      case "shipped":
        return <Badge variant="default">Shipped</Badge>;
      case "in_progress":
        return <Badge variant="secondary">In Progress</Badge>;
      case "hidden":
        return <Badge variant="destructive">Hidden</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-4 p-4 border-b border-border/50 hover:bg-muted/20 transition-colors">
      <VoteButtons
        featureId={feature.id}
        totalWeight={Number(feature.total_weight)}
        userVote={feature.user_vote ?? null}
        onVoteChange={(newWeight, newUserVote) =>
          onVoteChange?.(feature.id, newWeight, newUserVote)
        }
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/feature/${feature.id}`}
            className="text-base font-medium hover:text-primary transition-colors truncate"
          >
            {feature.title}
          </Link>
          {statusBadge()}
        </div>
        {feature.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {feature.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          {feature.submitter && (
            <span className="flex items-center gap-1">
              {feature.submitter.pfp_url && (
                <img
                  src={feature.submitter.pfp_url}
                  alt=""
                  className="w-4 h-4 rounded-full"
                />
              )}
              @{feature.submitter.username}
            </span>
          )}
          <span>{timeAgo(feature.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
