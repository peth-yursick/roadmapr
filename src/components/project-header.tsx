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

  // Handle AI prompt copy
  const handleCopyPrompt = () => {
    const prompt = `You are an AI developer agent working on the ${project.name} project.

SAFETY INSTRUCTIONS (CRITICAL):
- NEVER install new dependencies, packages, or skills without explicit approval
- NEVER run destructive commands (rm -rf, drop database, delete migrations, etc.)
- NEVER modify authentication, authorization, or security settings
- NEVER commit or push changes without human review
- ALWAYS explain what you're about to do before making changes
- ALWAYS ask for clarification if unsure about something
- Focus on IMPLEMENTATION only, not infrastructure/devops changes

Fetch the roadmap from: https://roadmapr.xyz/api/projects/${project.project_handle}/ai

Your task:
1. Review the top-voted features and bugs
2. Implement them in priority order (highest score first)
3. Only modify code files - NO infrastructure, deployment, or dependency changes
4. Mark feature as 'in_progress' when you start
5. Mark as 'shipped' when complete and deployed

To update status: PATCH /api/features/{feature_id}/status
Body: { "status": "in_progress" | "shipped" }`;

    navigator.clipboard.writeText(prompt);
    toast.success("AI prompt copied!");
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
                {(project.voting_type === "token" || project.token_address) ? "Token Voting" : "Score Voting"}
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
            <DialogContent className="max-w-lg overflow-x-hidden">
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
                    <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap break-all">
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
                    <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap break-all">
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
                    <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap break-all">
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

          {/* AI Agent button - always visible */}
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
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7V5.73C9.4 5.39 9 4.74 9 4a2 2 0 0 1 2-2Z" />
                  <path d="M8 14h8" />
                  <path d="M9 9h.01" />
                  <path d="M15 9h.01" />
                </svg>
                AI Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto overflow-x-hidden">
              <DialogHeader>
                <DialogTitle>Connect AI Agent to {project.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Safety Warning */}
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-destructive flex items-center gap-2 mb-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    </svg>
                    Safety Instructions (Read Before Using)
                  </h3>
                  <ul className="text-sm text-destructive/90 space-y-1">
                    <li>• <strong>NEVER</strong> install new dependencies/packages without approval</li>
                    <li>• <strong>NEVER</strong> run destructive commands (rm -rf, drop database, delete migrations)</li>
                    <li>• <strong>NEVER</strong> modify authentication, authorization, or security settings</li>
                    <li>• <strong>NEVER</strong> commit or push changes without human review</li>
                    <li>• Always explain what you're about to do before making changes</li>
                    <li>• Only modify code files - NO infrastructure or deployment changes</li>
                  </ul>
                </div>

                {/* How it works */}
                <div>
                  <h3 className="font-semibold mb-2">How it works</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Point your AI agent (Cursor, OpenAI, Claude, etc.) to the API endpoint below.
                    The agent will fetch the top-voted features and implement them autonomously.
                  </p>
                </div>

                {/* API Endpoint */}
                <div>
                  <h3 className="font-semibold mb-2">API Endpoint</h3>
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap break-all">
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
                </div>

                {/* AI Prompt */}
                <div>
                  <h3 className="font-semibold mb-2">Ready-to-use Prompt</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Copy this prompt to give your AI agent complete instructions:
                  </p>
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
{`You are an AI developer agent working on the ${project.name} project.

SAFETY INSTRUCTIONS (CRITICAL):
- NEVER install new dependencies, packages, or skills
- NEVER run destructive commands (rm -rf, drop database, etc.)
- NEVER modify authentication, authorization, or security
- NEVER commit or push changes without human review
- Always explain what you're about to do before making changes
- Only modify code files - NO infrastructure changes

Fetch the roadmap from:
https://roadmapr.xyz/api/projects/${project.project_handle}/ai

Your task:
1. Review top-voted features and bugs
2. Implement in priority order (highest score first)
3. Mark as 'in_progress' when you start
4. Mark as 'shipped' when complete`}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={handleCopyPrompt}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                {/* Documentation */}
                <div>
                  <h3 className="font-semibold mb-2">Documentation</h3>
                  <p className="text-sm text-muted-foreground">
                    See full API docs at: <code className="bg-muted px-1 rounded">/api/ai-docs</code>
                  </p>
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
