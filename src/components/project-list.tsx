"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ChevronUp, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { voteOnProject } from "@/lib/contract-client";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  project_handle: string;
  bio: string | null;
  total_votes?: number;
  token_address?: string | null;
  vote_increment?: number | null;
  created_at: string;
}

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, walletProvider } = useAuth();
  const [voting, setVoting] = useState<Set<string>>(new Set());
  const [userVotes, setUserVotes] = useState<Record<string, boolean>>({}); // true = upvote, false = downvote

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects?limit=50");
        const data = await res.json();
        setProjects(data.projects || []);

        // Fetch user's votes
        if (user?.fid) {
          const votesRes = await fetch("/api/projects/user-votes");
          if (votesRes.ok) {
            const votesData = await votesRes.json();
            const votesMap: Record<string, boolean> = {};
            votesData.votes?.forEach((v: { project_id: string; is_upvote: boolean }) => {
              votesMap[v.project_id] = v.is_upvote;
            });
            setUserVotes(votesMap);
          }
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [user]);

  async function handleVote(projectId: string, isUpvote: boolean) {
    if (!user?.fid) {
      toast.error("Please connect your Farcaster account to vote");
      return;
    }

    if (!walletProvider) {
      toast.error("Wallet not connected. Open in Farcaster miniapp.");
      return;
    }

    const project = projects.find(p => p.id === projectId);
    if (!project?.token_address || !project.vote_increment) {
      toast.error("This project doesn't support token voting yet");
      return;
    }

    // Check if already voted
    if (userVotes[projectId] !== undefined) {
      toast.error("You've already voted on this project");
      return;
    }

    setVoting(prev => new Set(prev).add(projectId));

    try {
      const voteAmount = BigInt(project.vote_increment);

      // Vote on-chain (collects 1% fee)
      const txHash = await voteOnProject(projectId, voteAmount, isUpvote, walletProvider);

      // Record in database
      const res = await fetch("/api/projects/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          voter_fid: user.fid,
          voter_address: user?.custodyAddress || null,
          is_upvote: isUpvote,
          vote_amount: project.vote_increment,
          tx_hash: txHash,
          token_address: project.token_address,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record vote");
      }

      const data = await res.json();

      // Update local state
      setUserVotes(prev => ({ ...prev, [projectId]: isUpvote }));
      setProjects(prev =>
        prev.map(p =>
          p.id === projectId
            ? { ...p, total_votes: (data.total_votes || 0) }
            : p
        )
      );

      toast.success(`${isUpvote ? "Upvote" : "Downvote"} recorded! TX: ${txHash.slice(0, 10)}...`);
    } catch (err) {
      console.error("Vote error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to vote");
    } finally {
      setVoting(prev => {
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
        {projects.map((project) => {
          const userVote = userVotes[project.id];
          const hasVoted = userVote !== undefined;

          return (
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVote(project.id, true)}
                      disabled={voting.has(project.id) || hasVoted}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        userVote === true
                          ? "bg-green-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-green-100"
                      }`}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium px-2 py-2">
                      {project.total_votes || 0}
                    </span>
                    <button
                      onClick={() => handleVote(project.id, false)}
                      disabled={voting.has(project.id) || hasVoted}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        userVote === false
                          ? "bg-red-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-red-100"
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">
                    {hasVoted ? "Voted" : "Vote"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
