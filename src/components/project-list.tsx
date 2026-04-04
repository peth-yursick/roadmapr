"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProjectCard } from "@/components/project-card";
import { useAuth } from "@/lib/auth-context";
import { reportClientError } from "@/hooks/use-error-reporter";

interface Project {
  id: string;
  name: string;
  project_handle: string;
  bio: string | null;
  total_votes?: number;
  created_at: string;
}

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbPaused, setDbPaused] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.error("[ProjectList] Fetch timeout - forcing loading to false");
        setError("Request timed out. Please refresh the page.");
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    async function fetchProjects() {
      try {
        console.log("[ProjectList] Fetching projects...");
        const res = await fetch("/api/projects?limit=50");

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          console.error("[ProjectList] API error:", res.status, data);
          if (data?.error === "database_paused") {
            if (mounted) setDbPaused(true);
            return;
          }
          throw new Error(`Failed to fetch projects: ${res.status}`);
        }

        const data = await res.json();
        console.log("[ProjectList] Received data:", data);
        if (mounted) {
          setProjects(data.projects || []);
        }
      } catch (err) {
        console.error("[ProjectList] Failed to fetch projects:", err);
        const msg = err instanceof Error ? err.message : "Unknown error";
        reportClientError(`[ProjectList] ${msg}`);
        if (mounted) {
          setError(msg);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
        clearTimeout(timeoutId);
      }
    }

    fetchProjects();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  function handleVoteChange(projectId: string, newVotes: number, userVote: boolean | null) {
    setProjects(prev =>
      prev.map(p =>
        p.id === projectId
          ? { ...p, total_votes: newVotes }
          : p
      )
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  if (dbPaused) {
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <div className="text-5xl mb-4">💤</div>
        <h2 className="text-xl font-semibold mb-2">Database is sleeping</h2>
        <p className="text-muted-foreground mb-4">
          The database has been paused due to inactivity. This usually takes a
          minute or two to wake up after being resumed.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          If you&apos;re the project admin, resume it from the{" "}
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80"
          >
            Supabase Dashboard
          </a>
          , then reload this page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm"
        >
          Reload Page
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-2">Error loading projects</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No projects yet</p>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Create First Project
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      <div>
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onVoteChange={handleVoteChange}
          />
        ))}
      </div>
    </div>
  );
}
