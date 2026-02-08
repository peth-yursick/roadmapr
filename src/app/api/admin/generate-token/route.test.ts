/**
 * Tests for /api/admin/generate-token endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock auth tokens
vi.mock('@/lib/auth-tokens', () => ({
  generateAdminToken: vi.fn(),
  isAuthorizedMarker: vi.fn(),
}));

import { generateAdminToken, isAuthorizedMarker } from '@/lib/auth-tokens';

describe('/api/admin/generate-token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateAdminToken).mockResolvedValue('mock-jwt-token');
    vi.mocked(isAuthorizedMarker).mockReturnValue(true);
  });

  async function makeRequest(body: any) {
    const request = new Request('http://localhost:3000/api/admin/generate-token', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return POST(request as any);
  }

  describe('POST - Generate Token', () => {
    it('should require fid', async () => {
      const response = await makeRequest({});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'FID is required',
      });
    });

    it('should reject non-number fid', async () => {
      const response = await makeRequest({ fid: 'not-a-number' });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'FID is required',
      });
    });

    it('should reject unauthorized FIDs', async () => {
      vi.mocked(isAuthorizedMarker).mockReturnValue(false);

      const response = await makeRequest({ fid: 999 });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: 'Unauthorized. Your FID is not in the authorized markers list.',
      });
    });

    it('should generate token for authorized FID', async () => {
      vi.mocked(isAuthorizedMarker).mockReturnValue(true);
      vi.mocked(generateAdminToken).mockResolvedValue('valid-jwt-token');

      const response = await makeRequest({ fid: 123 });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        token: 'valid-jwt-token',
        expiresIn: '1 hour',
      });

      expect(generateAdminToken).toHaveBeenCalledWith({
        fid: 123,
        isAdmin: true,
      });
    });

    it('should handle token generation errors', async () => {
      vi.mocked(isAuthorizedMarker).mockReturnValue(true);
      vi.mocked(generateAdminToken).mockRejectedValue(
        new Error('Token generation failed')
      );

      const response = await makeRequest({ fid: 123 });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });

    it('should handle JSON parse errors gracefully', async () => {
      const request = new Request('http://localhost:3000/api/admin/generate-token', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
    });
  });
});
