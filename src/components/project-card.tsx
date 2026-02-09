"use client";

import Link from "next/link";
import { ProjectVoteButtons } from "@/components/project-vote-buttons";

interface Project {
  id: string;
  name: string;
  project_handle: string;
  bio: string | null;
  total_votes?: number;
}

interface ProjectCardProps {
  project: Project;
  onVoteChange?: (projectId: string, newVotes: number, userVote: boolean | null) => void;
}

export function ProjectCard({ project, onVoteChange }: ProjectCardProps) {
  return (
    <div className="flex gap-4 p-4 border-b border-border/50 hover:bg-muted/20 transition-colors group">
      <ProjectVoteButtons
        projectId={project.id}
        projectName={project.name}
        totalVotes={project.total_votes || 0}
        onVoteChange={(newVotes, userVote) => onVoteChange?.(project.id, newVotes, userVote)}
      />
      <Link
        href={`/projects/${project.project_handle}`}
        className="flex-1 min-w-0"
      >
        <div className="text-base font-medium group-hover:text-primary transition-colors">
          {project.name}
        </div>
        {project.bio && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {project.bio}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">@{project.project_handle}</p>
      </Link>
    </div>
  );
}
