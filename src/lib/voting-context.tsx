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
  confirmedVotes: Map<string, number>; // Track confirmed vote deltas per project
  addPendingVote: (projectId: string, projectName: string, isUpvote: boolean) => void;
  removePendingVote: (projectId: string, isUpvote: boolean) => void;
  getPendingVotesForProject: (projectId: string) => PendingVote[];
  getTotalVotes: () => number;
  clearPendingVotes: () => void;
  markVotesAsConfirmed: (projectId: string, voteDelta: number) => void;
  getConfirmedVoteDelta: (projectId: string) => number;
}

const VotingContext = createContext<VotingContextType>({
  pendingVotes: [],
  confirmedVotes: new Map(),
  addPendingVote: () => {},
  removePendingVote: () => {},
  getPendingVotesForProject: () => [],
  getTotalVotes: () => 0,
  clearPendingVotes: () => {},
  markVotesAsConfirmed: () => {},
  getConfirmedVoteDelta: () => 0,
});

export function VotingProvider({ children }: { children: ReactNode }) {
  const [pendingVotes, setPendingVotes] = useState<PendingVote[]>([]);
  const [confirmedVotes, setConfirmedVotes] = useState<Map<string, number>>(new Map());

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("pendingVotesArray");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // If parsed data is not an array (old format), clear it
        if (Array.isArray(parsed)) {
          setPendingVotes(parsed);
        } else {
          // Old format from Map-based storage - clear it
          localStorage.removeItem("pendingVotesArray");
          setPendingVotes([]);
        }
      } catch (e) {
        console.error("Failed to parse pending votes:", e);
        localStorage.removeItem("pendingVotesArray");
        setPendingVotes([]);
      }
    }
  }, []);

  // Save to localStorage when pendingVotes changes
  useEffect(() => {
    console.log("[VotingContext] pendingVotes changed:", pendingVotes);
    if (pendingVotes.length > 0) {
      const toStore = JSON.stringify(pendingVotes);
      console.log("[VotingContext] Saving to localStorage:", toStore);
      localStorage.setItem("pendingVotesArray", toStore);
    } else {
      console.log("[VotingContext] Removing from localStorage");
      localStorage.removeItem("pendingVotesArray");
    }
  }, [pendingVotes]);

  const addPendingVote = useCallback((projectId: string, projectName: string, isUpvote: boolean) => {
    console.log("[VotingContext] addPendingVote called", { projectId, projectName, isUpvote });
    setPendingVotes((prev) => {
      // Add a new vote to the array (allows multiple votes per project)
      const newVotes = [...prev, { projectId, projectName, isUpvote }];
      console.log("[VotingContext] New pending votes array:", newVotes);
      return newVotes;
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

  const markVotesAsConfirmed = useCallback((projectId: string, voteDelta: number) => {
    setConfirmedVotes((prev) => {
      const newMap = new Map(prev);
      newMap.set(projectId, (prev.get(projectId) || 0) + voteDelta);
      return newMap;
    });
  }, []);

  const getConfirmedVoteDelta = useCallback((projectId: string): number => {
    return confirmedVotes.get(projectId) || 0;
  }, [confirmedVotes]);

  return (
    <VotingContext.Provider
      value={{
        pendingVotes,
        confirmedVotes,
        addPendingVote,
        removePendingVote,
        getPendingVotesForProject,
        getTotalVotes,
        clearPendingVotes,
        markVotesAsConfirmed,
        getConfirmedVoteDelta,
      }}
    >
      {children}
    </VotingContext.Provider>
  );
}

export function useVoting() {
  return useContext(VotingContext);
}
