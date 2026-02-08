"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface SubmitFeatureDialogProps {
  projectId?: string;
  onSubmitted?: () => void;
}

export function SubmitFeatureDialog({ projectId, onSubmitted }: SubmitFeatureDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = title.trim().length > 0 && title.length <= 200;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      toast.error("Sign in with Farcaster to submit a feature");
      return;
    }

    if (!isValid) return;

    // Check if user has a valid FID
    if (!user.fid || user.fid === 0) {
      toast.error("Unable to submit feature: Invalid user ID. Please try logging in again.");
      console.error("Submit feature error: Invalid user.fid", { fid: user.fid, user });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(projectId ? { project_id: projectId } : {}),
          title: title.trim(),
          description: description.trim() || null,
          submitter_fid: user.fid,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to submit feature");
        console.error("Submit feature error:", data);
        return;
      }

      toast.success("Feature submitted!");
      setTitle("");
      setDescription("");
      setOpen(false);
      onSubmitted?.();
    } catch {
      toast.error("Failed to submit feature");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Submit Feature</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit a Feature Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Feature title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              autoFocus
            />
            <div className="text-xs text-muted-foreground mt-1 text-right">
              {title.length}/200
            </div>
          </div>
          <div>
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
            />
            <div className="text-xs text-muted-foreground mt-1 text-right">
              {description.length}/2000
            </div>
          </div>
          <Button type="submit" disabled={!isValid || isSubmitting} className="w-full">
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
