/**
 * Tests for VotingContext
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { VotingProvider, useVoting, PendingVote } from './voting-context';

describe('VotingContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <VotingProvider>{children}</VotingProvider>
  );

  describe('Initial State', () => {
    it('should start with empty pending votes', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      expect(result.current.pendingVotes).toEqual([]);
    });

    it('should start with confirmed votes empty Map', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      expect(result.current.confirmedVotes.size).toBe(0);
    });
  });

  describe('addPendingVote', () => {
    it('should add a pending vote', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.addPendingVote('project-1', 'Project 1', true);
      });

      expect(result.current.pendingVotes).toHaveLength(1);
      expect(result.current.pendingVotes[0]).toEqual({
        projectId: 'project-1',
        projectName: 'Project 1',
        isUpvote: true,
      });
    });

    it('should add multiple pending votes for the same project', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.addPendingVote('project-1', 'Project 1', true);
        result.current.addPendingVote('project-1', 'Project 1', true);
      });

      expect(result.current.pendingVotes).toHaveLength(2);
      expect(result.current.pendingVotes.every(v => v.projectId === 'project-1')).toBe(true);
    });

    it('should persist to localStorage', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.addPendingVote('project-1', 'Project 1', false);
      });

      const stored = localStorage.getItem('pendingVotesArray');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual([
        { projectId: 'project-1', projectName: 'Project 1', isUpvote: false },
      ]);
    });

    it('should load from localStorage on mount', () => {
      const existingVotes: PendingVote[] = [
        { projectId: 'project-2', projectName: 'Project 2', isUpvote: true },
      ];
      localStorage.setItem('pendingVotesArray', JSON.stringify(existingVotes));

      const { result } = renderHook(() => useVoting(), { wrapper });

      expect(result.current.pendingVotes).toEqual(existingVotes);
    });
  });

  describe('getPendingVotesForProject', () => {
    it('should return empty array if no votes for project', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.addPendingVote('project-1', 'Project 1', true);
      });

      const votes = result.current.getPendingVotesForProject('project-2');
      expect(votes).toEqual([]);
    });

    it('should return votes for specific project', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.addPendingVote('project-1', 'Project 1', true);
        result.current.addPendingVote('project-1', 'Project 1', false);
        result.current.addPendingVote('project-2', 'Project 2', true);
      });

      const votes = result.current.getPendingVotesForProject('project-1');
      expect(votes).toHaveLength(2);
      expect(votes.every(v => v.projectId === 'project-1')).toBe(true);
    });

    it('should count upvotes and downvotes correctly', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.addPendingVote('project-1', 'Project 1', true);
        result.current.addPendingVote('project-1', 'Project 1', true);
        result.current.addPendingVote('project-1', 'Project 1', false);
      });

      const votes = result.current.getPendingVotesForProject('project-1');
      const upvotes = votes.filter(v => v.isUpvote).length;
      const downvotes = votes.filter(v => !v.isUpvote).length;

      expect(upvotes).toBe(2);
      expect(downvotes).toBe(1);
    });
  });

  describe('removePendingVote', () => {
    it('should remove the most recent vote for a project with matching direction', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.addPendingVote('project-1', 'Project 1', true);
        result.current.addPendingVote('project-1', 'Project 1', false);
        result.current.addPendingVote('project-2', 'Project 2', true);
        result.current.addPendingVote('project-1', 'Project 1', true);
      });

      expect(result.current.pendingVotes).toHaveLength(4);

      act(() => {
        result.current.removePendingVote('project-1', true);
      });

      // Should remove the last upvote for project-1
      expect(result.current.pendingVotes).toHaveLength(3);
      expect(result.current.pendingVotes[2].projectId).toBe('project-2');
    });

    it('should not remove votes if no match found', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.addPendingVote('project-1', 'Project 1', true);
        result.current.removePendingVote('project-1', false);
      });

      expect(result.current.pendingVotes).toHaveLength(1);
    });
  });

  describe('clearPendingVotes', () => {
    it('should remove all pending votes', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.addPendingVote('project-1', 'Project 1', true);
        result.current.addPendingVote('project-2', 'Project 2', false);
        result.current.addPendingVote('project-3', 'Project 3', true);
      });

      expect(result.current.pendingVotes).toHaveLength(3);

      act(() => {
        result.current.clearPendingVotes();
      });

      expect(result.current.pendingVotes).toEqual([]);
    });

    it('should clear localStorage', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.addPendingVote('project-1', 'Project 1', true);
        result.current.clearPendingVotes();
      });

      expect(localStorage.getItem('pendingVotesArray')).toBeNull();
    });
  });

  describe('getTotalVotes', () => {
    it('should return total count of pending votes', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      expect(result.current.getTotalVotes()).toBe(0);

      act(() => {
        result.current.addPendingVote('project-1', 'Project 1', true);
        result.current.addPendingVote('project-2', 'Project 2', false);
        result.current.addPendingVote('project-1', 'Project 1', true);
      });

      expect(result.current.getTotalVotes()).toBe(3);
    });
  });

  describe('markVotesAsConfirmed', () => {
    it('should set confirmed delta for a project', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.markVotesAsConfirmed('project-1', 3);
      });

      expect(result.current.getConfirmedVoteDelta('project-1')).toBe(3);
    });

    it('should accumulate deltas for same project', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.markVotesAsConfirmed('project-1', 2);
        result.current.markVotesAsConfirmed('project-1', 1);
      });

      expect(result.current.getConfirmedVoteDelta('project-1')).toBe(3);
    });

    it('should handle negative deltas', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.markVotesAsConfirmed('project-1', -1);
      });

      expect(result.current.getConfirmedVoteDelta('project-1')).toBe(-1);
    });
  });

  describe('getConfirmedVoteDelta', () => {
    it('should return 0 for project with no confirmed delta', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      expect(result.current.getConfirmedVoteDelta('project-1')).toBe(0);
    });

    it('should return the confirmed delta for a project', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.markVotesAsConfirmed('project-1', 5);
      });

      expect(result.current.getConfirmedVoteDelta('project-1')).toBe(5);
    });

    it('should keep separate deltas for different projects', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.markVotesAsConfirmed('project-1', 3);
        result.current.markVotesAsConfirmed('project-2', -2);
      });

      expect(result.current.getConfirmedVoteDelta('project-1')).toBe(3);
      expect(result.current.getConfirmedVoteDelta('project-2')).toBe(-2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle localStorage corruption gracefully', () => {
      localStorage.setItem('pendingVotesArray', 'invalid-json');

      const { result } = renderHook(() => useVoting(), { wrapper });

      // Should fall back to empty array
      expect(result.current.pendingVotes).toEqual([]);
    });

    it('should handle old Map-based format by clearing it', () => {
      localStorage.setItem('pendingVotesArray', JSON.stringify({}));

      const { result } = renderHook(() => useVoting(), { wrapper });

      // Should clear old format and start with empty array
      expect(result.current.pendingVotes).toEqual([]);
      expect(localStorage.getItem('pendingVotesArray')).toBeNull();
    });

    it('should handle projectName being optional', () => {
      const { result } = renderHook(() => useVoting(), { wrapper });

      act(() => {
        result.current.addPendingVote('project-1', '', true);
      });

      expect(result.current.pendingVotes[0]).toEqual({
        projectId: 'project-1',
        projectName: '',
        isUpvote: true,
      });
    });
  });
});
