"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FeatureCard } from "@/components/feature-card";
import { useAuth } from "@/lib/auth-context";
import type { FeatureWithSubmitter } from "@/lib/types";

type StatusFilter = "all" | "open" | "shipped" | "hidden";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "shipped", label: "Shipped" },
  { value: "hidden", label: "Hidden" },
];

export function FeatureFeed() {
  const { user } = useAuth();
  const [features, setFeatures] = useState<FeatureWithSubmitter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchFeatures = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams({
        status: filter,
        limit: "20",
      });
      if (cursor) params.set("cursor", cursor);
      if (user) params.set("voter_fid", user.fid.toString());

      const res = await fetch(`/api/features?${params}`);
      const data = await res.json();
      return data;
    },
    [filter, user]
  );

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchFeatures();
      setFeatures(data.features || []);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Failed to load features:", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFeatures]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || features.length === 0) return;
    setLoadingMore(true);
    try {
      const lastFeature = features[features.length - 1];
      const data = await fetchFeatures(lastFeature.total_weight.toString());
      setFeatures((prev) => [...prev, ...(data.features || [])]);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, features, fetchFeatures]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const handleVoteChange = useCallback((featureId: string, newWeight: number, newUserVote: number | null) => {
    setFeatures((prev) => {
      const updated = prev.map((f) =>
        f.id === featureId
          ? { ...f, total_weight: newWeight, user_vote: newUserVote }
          : f
      );
      return updated.sort((a, b) => Number(b.total_weight) - Number(a.total_weight));
    });
  }, []);

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === f.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border-b border-border/50">
              <div className="flex flex-col items-center gap-1">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : features.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No features yet</p>
          <p className="text-sm mt-1">Be the first to submit a feature request!</p>
        </div>
      ) : (
        <>
          <div>
            {features.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                onVoteChange={handleVoteChange}
              />
            ))}
          </div>
          <div ref={loadMoreRef} className="py-4 text-center">
            {loadingMore && (
              <div className="text-sm text-muted-foreground">Loading more...</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Export refresh function for use after submissions
export function useFeatureFeedRefresh() {
  // This will be used to trigger a refresh of the feed
  // In practice, the feed component re-fetches on filter change
  return () => window.location.reload();
}
