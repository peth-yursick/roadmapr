"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { registerProjectInContract } from "@/lib/register-project";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/header";

type VotingType = "score" | "token";

export default function CreateProjectPage() {
  const router = useRouter();
  const { walletProvider } = useAuth();
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const [votingType, setVotingType] = useState<VotingType>("score");

  const [formData, setFormData] = useState({
    name: "",
    project_handle: "",
    bio: "",
    voting_type: "score" as VotingType,
    token_address: "",
    chain: "base",
    vote_increment: "",
    vote_increment_usd: "",
    fee_recipient_address: "",
    external_link: "",
    website_url: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validation for token voting
    if (votingType === "token") {
      if (!formData.token_address) {
        setError("Token address is required for token voting");
        return;
      }
      if (!formData.vote_increment || parseFloat(formData.vote_increment) <= 0) {
        setError("Vote increment must be a positive number");
        return;
      }
      if (!formData.vote_increment_usd || parseFloat(formData.vote_increment_usd) <= 0) {
        setError("USD value per vote is required");
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        project_handle: formData.project_handle,
        bio: formData.bio || null,
        voting_type: votingType,
        ...(votingType === "token" && {
          token_address: formData.token_address,
          chain: formData.chain || "base",
          vote_increment: parseFloat(formData.vote_increment),
          vote_increment_usd: parseFloat(formData.vote_increment_usd),
        }),
        fee_recipient_address: formData.fee_recipient_address || null,
        external_link: formData.external_link || null,
        website_url: formData.website_url || null,
      };

      // Create project in database
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      const projectId = data.project.id;
      const projectHandle = data.project.project_handle;

      // Register project in smart contract to enable voting
      if (walletProvider && votingType === "token") {
        setRegistering(true);
        toast.info("Registering project in smart contract...");

        const result = await registerProjectInContract(projectId, walletProvider);

        if (!result.success) {
          console.error("[CreateProject] Failed to register:", result.error);
          toast.error(`Failed to register: ${result.error}`);
        } else {
          toast.success("Project registered! Voting enabled.");
        }
      } else if (!walletProvider && votingType === "token") {
        toast.warning("Project created. Connect wallet to register for voting.");
      }

      router.push(`/projects/${projectHandle}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setLoading(false);
      setRegistering(false);
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
          <h1 className="text-2xl font-bold">Create Project</h1>
          <p className="text-muted-foreground text-sm">
            Set up a new project for the community to vote on
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Basic Info Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Basic Information</h2>

            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Project Name <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                required
                maxLength={100}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Awesome Project"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max 100 characters
              </p>
            </div>

            {/* Handle */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Handle <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">@</span>
                <Input
                  type="text"
                  required
                  pattern="[a-z0-9_-]+"
                  minLength={3}
                  maxLength={30}
                  value={formData.project_handle}
                  onChange={(e) => setFormData({ ...formData, project_handle: e.target.value.toLowerCase() })}
                  placeholder="my-project"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Lowercase, numbers, dashes, underscores. 3-30 characters.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="What's this project about?"
                rows={3}
              />
            </div>

            {/* Website URL */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Website URL <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                placeholder="https://myproject.com"
              />
            </div>

            {/* External Link */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Documentation/Github URL <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                type="url"
                value={formData.external_link}
                onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                placeholder="https://github.com/myproject"
              />
            </div>
          </div>

          {/* Voting Settings Section */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <h2 className="text-sm font-semibold text-foreground">Voting Settings</h2>

            {/* Voting Type */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Voting Type <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVotingType("score")}
                  className={`p-3 rounded-lg border text-left transition ${
                    votingType === "score"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="font-medium text-sm">Reputation Score</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Vote with your Farcaster reputation
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setVotingType("token")}
                  className={`p-3 rounded-lg border text-left transition ${
                    votingType === "token"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="font-medium text-sm">Token Voting</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Vote with tokens (e.g., $ROAD)
                  </div>
                </button>
              </div>
            </div>

            {/* Token Voting Fields */}
            {votingType === "token" && (
              <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    Configure token voting parameters. Make sure users have approved the token contract before voting.
                  </p>
                </div>

                {/* Token Address */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Token Contract Address <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    required={votingType === "token"}
                    value={formData.token_address}
                    onChange={(e) => setFormData({ ...formData, token_address: e.target.value })}
                    placeholder="0x..."
                    pattern="^0x[a-fA-F0-9]{40}$"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ERC-20 token address on Base chain
                  </p>
                </div>

                {/* Chain */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Blockchain <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.chain}
                    onChange={(e) => setFormData({ ...formData, chain: e.target.value })}
                    placeholder="base"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Defaults to "base" if not specified
                  </p>
                </div>

                {/* Vote Increment */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Vote Increment <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    required={votingType === "token"}
                    min="0"
                    step="any"
                    value={formData.vote_increment}
                    onChange={(e) => setFormData({ ...formData, vote_increment: e.target.value })}
                    placeholder="1000000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of tokens required per vote (e.g., 1000000 for 1M)
                  </p>
                </div>

                {/* Vote Increment USD */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    USD Value per Vote <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    required={votingType === "token"}
                    min="0"
                    step="0.01"
                    value={formData.vote_increment_usd}
                    onChange={(e) => setFormData({ ...formData, vote_increment_usd: e.target.value })}
                    placeholder="0.50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Approximate USD value for user confirmation
                  </p>
                </div>

                {/* Fee Recipient */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Fee Recipient Address <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.fee_recipient_address}
                    onChange={(e) => setFormData({ ...formData, fee_recipient_address: e.target.value })}
                    placeholder="0x..."
                    pattern="^0x[a-fA-F0-9]{40}$"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Address to receive 1% voting fees (defaults to creator)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading || registering}
              className="flex-1"
            >
              {loading ? "Creating..." : registering ? "Registering..." : "Create Project"}
            </Button>
            <Link href="/">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
