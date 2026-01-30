"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ChevronUp } from "lucide-react";
import { useUser } from "@/contexts/user-context";

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
  const { user } = useUser();
  const [upvoting, setUvoting] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects?limit=50");
        const data = await res.json();
        setProjects(data.projects || []);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  async function handleUpvote(projectId: string) {
    if (!user?.fid) {
      alert("Please connect your Farcaster account to upvote");
      return;
    }

    setUvoting(prev => new Set(prev).add(projectId));

    try {
      const res = await fetch("/api/projects/upvote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          voter_fid: user.fid,
          voter_address: user.custodyAddress || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to upvote");
        return;
      }

      const data = await res.json();

      // Update local state
      setProjects(prev =>
        prev.map(p =>
          p.id === projectId
            ? { ...p, total_votes: (data.total_votes || 0) }
            : p
        )
      );
    } catch (err) {
      console.error("Upvote error:", err);
      alert("Failed to upvote");
    } finally {
      setUvoting(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading projects...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">No projects yet</p>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
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
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <div key={project.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <Link
                href={`/projects/${project.project_handle}`}
                className="flex-1"
              >
                <h3 className="font-semibold text-lg hover:text-blue-600 transition">{project.name}</h3>
                {project.bio && (
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">{project.bio}</p>
                )}
                <p className="text-gray-400 text-xs mt-2">@{project.project_handle}</p>
              </Link>

              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => handleUpvote(project.id)}
                  disabled={upvoting.has(project.id)}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {project.total_votes || 0}
                  </span>
                </button>
                <span className="text-xs text-gray-400">votes</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
