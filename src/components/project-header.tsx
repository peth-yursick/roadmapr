"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

  // Handle embed code copy
  const handleCopyEmbed = () => {
    const embedCode = `<iframe src="https://roadmapr.xyz/embed/${project.id}" width="100%" height="600" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    toast.success("Embed code copied!");
  };

  // Handle AI endpoint copy
  const handleCopyAI = () => {
    const aiEndpoint = `https://roadmapr.xyz/api/projects/${project.project_handle}/ai`;
    navigator.clipboard.writeText(aiEndpoint);
    toast.success("AI endpoint copied!");
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

          {/* Embed button - always visible */}
          <Dialog>
            <DialogTrigger asChild>
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
                  <path d="M15 3h6v6" />
                  <path d="M10 14L21 3" />
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
                Embed
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Embed {project.name} in your app</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Web Embed */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Web Embed (iframe)</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add this iframe to your website to display the live feature feed:
                  </p>
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      &lt;iframe src="https://roadmapr.xyz/embed/{project.id}" width="100%" height="600" frameborder="0"&gt;&lt;/iframe&gt;
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={handleCopyEmbed}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                {/* AI Agent Integration */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">AI Agent Integration</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Point your AI agent (like Cursor, OpenAI, etc.) to this API endpoint to autonomously implement top-voted features:
                  </p>
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      https://roadmapr.xyz/api/projects/{project.project_handle}/ai
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={handleCopyAI}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    The AI endpoint returns prioritized features with implementation instructions.
                  </p>
                </div>

                {/* Farcaster Miniapp */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Farcaster Miniapp</h3>
                  <p className="text-sm text-muted-foreground">
                    Share this link to open as a Farcaster miniapp:
                  </p>
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      https://roadmapr.xyz/projects/{project.project_handle}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        navigator.clipboard.writeText(`https://roadmapr.xyz/projects/${project.project_handle}`);
                        toast.success("Miniapp link copied!");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
