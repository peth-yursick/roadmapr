"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { FeatureCard } from "@/components/feature-card";
import { ProjectHeader } from "@/components/project-header";
import { TagFilter } from "@/components/tag-filter";
import { SubmitFeatureDialog } from "@/components/submit-feature-dialog";
import { useAuth } from "@/lib/auth-context";
import type { Project, FeatureWithSubmitter, NeynarUser } from "@/lib/types";

type StatusFilter = "all" | "open" | "shipped" | "hidden";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "shipped", label: "Shipped" },
  { value: "hidden", label: "Hidden" },
];

export default function ProjectPage() {
  const params = useParams();
  const handle = params.handle as string;
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [creator, setCreator] = useState<NeynarUser | null>(null);
  const [features, setFeatures] = useState<FeatureWithSubmitter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notFoundError, setNotFoundError] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch project data
  useEffect(() => {
    async function fetchProject() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/projects/${handle}`);
        if (!res.ok) {
          if (res.status === 404) {
            setNotFoundError(true);
            return;
          }
          throw new Error("Failed to fetch project");
        }
        const data = await res.json();
        setProject(data.project);
        setCreator(data.creator);
        setIsAdmin(data.isAdmin);
      } catch (err) {
        console.error("Failed to load project:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProject();
  }, [handle]);

  // Fetch features
  const fetchFeatures = useCallback(
    async (cursor?: string) => {
      if (!project) return null;

      const params = new URLSearchParams({
        project_id: project.id,
        status: filter,
        limit: "20",
      });
      if (cursor) params.set("cursor", cursor);
      if (user) params.set("voter_fid", user.fid.toString());
      if (selectedTags.length > 0) {
        params.set("tags", selectedTags.join(","));
      }

      const res = await fetch(`/api/features?${params}`);
      const data = await res.json();
      return data;
    },
    [project, filter, user, selectedTags]
  );

  const loadInitialFeatures = useCallback(async () => {
    if (!project) return;
    setIsLoadingFeatures(true);
    try {
      const data = await fetchFeatures();
      setFeatures(data?.features || []);
      setHasMore(data?.hasMore || false);
    } catch (err) {
      console.error("Failed to load features:", err);
    } finally {
      setIsLoadingFeatures(false);
    }
  }, [project, fetchFeatures]);

  useEffect(() => {
    if (project) {
      loadInitialFeatures();
    }
  }, [project, filter, selectedTags, loadInitialFeatures]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || features.length === 0) return;
    setLoadingMore(true);
    try {
      const lastFeature = features[features.length - 1];
      const data = await fetchFeatures(lastFeature.total_weight.toString());
      setFeatures((prev) => [...prev, ...(data?.features || [])]);
      setHasMore(data?.hasMore || false);
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

  const handleVoteChange = useCallback(
    (featureId: string, newWeight: number, newUserVote: number | null) => {
      setFeatures((prev) => {
        const updated = prev.map((f) =>
          f.id === featureId
            ? { ...f, total_weight: newWeight, user_vote: newUserVote }
            : f
        );
        return updated.sort(
          (a, b) => Number(b.total_weight) - Number(a.total_weight)
        );
      });
    },
    []
  );

  if (notFoundError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-2">Project not found</h1>
        <p className="text-muted-foreground mb-6">
          The project @{handle} doesn&apos;t exist or hasn&apos;t been created yet.
        </p>
        <Link
          href="/"
          className="text-primary hover:underline"
        >
          Go back home
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="border-b border-border/50 pb-6 mb-6">
          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
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
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <ProjectHeader project={project} creator={creator ?? undefined} isAdmin={isAdmin} />

      {/* Actions row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
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
        {user && (
          <SubmitFeatureDialog
            projectId={project.id}
            onSubmitted={() => loadInitialFeatures()}
          />
        )}
      </div>

      {/* Tag filter */}
      <TagFilter
        projectId={project.id}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
      />

      {/* Features list */}
      {isLoadingFeatures ? (
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
