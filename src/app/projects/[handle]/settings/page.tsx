"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import type { Project, ProjectAdmin, NeynarUser } from "@/lib/types";

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const handle = params.handle as string;
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [admins, setAdmins] = useState<(ProjectAdmin & { user?: NeynarUser })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Form state
  const [bio, setBio] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [feeRecipient, setFeeRecipient] = useState("");
  const [voteIncrement, setVoteIncrement] = useState("");
  const [voteIncrementUsd, setVoteIncrementUsd] = useState("");
  const [newAdminFid, setNewAdminFid] = useState("");

  // Fetch project data
  useEffect(() => {
    async function fetchProject() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/projects/${handle}`);
        if (!res.ok) {
          if (res.status === 404 || res.status === 403) {
            router.push(`/projects/${handle}`);
            return;
          }
          throw new Error("Failed to fetch project");
        }
        const data = await res.json();

        if (!data.isAdmin) {
          router.push(`/projects/${handle}`);
          return;
        }

        setProject(data.project);
        setAdmins(data.admins || []);
        setIsAdmin(data.isAdmin);
        setIsOwner(data.isOwner);

        // Populate form
        setBio(data.project.bio || "");
        setExternalLink(data.project.external_link || "");
        setWebsiteUrl(data.project.website_url || "");
        setFeeRecipient(data.project.fee_recipient_address || "");
        setVoteIncrement(data.project.vote_increment?.toString() || "1");
        setVoteIncrementUsd(data.project.vote_increment_usd?.toString() || "");
      } catch (err) {
        console.error("Failed to load project:", err);
        toast.error("Failed to load project settings");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProject();
  }, [handle, router]);

  async function handleSave() {
    if (!project) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/projects/${handle}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          external_link: externalLink || null,
          website_url: websiteUrl || null,
          fee_recipient_address: feeRecipient || null,
          vote_increment: voteIncrement ? parseFloat(voteIncrement) : 1,
          vote_increment_usd: voteIncrementUsd ? parseFloat(voteIncrementUsd) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success("Settings saved");
    } catch (err) {
      console.error("Failed to save:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddAdmin() {
    if (!newAdminFid || !project) return;

    try {
      const res = await fetch(`/api/projects/${handle}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: parseInt(newAdminFid) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add admin");
      }

      const data = await res.json();
      setAdmins((prev) => [...prev, data.admin]);
      setNewAdminFid("");
      toast.success("Admin added");
    } catch (err) {
      console.error("Failed to add admin:", err);
      toast.error(err instanceof Error ? err.message : "Failed to add admin");
    }
  }

  async function handleRemoveAdmin(adminId: string) {
    try {
      const res = await fetch(`/api/projects/${handle}/admins/${adminId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove admin");
      }

      setAdmins((prev) => prev.filter((a) => a.id !== adminId));
      toast.success("Admin removed");
    } catch (err) {
      console.error("Failed to remove admin:", err);
      toast.error(err instanceof Error ? err.message : "Failed to remove admin");
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!project || !isAdmin) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back link */}
      <Link
        href={`/projects/${handle}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to {project.name}
      </Link>

      <h1 className="text-2xl font-bold mb-6">Project Settings</h1>

      <div className="space-y-8">
        {/* Basic Info */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium mb-1.5">Bio</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your project..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {bio.length}/500 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              External Link
            </label>
            <Input
              type="url"
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              placeholder="https://yourproject.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Website URL
            </label>
            <Input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourproject.com"
            />
          </div>
        </section>

        {/* Token Voting Settings (only for token voting projects) */}
        {project.voting_type === "token" && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Token Voting Settings</h2>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Fee Recipient Address
              </label>
              <Input
                type="text"
                value={feeRecipient}
                onChange={(e) => setFeeRecipient(e.target.value)}
                placeholder="0x..."
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Where 1% voting fees will be sent. Leave empty to use project
                creator&apos;s address.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Vote Increment (tokens)
                </label>
                <Input
                  type="number"
                  value={voteIncrement}
                  onChange={(e) => setVoteIncrement(e.target.value)}
                  placeholder="1000000"
                  min="1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tokens per vote
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  USD Value per Vote
                </label>
                <Input
                  type="number"
                  value={voteIncrementUsd}
                  onChange={(e) => setVoteIncrementUsd(e.target.value)}
                  placeholder="0.01"
                  step="0.0001"
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current market value
                </p>
              </div>
            </div>

            {voteIncrement && voteIncrementUsd && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <strong>Confirmation:</strong> Each vote costs{" "}
                {parseFloat(voteIncrement).toLocaleString()} tokens (~$
                {parseFloat(voteIncrementUsd).toFixed(4)} USD)
              </div>
            )}
          </section>
        )}

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>

        {/* Admin Management (only for owner) */}
        {isOwner && (
          <section className="space-y-4 pt-6 border-t">
            <h2 className="text-lg font-semibold">Project Admins</h2>
            <p className="text-sm text-muted-foreground">
              Admins can update feature statuses and manage roadmap items.
            </p>

            {/* Current admins */}
            <div className="space-y-2">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {admin.user?.pfp_url && (
                      <img
                        src={admin.user.pfp_url}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="text-sm">
                      {admin.user?.username
                        ? `@${admin.user.username}`
                        : `FID: ${admin.fid}`}
                    </span>
                    {admin.role === "owner" && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        Owner
                      </span>
                    )}
                  </div>
                  {admin.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAdmin(admin.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add new admin */}
            <div className="flex gap-2">
              <Input
                type="number"
                value={newAdminFid}
                onChange={(e) => setNewAdminFid(e.target.value)}
                placeholder="Enter Farcaster FID"
                className="flex-1"
              />
              <Button
                onClick={handleAddAdmin}
                disabled={!newAdminFid}
                variant="outline"
              >
                Add Admin
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
