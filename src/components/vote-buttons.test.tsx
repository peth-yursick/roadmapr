/**
 * Tests for VoteButtons component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoteButtons } from './vote-buttons';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the auth context
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { fid: 123, address: '0x1234567890abcdef1234567890abcdef12345678' },
  }),
}));

// Mock the format function
vi.mock('@/lib/format', () => ({
  formatWeight: (w: number) => w.toString(),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('VoteButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockReset();
  });

  const defaultProps = {
    featureId: 'feature-123',
    totalWeight: 10,
    userVote: null,
    onVoteChange: vi.fn(),
  };

  describe('Rendering', () => {
    it('should render upvote and downvote buttons', () => {
      render(<VoteButtons {...defaultProps} />);

      expect(screen.getByLabelText('Upvote')).toBeInTheDocument();
      expect(screen.getByLabelText('Downvote')).toBeInTheDocument();
    });

    it('should display the total weight', () => {
      render(<VoteButtons {...defaultProps} totalWeight={15} />);

      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('should display zero weight correctly', () => {
      render(<VoteButtons {...defaultProps} totalWeight={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('User Vote States', () => {
    it('should highlight upvote when user has upvoted', () => {
      render(<VoteButtons {...defaultProps} userVote={1} />);

      const upvoteButton = screen.getByLabelText('Upvote');
      expect(upvoteButton).toHaveClass('text-primary');
      expect(upvoteButton).toHaveClass('bg-primary/10');
    });

    it('should highlight downvote when user has downvoted', () => {
      render(<VoteButtons {...defaultProps} userVote={-1} />);

      const downvoteButton = screen.getByLabelText('Downvote');
      expect(downvoteButton).toHaveClass('text-destructive');
      expect(downvoteButton).toHaveClass('bg-destructive/10');
    });

    it('should show neutral state when user has not voted', () => {
      render(<VoteButtons {...defaultProps} />);

      const upvoteButton = screen.getByLabelText('Upvote');
      const downvoteButton = screen.getByLabelText('Downvote');

      expect(upvoteButton).toHaveClass('text-muted-foreground');
      expect(downvoteButton).toHaveClass('text-muted-foreground');
    });
  });

  describe('Vote Interactions', () => {
    it('should call API when upvoting', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_weight: 11, user_vote: 1 }),
      } as Response);

      render(<VoteButtons {...defaultProps} />);

      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feature_id: 'feature-123',
            voter_fid: 123,
            direction: 'up',
          }),
        });
      });
    });

    it('should call API when downvoting', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_weight: 9, user_vote: -1 }),
      } as Response);

      render(<VoteButtons {...defaultProps} />);

      const downvoteButton = screen.getByLabelText('Downvote');
      fireEvent.click(downvoteButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feature_id: 'feature-123',
            voter_fid: 123,
            direction: 'down',
          }),
        });
      });
    });

    it('should call onVoteChange with new values after successful vote', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_weight: 11, user_vote: 1 }),
      } as Response);

      render(<VoteButtons {...defaultProps} />);

      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);

      await waitFor(() => {
        expect(defaultProps.onVoteChange).toHaveBeenCalledWith(11, 1);
      });
    });

    it('should show error toast when API call fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to vote' }),
      } as Response);

      const { toast } = await import('sonner');

      render(<VoteButtons {...defaultProps} />);

      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to vote');
      });
    });

    it('should remove vote when clicking same direction', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_weight: 9, user_vote: null }),
      } as Response);

      render(<VoteButtons {...defaultProps} userVote={1} />);

      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feature_id: 'feature-123',
            voter_fid: 123,
            direction: 'remove',
          }),
        });
      });
    });

    it('should disable buttons while voting is in progress', async () => {
      vi.mocked(fetch).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ total_weight: 11, user_vote: 1 }),
      } as Response), 100)));

      render(<VoteButtons {...defaultProps} />);

      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);

      // Button should be disabled immediately after click
      expect(upvoteButton).toBeDisabled();
    });
  });

  describe('Compact Mode', () => {
    it('should render compact variant when prop is true', () => {
      render(<VoteButtons {...defaultProps} compact />);

      expect(screen.getByLabelText('Upvote')).toHaveClass('h-6');
      expect(screen.getByLabelText('Upvote')).toHaveClass('w-6');
    });

    it('should render normal variant when compact is false', () => {
      render(<VoteButtons {...defaultProps} compact={false} />);

      expect(screen.getByLabelText('Upvote')).toHaveClass('h-7');
      expect(screen.getByLabelText('Upvote')).toHaveClass('w-7');
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative votes', () => {
      render(<VoteButtons {...defaultProps} totalWeight={-5} />);

      expect(screen.getByText('-5')).toBeInTheDocument();
    });

    it('should handle large numbers', () => {
      render(<VoteButtons {...defaultProps} totalWeight={999999} />);

      expect(screen.getByText('999999')).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const { toast } = await import('sonner');

      render(<VoteButtons {...defaultProps} />);

      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to vote');
      });
    });
  });
});
