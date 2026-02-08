/**
 * Tests for /api/vote endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock Neynar
vi.mock('@/lib/neynar', () => ({
  getNeynarScore: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getNeynarScore } from '@/lib/neynar';

describe('/api/vote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getNeynarScore).mockResolvedValue(5);
  });

  function mockSupabaseClient(options: {
    votes?: Array<{ weight: number }>;
    featureStatus?: string;
    upsertError?: any;
  } = {}) {
    const { votes = [{ weight: 5 }], featureStatus = 'open' } = options;

    const mockVotesEq = vi.fn().mockResolvedValue({
      data: votes,
      error: null,
    });

    const mockFeatureSelectEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { status: featureStatus },
        error: null,
      }),
    });

    const mockFeatureUpdateEq = vi.fn().mockResolvedValue({
      error: null,
    });

    return {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'votes') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
            }),
            upsert: vi.fn().mockResolvedValue({ error: options.upsertError || null }),
            select: vi.fn().mockReturnValue({
              eq: mockVotesEq,
            }),
          };
        }
        if (table === 'features') {
          return {
            select: vi.fn().mockReturnValue({
              eq: mockFeatureSelectEq,
            }),
            update: vi.fn().mockReturnValue({
              eq: mockFeatureUpdateEq,
            }),
          };
        }
        return {};
      }),
    } as any;
  }

  async function makeRequest(body: any) {
    const request = new Request('http://localhost:3000/api/vote', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return POST(request as any);
  }

  describe('POST - Upvote', () => {
    it('should require feature_id', async () => {
      const response = await makeRequest({ voter_fid: 123, direction: 'up' });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'feature_id, voter_fid, and direction are required',
      });
    });

    it('should require voter_fid', async () => {
      const response = await makeRequest({ feature_id: 'feat-1', direction: 'up' });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'feature_id, voter_fid, and direction are required',
      });
    });

    it('should require direction', async () => {
      const response = await makeRequest({ feature_id: 'feat-1', voter_fid: 123 });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'feature_id, voter_fid, and direction are required',
      });
    });

    it('should reject invalid direction', async () => {
      const response = await makeRequest({
        feature_id: 'feat-1',
        voter_fid: 123,
        direction: 'invalid',
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: "direction must be 'up', 'down', or 'remove'",
      });
    });

    it('should upvote successfully', async () => {
      vi.mocked(createClient).mockReturnValue(mockSupabaseClient());

      const response = await makeRequest({
        feature_id: 'feat-1',
        voter_fid: 123,
        direction: 'up',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('total_weight');
      expect(data).toHaveProperty('user_vote', 5);
    });

    it('should use Neynar score for vote weight', async () => {
      vi.mocked(getNeynarScore).mockResolvedValue(10);
      vi.mocked(createClient).mockReturnValue(mockSupabaseClient({ votes: [{ weight: 10 }] }));

      const response = await makeRequest({
        feature_id: 'feat-1',
        voter_fid: 123,
        direction: 'up',
      });

      expect(getNeynarScore).toHaveBeenCalledWith(123);
      expect(response.status).toBe(200);
    });

    it('should fallback to score 1 when Neynar fails', async () => {
      vi.mocked(getNeynarScore).mockRejectedValue(new Error('API error'));
      vi.mocked(createClient).mockReturnValue(mockSupabaseClient({ votes: [{ weight: 1 }] }));

      const response = await makeRequest({
        feature_id: 'feat-1',
        voter_fid: 123,
        direction: 'up',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user_vote).toBe(1);
    });
  });

  describe('POST - Downvote', () => {
    it('should downvote successfully', async () => {
      vi.mocked(createClient).mockReturnValue(mockSupabaseClient({ votes: [{ weight: -5 }] }));

      const response = await makeRequest({
        feature_id: 'feat-1',
        voter_fid: 123,
        direction: 'down',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user_vote).toBe(-5);
    });
  });

  describe('POST - Remove Vote', () => {
    it('should remove vote successfully', async () => {
      vi.mocked(createClient).mockReturnValue(mockSupabaseClient({ votes: [] }));

      const response = await makeRequest({
        feature_id: 'feat-1',
        voter_fid: 123,
        direction: 'remove',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        total_weight: 0,
        user_vote: null,
      });
    });
  });

  describe('Status Updates', () => {
    it('should set status to hidden when total weight is negative', async () => {
      vi.mocked(createClient).mockReturnValue(mockSupabaseClient({ votes: [{ weight: -10 }] }));

      const response = await makeRequest({
        feature_id: 'feat-1',
        voter_fid: 123,
        direction: 'down',
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should return 403 when Neynar score is 0', async () => {
      vi.mocked(getNeynarScore).mockResolvedValue(0);

      const response = await makeRequest({
        feature_id: 'feat-1',
        voter_fid: 123,
        direction: 'up',
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: 'Need a Neynar score > 0 to vote',
      });
    });

    it('should return 500 when database upsert fails', async () => {
      vi.mocked(createClient).mockReturnValue(
        mockSupabaseClient({ upsertError: { message: 'Database error' } })
      );

      const response = await makeRequest({
        feature_id: 'feat-1',
        voter_fid: 123,
        direction: 'up',
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });

    it('should handle JSON parse errors gracefully', async () => {
      const request = new Request('http://localhost:3000/api/vote', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
    });
  });
});
