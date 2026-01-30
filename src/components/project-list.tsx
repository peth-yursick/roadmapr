"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

interface Project {
  id: string;
  name: string;
  project_handle: string;
  bio: string | null;
  created_at: string;
}

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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
          <Link
            key={project.id}
            href={`/projects/${project.project_handle}`}
            className="block"
          >
            <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
              <h3 className="font-semibold text-lg">{project.name}</h3>
              {project.bio && (
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">{project.bio}</p>
              )}
              <p className="text-gray-400 text-xs mt-2">@{project.project_handle}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
