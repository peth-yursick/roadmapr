"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tag } from "@/lib/types";

interface TagFilterProps {
  projectId: string;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagFilter({ projectId, selectedTags, onTagsChange }: TagFilterProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTags();
  }, [projectId]);

  async function loadTags() {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // Get tags that are used by features in this project
      const { data, error } = await supabase
        .from("tags")
        .select(`
          *,
          feature_tags!inner(
            features!inner(project_id)
          )
        `)
        .eq("feature_tags.features.project_id", projectId)
        .order("name");

      if (error) {
        // Fallback: just get all predefined tags
        const { data: fallbackData } = await supabase
          .from("tags")
          .select("*")
          .eq("type", "predefined")
          .order("name");
        setTags(fallbackData || []);
      } else {
        // Deduplicate tags
        const uniqueTags = Array.from(
          new Map((data || []).map((t: Tag) => [t.id, t])).values()
        );
        setTags(uniqueTags);
      }
    } catch (err) {
      console.error("Failed to load tags:", err);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleTag(tagId: string) {
    const newSelected = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];
    onTagsChange(newSelected);
  }

  function clearAll() {
    onTagsChange([]);
  }

  if (isLoading) {
    return (
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-16 rounded-full bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground mr-1">Filter by tag:</span>
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => toggleTag(tag.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedTags.includes(tag.id)
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tag.name}
          </button>
        ))}
        {selectedTags.length > 0 && (
          <button
            onClick={clearAll}
            className="px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
