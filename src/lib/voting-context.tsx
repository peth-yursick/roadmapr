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
  pendingVotes: PendingVote[];
  addPendingVote: (projectId: string, projectName: string, isUpvote: boolean) => void;
  removePendingVote: (projectId: string, isUpvote: boolean) => void;
  getPendingVotesForProject: (projectId: string) => PendingVote[];
  getTotalVotes: () => number;
  clearPendingVotes: () => void;
}

const VotingContext = createContext<VotingContextType>({
  pendingVotes: [],
  addPendingVote: () => {},
  removePendingVote: () => {},
  getPendingVotesForProject: () => [],
  getTotalVotes: () => 0,
  clearPendingVotes: () => {},
});

export function VotingProvider({ children }: { children: ReactNode }) {
  const [pendingVotes, setPendingVotes] = useState<PendingVote[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("pendingVotesArray");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPendingVotes(parsed);
      } catch (e) {
        console.error("Failed to parse pending votes:", e);
      }
    }
  }, []);

  // Save to localStorage when pendingVotes changes
  useEffect(() => {
    if (pendingVotes.length > 0) {
      localStorage.setItem("pendingVotesArray", JSON.stringify(pendingVotes));
    } else {
      localStorage.removeItem("pendingVotesArray");
    }
  }, [pendingVotes]);

  const addPendingVote = useCallback((projectId: string, projectName: string, isUpvote: boolean) => {
    setPendingVotes((prev) => {
      // Add a new vote to the array (allows multiple votes per project)
      return [...prev, { projectId, projectName, isUpvote }];
    });
  }, []);

  const removePendingVote = useCallback((projectId: string, isUpvote: boolean) => {
    setPendingVotes((prev) => {
      // Remove the most recent vote for this project with matching direction
      const index = [...prev].reverse().findIndex(
        v => v.projectId === projectId && v.isUpvote === isUpvote
      );
      if (index !== -1) {
        const actualIndex = prev.length - 1 - index;
        return prev.filter((_, i) => i !== actualIndex);
      }
      return prev;
    });
  }, []);

  const getPendingVotesForProject = useCallback((projectId: string): PendingVote[] => {
    return pendingVotes.filter(v => v.projectId === projectId);
  }, [pendingVotes]);

  const clearPendingVotes = useCallback(() => {
    setPendingVotes([]);
  }, []);

  const getTotalVotes = useCallback((): number => {
    return pendingVotes.length;
  }, [pendingVotes.length]);

  return (
    <VotingContext.Provider
      value={{
        pendingVotes,
        addPendingVote,
        removePendingVote,
        getPendingVotesForProject,
        getTotalVotes,
        clearPendingVotes,
      }}
    >
      {children}
    </VotingContext.Provider>
  );
}

export function useVoting() {
  return useContext(VotingContext);
}
