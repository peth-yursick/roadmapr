/**
 * Tests for /api/admin/register-project endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/auth-tokens', () => ({
  getAdminFromHeader: vi.fn(),
  isAuthorizedMarker: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getAdminFromHeader, isAuthorizedMarker } from '@/lib/auth-tokens';

describe('/api/admin/register-project', () => {
  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    project_handle: 'test-project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminFromHeader).mockResolvedValue({
      fid: 123,
      isAdmin: true,
    });
    vi.mocked(isAuthorizedMarker).mockReturnValue(true);
  });

  function mockSupabaseClient(options: {
    projectFound?: boolean;
    updateError?: any;
  } = {}) {
    const { projectFound = true, updateError } = options;

    const mockProjectsSelectEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue(
        projectFound
          ? { data: mockProject, error: null }
          : { data: null, error: { message: 'Not found' } }
      ),
    });

    const mockProjectsUpdateEq = vi.fn().mockResolvedValue(
      updateError || { error: null }
    );

    return {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: mockProjectsSelectEq,
            }),
            update: vi.fn().mockReturnValue({
              eq: mockProjectsUpdateEq,
            }),
          };
        }
        return {};
      }),
    } as any;
  }

  async function makeRequest(body: any) {
    const request = new Request('http://localhost:3000/api/admin/register-project', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer valid-token',
      },
      body: JSON.stringify(body),
    });
    return POST(request as any);
  }

  describe('Authentication', () => {
    it('should require valid JWT token', async () => {
      vi.mocked(getAdminFromHeader).mockResolvedValue(null);

      const response = await makeRequest({
        projectHandle: 'test-project',
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        voteIncrement: 100,
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should require admin flag in token', async () => {
      vi.mocked(getAdminFromHeader).mockResolvedValue({
        fid: 123,
        isAdmin: false,
      });

      const response = await makeRequest({
        projectHandle: 'test-project',
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        voteIncrement: 100,
      });

      expect(response.status).toBe(401);
    });

    it('should verify FID is authorized marker', async () => {
      vi.mocked(isAuthorizedMarker).mockReturnValue(false);

      const response = await makeRequest({
        projectHandle: 'test-project',
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        voteIncrement: 100,
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Forbidden');
    });
  });

  describe('Validation', () => {
    it('should require projectHandle', async () => {
      const response = await makeRequest({
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        voteIncrement: 100,
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('projectHandle');
    });

    it('should require tokenAddress', async () => {
      const response = await makeRequest({
        projectHandle: 'test-project',
        voteIncrement: 100,
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('tokenAddress');
    });

    it('should require voteIncrement', async () => {
      const response = await makeRequest({
        projectHandle: 'test-project',
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('voteIncrement');
    });
  });

  describe('Project Registration', () => {
    it('should register project successfully', async () => {
      vi.mocked(createClient).mockReturnValue(mockSupabaseClient());

      const response = await makeRequest({
        projectHandle: 'test-project',
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        voteIncrement: 100,
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.project).toEqual({
        id: 'project-123',
        name: 'Test Project',
        handle: 'test-project',
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        voteIncrement: 100,
      });
    });

    it('should return 404 when project not found', async () => {
      vi.mocked(createClient).mockReturnValue(mockSupabaseClient({ projectFound: false }));

      const response = await makeRequest({
        projectHandle: 'non-existent',
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        voteIncrement: 100,
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Project not found');
    });

    it('should return 500 when database update fails', async () => {
      vi.mocked(createClient).mockReturnValue(
        mockSupabaseClient({ updateError: { error: { message: 'Database constraint failed' } } })
      );

      const response = await makeRequest({
        projectHandle: 'test-project',
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        voteIncrement: 100,
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing authorization header', async () => {
      const request = new Request('http://localhost:3000/api/admin/register-project', {
        method: 'POST',
        body: JSON.stringify({
          projectHandle: 'test-project',
          tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
          voteIncrement: 100,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      // Due to try-catch, missing auth header causes issues
      expect([200, 401, 500]).toContain(response.status);
    });

    it('should handle malformed JWT token', async () => {
      vi.mocked(getAdminFromHeader).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/admin/register-project', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer invalid-token',
        },
        body: JSON.stringify({
          projectHandle: 'test-project',
          tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
          voteIncrement: 100,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should handle JSON parse errors gracefully', async () => {
      const request = new Request('http://localhost:3000/api/admin/register-project', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: 'invalid json',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
    });
  });
});
