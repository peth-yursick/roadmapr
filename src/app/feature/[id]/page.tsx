"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VoteButtons } from "@/components/vote-buttons";
import { useAuth } from "@/lib/auth-context";
import { timeAgo, formatWeight } from "@/lib/format";
import { toast } from "sonner";
import type { FeatureWithDetails, FeatureWithSubmitter, FeatureSource, Tag, Project } from "@/lib/types";

interface FeatureDetailData extends FeatureWithSubmitter {
  project?: Project;
  sources?: FeatureSource[];
  sub_items?: FeatureWithSubmitter[];
  tags?: Tag[];
}

export default function FeatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, isAuthorizedMarker } = useAuth();
  const [feature, setFeature] = useState<FeatureDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams();
        if (user) params.set("voter_fid", user.fid.toString());
        params.set("include_details", "true");

        const res = await fetch(`/api/features/${id}?${params}`);
        const data = await res.json();

        if (res.ok) {
          setFeature(data.feature);
        }
      } catch (err) {
        console.error("Failed to load feature:", err);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [id, user]);

  async function handleStatusChange(newStatus: string) {
    if (!user || !feature) return;

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/features/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          marker_fid: user.fid,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to update status");
        return;
      }

      setFeature((prev) => prev ? { ...prev, ...data.feature } : null);
      toast.success(`Feature marked as ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function handleSubItemVoteChange(featureId: string, newWeight: number, newUserVote: number | null) {
    setFeature((prev) => {
      if (!prev || !prev.sub_items) return prev;
      return {
        ...prev,
        sub_items: prev.sub_items.map((item) =>
          item.id === featureId
            ? { ...item, total_weight: newWeight, user_vote: newUserVote }
            : item
        ).sort((a, b) => Number(b.total_weight) - Number(a.total_weight)),
      };
    });
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-lg text-muted-foreground">Feature not found</p>
        <Link href="/" className="text-sm text-primary hover:underline mt-2 inline-block">
          Back to feed
        </Link>
      </div>
    );
  }

  const statusBadge = () => {
    switch (feature.status) {
      case "shipped":
        return <Badge variant="default" className="bg-green-600">Shipped</Badge>;
      case "in_progress":
        return <Badge variant="secondary">In Progress</Badge>;
      case "hidden":
        return <Badge variant="destructive">Hidden</Badge>;
      default:
        return <Badge variant="outline">Open</Badge>;
    }
  };

  // Determine back link based on project
  const backLink = feature.project?.project_handle
    ? `/projects/${feature.project.project_handle}`
    : "/";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link
        href={backLink}
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {feature.project?.name ? `Back to ${feature.project.name}` : "Back to feed"}
      </Link>

      {/* Main feature */}
      <div className="flex gap-6 mb-6">
        <VoteButtons
          featureId={feature.id}
          totalWeight={Number(feature.total_weight)}
          userVote={feature.user_vote ?? null}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h1 className="text-xl font-bold">{feature.title}</h1>
            {statusBadge()}
          </div>

          {/* Tags */}
          {feature.tags && feature.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mb-3">
              {feature.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {feature.description && (
            <p className="text-muted-foreground whitespace-pre-wrap mb-4">
              {feature.description}
            </p>
          )}

          <div className="text-sm text-muted-foreground mb-4">
            Submitted {timeAgo(feature.created_at)}
            {feature.submitter && (
              <span>
                {" "}by{" "}
                <span className="inline-flex items-center gap-1">
                  {feature.submitter.pfp_url && (
                    <img
                      src={feature.submitter.pfp_url}
                      alt=""
                      className="w-4 h-4 rounded-full inline"
                    />
                  )}
                  @{feature.submitter.username}
                </span>
              </span>
            )}
          </div>

          {/* Token claimable info for shipped features */}
          {feature.status === "shipped" && feature.tokens_claimable > 0 && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
              <p className="text-sm text-green-600 dark:text-green-400">
                <strong>{formatWeight(feature.tokens_claimable)}</strong> tokens available to claim
              </p>
            </div>
          )}

          {/* Admin actions */}
          {isAuthorizedMarker && feature.status !== "shipped" && (
            <div className="flex gap-2 pt-4 border-t border-border">
              {feature.status !== "in_progress" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleStatusChange("in_progress")}
                  disabled={isUpdatingStatus}
                >
                  Mark In Progress
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => handleStatusChange("shipped")}
                disabled={isUpdatingStatus}
                className="bg-green-600 hover:bg-green-700"
              >
                Mark Shipped
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Source casts */}
      {feature.sources && feature.sources.length > 0 && (
        <div className="border border-border rounded-lg p-4 mb-6">
          <h2 className="font-semibold mb-3">Original Requests ({feature.sources.length})</h2>
          <div className="space-y-3">
            {feature.sources.map((source) => (
              <div key={source.id} className="border-l-2 border-primary/30 pl-3">
                {source.source_cast_text && (
                  <p className="text-sm text-muted-foreground mb-1">
                    {source.source_cast_text}
                  </p>
                )}
                <Link
                  href={`https://warpcast.com/~/conversations/${source.source_cast_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  View on Warpcast
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-items / Implementation options */}
      {feature.sub_items && feature.sub_items.length > 0 && (
        <div className="border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Implementation Options</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Vote on how this should be built:
          </p>
          <div className="space-y-3">
            {feature.sub_items
              .sort((a, b) => Number(b.total_weight) - Number(a.total_weight))
              .map((subItem) => (
                <div
                  key={subItem.id}
                  className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  <VoteButtons
                    featureId={subItem.id}
                    totalWeight={Number(subItem.total_weight)}
                    userVote={subItem.user_vote ?? null}
                    compact
                    onVoteChange={(newWeight, newUserVote) =>
                      handleSubItemVoteChange(subItem.id, newWeight, newUserVote)
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{subItem.title}</h3>
                    {subItem.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {subItem.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
