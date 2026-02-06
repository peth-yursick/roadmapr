"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { registerProject } from "@/lib/contract-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/header";

// Fixed values for main page voting - all projects use the same token
const ROAD_TOKEN_ADDRESS = "0xc7aaba6e953a1c0436295cfaaa9b3ab475eb07" as const;
const VOTE_INCREMENT = 1000000; // 1 million tokens

export default function RegisterProjectPage() {
  const router = useRouter();
  const { walletProvider, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [projectId, setProjectId] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!walletProvider) {
      setError("Please connect your wallet. Open in the Farcaster miniapp to sign in.");
      setLoading(false);
      return;
    }

    if (!projectId) {
      setError("Project ID is required");
      setLoading(false);
      return;
    }

    try {
      // Register in the smart contract with fixed values
      const txHash = await registerProject(
        projectId,
        ROAD_TOKEN_ADDRESS,
        VOTE_INCREMENT,
        walletProvider
      );

      // Update database with registration info
      const recordRes = await fetch(`/api/register-project/${projectId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash,
          tokenAddress: ROAD_TOKEN_ADDRESS,
        }),
      });

      if (!recordRes.ok) {
        console.warn("Failed to record registration in database, but smart contract registration succeeded");
      }

      setSuccess(true);
      toast.success(`Project registered! TX: ${txHash}`);

      // Clear form
      setProjectId("");
    } catch (err: any) {
      setError(err.message || "Failed to register project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to projects
        </Link>

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Register Project in Smart Contract</h1>
          <p className="text-muted-foreground text-sm">
            Register any project in the Roadmapr voting contract to enable token voting on the main page
          </p>
        </div>

        {/* Info banner */}
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-6">
          <p className="text-sm">
            <strong>How it works:</strong><br />
            All main page projects use the same voting configuration ($ROAD token, 1M tokens per vote).
            Once registered, users can vote on the project from the main projects page.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
              ✓ Project registered successfully! Users can now vote on this project.
            </div>
          )}

          {/* Project ID */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Project ID <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="cd1835f0-81e6-4003-a5b2-2234fff6ffe8"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The project's UUID. You can find this in the URL when viewing a project page.
            </p>
          </div>

          {/* Fixed configuration notice */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <strong>Voting configuration:</strong>
            <ul className="list-disc list-inside text-xs text-muted-foreground mt-1 space-y-1">
              <li>Token: $ROAD (0xc7aaba6e953a1c0436295cfaaa9b3ab475eb07)</li>
              <li>Vote increment: 1,000,000 tokens</li>
              <li>Chain: Base</li>
            </ul>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading || !walletProvider || !projectId}
            className="w-full"
          >
            {!walletProvider
              ? "Connect wallet to continue"
              : loading
              ? "Registering..."
              : "Register Project"}
          </Button>

          {!walletProvider && (
            <p className="text-xs text-muted-foreground text-center">
              Open this page in the Farcaster miniapp to connect your wallet
            </p>
          )}
        </form>

        {/* Common Project IDs */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <h2 className="text-sm font-semibold mb-3">Quick Register: Popular Projects</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
              <span className="font-medium">Farcaster Protocol</span>
              <button
                type="button"
                onClick={() => {
                  setProjectId("00000000-0000-0000-0000-000000000001");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-xs text-primary hover:underline"
              >
                Use this ID
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
              <span className="font-medium">Roadmapr</span>
              <button
                type="button"
                onClick={() => {
                  setProjectId("cd1835f0-81e6-4003-a5b2-2234fff6ffe8");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-xs text-primary hover:underline"
              >
                Use this ID
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Click "Use this ID" to auto-fill the form
          </p>
        </div>
      </main>
    </div>
  );
}
