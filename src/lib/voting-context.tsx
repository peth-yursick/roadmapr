"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";

export interface PendingVote {
  projectId: string;
  projectName?: string;
  isUpvote: boolean;
}

interface VotingContextType {
  pendingVotes: Map<string, PendingVote>;
  addPendingVote: (projectId: string, projectName: string, isUpvote: boolean) => void;
  removePendingVote: (projectId: string) => void;
  hasPendingVote: (projectId: string) => boolean;
  getPendingVote: (projectId: string) => PendingVote | undefined;
  clearPendingVotes: () => void;
  getTotalVotes: () => number;
}

const VotingContext = createContext<VotingContextType>({
  pendingVotes: new Map(),
  addPendingVote: () => {},
  removePendingVote: () => {},
  hasPendingVote: () => false,
  getPendingVote: () => undefined,
  clearPendingVotes: () => {},
  getTotalVotes: () => 0,
});

export function VotingProvider({ children }: { children: ReactNode }) {
  const [pendingVotes, setPendingVotes] = useState<Map<string, PendingVote>>(new Map());

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("pendingVotes");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPendingVotes(new Map(Object.entries(parsed)));
      } catch (e) {
        console.error("Failed to parse pending votes:", e);
      }
    }
  }, []);

  // Save to localStorage when pendingVotes changes
  useEffect(() => {
    if (pendingVotes.size > 0) {
      const obj = Object.fromEntries(pendingVotes);
      localStorage.setItem("pendingVotes", JSON.stringify(obj));
    } else {
      localStorage.removeItem("pendingVotes");
    }
  }, [pendingVotes]);

  const addPendingVote = useCallback((projectId: string, projectName: string, isUpvote: boolean) => {
    setPendingVotes((prev) => {
      const next = new Map(prev);
      next.set(projectId, { projectId, projectName, isUpvote });
      return next;
    });
  }, []);

  const removePendingVote = useCallback((projectId: string) => {
    setPendingVotes((prev) => {
      const next = new Map(prev);
      next.delete(projectId);
      return next;
    });
  }, []);

  const hasPendingVote = useCallback((projectId: string): boolean => {
    return pendingVotes.has(projectId);
  }, [pendingVotes]);

  const getPendingVote = useCallback((projectId: string): PendingVote | undefined => {
    return pendingVotes.get(projectId);
  }, [pendingVotes]);

  const clearPendingVotes = useCallback(() => {
    setPendingVotes(new Map());
  }, []);

  const getTotalVotes = useCallback((): number => {
    return pendingVotes.size;
  }, [pendingVotes.size]);

  return (
    <VotingContext.Provider
      value={{
        pendingVotes,
        addPendingVote,
        removePendingVote,
        hasPendingVote,
        getPendingVote,
        clearPendingVotes,
        getTotalVotes,
      }}
    >
      {children}
    </VotingContext.Provider>
  );
}

export function useVoting() {
  return useContext(VotingContext);
}
