"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Project, NeynarUser } from "@/lib/types";

interface ProjectHeaderProps {
  project: Project;
  creator?: NeynarUser;
  isAdmin?: boolean;
}

export function ProjectHeader({ project, creator, isAdmin }: ProjectHeaderProps) {
  // Handle share button click
  const handleShare = () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied! Share to open in Farcaster miniapp.");
  };

  return (
    <div className="border-b border-border/50 pb-6 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Project Avatar */}
          {project.avatar_url ? (
            <img
              src={project.avatar_url}
              alt={project.name}
              className="w-16 h-16 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {project.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{project.name}</h1>
              {project.is_verified && (
                <Badge variant="secondary" className="gap-1">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-blue-500"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                  Verified
                </Badge>
              )}
              <Badge variant="outline">
                {project.voting_type === "score" ? "Score Voting" : "Token Voting"}
              </Badge>
            </div>

            {project.bio && (
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                {project.bio}
              </p>
            )}

            <div className="flex items-center gap-4 mt-3 flex-wrap text-sm">
              {/* Creator */}
              {creator && (
                <Link
                  href={`https://warpcast.com/${creator.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {creator.pfp_url && (
                    <img
                      src={creator.pfp_url}
                      alt=""
                      className="w-4 h-4 rounded-full"
                    />
                  )}
                  <span>by @{creator.username}</span>
                </Link>
              )}

              {/* External link */}
              {project.external_link && (
                <Link
                  href={project.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg
                    width="14"
                    height="14"
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
                  <span className="truncate max-w-[200px]">
                    {project.external_link.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </span>
                </Link>
              )}

              {/* Token info for token voting projects */}
              {project.voting_type === "token" && project.token_address && (
                <span className="text-muted-foreground">
                  {project.vote_increment} tokens/vote
                  {project.vote_increment_usd && (
                    <span className="text-xs ml-1">
                      (~${project.vote_increment_usd.toFixed(4)})
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {/* Share button - always visible */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleShare}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share
          </Button>

          {/* Admin settings button */}
          {isAdmin && (
            <Link href={`/projects/${project.project_handle}/settings`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Settings
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
