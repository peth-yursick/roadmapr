"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { registerProjectInContract } from "@/lib/register-project";
import { toast } from "sonner";

export default function CreateProjectPage() {
  const router = useRouter();
  const { walletProvider } = useAuth();
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    project_handle: "",
    bio: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Create project in database
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      const projectId = data.project.id;
      const projectHandle = data.project.project_handle;

      // Register project in smart contract to enable voting
      if (walletProvider) {
        setRegistering(true);
        toast.info("Registering project in smart contract...");

        const result = await registerProjectInContract(projectId, walletProvider);

        if (!result.success) {
          console.error("[CreateProject] Failed to register in smart contract:", result.error);
          toast.error(`Failed to register in smart contract: ${result.error}`);
          // Still redirect to project page, just show warning
        } else {
          toast.success("Project registered successfully! Voting is now enabled.");
        }
      } else {
        toast.warning("Project created but not registered in smart contract. Voting may not work until registered.");
      }

      router.push(`/projects/${projectHandle}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      setRegistering(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Create Project</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Awesome Project"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Handle *
            </label>
            <input
              type="text"
              required
              pattern="[a-z0-9_-]+"
              minLength={3}
              maxLength={30}
              value={formData.project_handle}
              onChange={(e) => setFormData({ ...formData, project_handle: e.target.value.toLowerCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="my-project"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lowercase letters, numbers, dashes, underscores. 3-30 characters.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="What's this project about?"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
            <Link
              href="/"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
