/**
 * Tests for Zod validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
  fidSchema,
  addressSchema,
  projectHandleSchema,
  uuidSchema,
  projectSchema,
  createProjectSchema,
  voteSchema,
  tokenVoteSchema,
  featureSchema,
  createFeatureSchema,
  updateFeatureStatusSchema,
  registerProjectSchema,
  addProjectAdminSchema,
  generateTokenSchema,
  validateRequest,
} from './schemas';

describe('Validation Schemas', () => {
  describe('Basic Schemas', () => {
    describe('fidSchema', () => {
      it('should validate a valid FID', () => {
        const result = fidSchema.safeParse(123);
        expect(result.success).toBe(true);
      });

      it('should reject a non-positive FID', () => {
        const result = fidSchema.safeParse(0);
        expect(result.success).toBe(false);
      });

      it('should reject a negative FID', () => {
        const result = fidSchema.safeParse(-1);
        expect(result.success).toBe(false);
      });

      it('should reject a non-integer FID', () => {
        const result = fidSchema.safeParse(123.45);
        expect(result.success).toBe(false);
      });
    });

    describe('addressSchema', () => {
      it('should validate a valid Ethereum address', () => {
        const result = addressSchema.safeParse('0x1234567890abcdef1234567890abcdef12345678');
        expect(result.success).toBe(true);
      });

      it('should reject an address with invalid length', () => {
        const result = addressSchema.safeParse('0x1234567890abcdef');
        expect(result.success).toBe(false);
      });

      it('should reject an address without 0x prefix', () => {
        const result = addressSchema.safeParse('1234567890abcdef1234567890abcdef12345678');
        expect(result.success).toBe(false);
      });

      it('should reject an address with invalid characters', () => {
        const result = addressSchema.safeParse('0x1234567890abcdef1234567890abcdef1234567g');
        expect(result.success).toBe(false);
      });
    });

    describe('projectHandleSchema', () => {
      it('should validate a valid handle', () => {
        const result = projectHandleSchema.safeParse('my-project-123');
        expect(result.success).toBe(true);
      });

      it('should reject an empty handle', () => {
        const result = projectHandleSchema.safeParse('');
        expect(result.success).toBe(false);
      });

      it('should reject handles with uppercase letters', () => {
        const result = projectHandleSchema.safeParse('MyProject');
        expect(result.success).toBe(false);
      });

      it('should reject handles with special characters other than hyphens', () => {
        const result = projectHandleSchema.safeParse('my_project');
        expect(result.success).toBe(false);
      });

      it('should reject handles that are too long', () => {
        const result = projectHandleSchema.safeParse('a'.repeat(51));
        expect(result.success).toBe(false);
      });
    });

    describe('uuidSchema', () => {
      it('should validate a valid UUID', () => {
        const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
        expect(result.success).toBe(true);
      });

      it('should reject an invalid UUID', () => {
        const result = uuidSchema.safeParse('not-a-uuid');
        expect(result.success).toBe(false);
      });

      it('should reject an empty string', () => {
        const result = uuidSchema.safeParse('');
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Project Schemas', () => {
    describe('projectSchema', () => {
      const validProject = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Project',
        project_handle: 'test-project',
        description: 'A test project',
        creator_fid: 123,
        owner_fid: 456,
        image_url: 'https://example.com/image.png',
        website_url: 'https://example.com',
        github_url: 'https://github.com/test/project',
        farcaster_channel_url: 'https://warpcast.com/~/channel/test',
        tags: ['tag1', 'tag2'],
      };

      it('should validate a valid project', () => {
        const result = projectSchema.safeParse(validProject);
        expect(result.success).toBe(true);
      });

      it('should require id field', () => {
        const { id, ...projectWithoutId } = validProject;
        const result = projectSchema.safeParse(projectWithoutId);
        expect(result.success).toBe(false);
      });

      it('should require name field', () => {
        const { name, ...projectWithoutName } = validProject;
        const result = projectSchema.safeParse(projectWithoutName);
        expect(result.success).toBe(false);
      });

      it('should require project_handle field', () => {
        const { project_handle, ...projectWithoutHandle } = validProject;
        const result = projectSchema.safeParse(projectWithoutHandle);
        expect(result.success).toBe(false);
      });

      it('should reject name exceeding 100 characters', () => {
        const projectWithLongName = { ...validProject, name: 'a'.repeat(101) };
        const result = projectSchema.safeParse(projectWithLongName);
        expect(result.success).toBe(false);
      });

      it('should reject description exceeding 500 characters', () => {
        const projectWithLongDesc = { ...validProject, description: 'a'.repeat(501) };
        const result = projectSchema.safeParse(projectWithLongDesc);
        expect(result.success).toBe(false);
      });

      it('should reject invalid URL format', () => {
        const projectWithInvalidUrl = { ...validProject, website_url: 'not-a-url' };
        const result = projectSchema.safeParse(projectWithInvalidUrl);
        expect(result.success).toBe(false);
      });
    });

    describe('createProjectSchema', () => {
      it('should validate with required fields only', () => {
        const result = createProjectSchema.safeParse({
          name: 'Test Project',
          project_handle: 'test-project',
        });
        expect(result.success).toBe(true);
      });

      it('should validate with optional fields', () => {
        const result = createProjectSchema.safeParse({
          name: 'Test Project',
          project_handle: 'test-project',
          description: 'A description',
          tags: ['tag1'],
        });
        expect(result.success).toBe(true);
      });

      it('should reject without name', () => {
        const result = createProjectSchema.safeParse({
          project_handle: 'test-project',
        });
        expect(result.success).toBe(false);
      });

      it('should reject without project_handle', () => {
        const result = createProjectSchema.safeParse({
          name: 'Test Project',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Voting Schemas', () => {
    describe('voteSchema', () => {
      const validVote = {
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        voter_fid: 123,
        is_upvote: true,
        vote_amount: 100,
        weight: 1.5,
      };

      it('should validate a valid vote', () => {
        const result = voteSchema.safeParse(validVote);
        expect(result.success).toBe(true);
      });

      it('should require project_id', () => {
        const { project_id, ...voteWithoutId } = validVote;
        const result = voteSchema.safeParse(voteWithoutId);
        expect(result.success).toBe(false);
      });

      it('should require voter_fid', () => {
        const { voter_fid, ...voteWithoutFid } = validVote;
        const result = voteSchema.safeParse(voteWithoutFid);
        expect(result.success).toBe(false);
      });

      it('should require is_upvote', () => {
        const { is_upvote, ...voteWithoutUpvote } = validVote;
        const result = voteSchema.safeParse(voteWithoutUpvote);
        expect(result.success).toBe(false);
      });
    });

    describe('tokenVoteSchema', () => {
      const validTokenVote = {
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        vote_count: 5,
        is_upvote: true,
        tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        token_address: '0x1234567890abcdef1234567890abcdef12345678',
      };

      it('should validate a valid token vote', () => {
        const result = tokenVoteSchema.safeParse(validTokenVote);
        expect(result.success).toBe(true);
      });

      it('should require vote_count', () => {
        const { vote_count, ...voteWithoutCount } = validTokenVote;
        const result = tokenVoteSchema.safeParse(voteWithoutCount);
        expect(result.success).toBe(false);
      });

      it('should require tx_hash', () => {
        const { tx_hash, ...voteWithoutTx } = validTokenVote;
        const result = tokenVoteSchema.safeParse(voteWithoutTx);
        expect(result.success).toBe(false);
      });

      it('should require token_address', () => {
        const { token_address, ...voteWithoutAddress } = validTokenVote;
        const result = tokenVoteSchema.safeParse(voteWithoutAddress);
        expect(result.success).toBe(false);
      });

      it('should reject invalid tx_hash format', () => {
        const voteWithInvalidTx = { ...validTokenVote, tx_hash: 'not-a-hash' };
        const result = tokenVoteSchema.safeParse(voteWithInvalidTx);
        expect(result.success).toBe(false);
      });

      it('should reject zero or negative vote_count', () => {
        const voteWithZeroCount = { ...validTokenVote, vote_count: 0 };
        const result1 = tokenVoteSchema.safeParse(voteWithZeroCount);
        expect(result1.success).toBe(false);

        const voteWithNegativeCount = { ...validTokenVote, vote_count: -1 };
        const result2 = tokenVoteSchema.safeParse(voteWithNegativeCount);
        expect(result2.success).toBe(false);
      });
    });
  });

  describe('Feature Schemas', () => {
    describe('featureSchema', () => {
      const validFeature = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        project_id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Test Feature',
        description: 'A test feature',
        status: 'open' as const,
        creator_fid: 123,
        submitter_fid: 456,
        farcaster_cast_hash: 'cast-hash',
        farcaster_cast_url: 'https://warpcast.com/~/cast/cast-hash',
      };

      it('should validate a valid feature', () => {
        const result = featureSchema.safeParse(validFeature);
        expect(result.success).toBe(true);
      });

      it('should require id', () => {
        const { id, ...featureWithoutId } = validFeature;
        const result = featureSchema.safeParse(featureWithoutId);
        expect(result.success).toBe(false);
      });

      it('should require project_id', () => {
        const { project_id, ...featureWithoutProjectId } = validFeature;
        const result = featureSchema.safeParse(featureWithoutProjectId);
        expect(result.success).toBe(false);
      });

      it('should require title', () => {
        const { title, ...featureWithoutTitle } = validFeature;
        const result = featureSchema.safeParse(featureWithoutTitle);
        expect(result.success).toBe(false);
      });

      it('should reject title exceeding 200 characters', () => {
        const featureWithLongTitle = { ...validFeature, title: 'a'.repeat(201) };
        const result = featureSchema.safeParse(featureWithLongTitle);
        expect(result.success).toBe(false);
      });

      it('should reject description exceeding 2000 characters', () => {
        const featureWithLongDesc = { ...validFeature, description: 'a'.repeat(2001) };
        const result = featureSchema.safeParse(featureWithLongDesc);
        expect(result.success).toBe(false);
      });

      it('should accept valid status values', () => {
        const statuses: Array<'open' | 'in-progress' | 'shipped' | 'cancelled'> = ['open', 'in-progress', 'shipped', 'cancelled'];
        statuses.forEach((status) => {
          const result = featureSchema.safeParse({ ...validFeature, status });
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid status', () => {
        const result = featureSchema.safeParse({ ...validFeature, status: 'invalid-status' });
        expect(result.success).toBe(false);
      });
    });

    describe('createFeatureSchema', () => {
      it('should validate with required fields only', () => {
        const result = createFeatureSchema.safeParse({
          title: 'Test Feature',
          project_id: '550e8400-e29b-41d4-a716-446655440000',
        });
        expect(result.success).toBe(true);
      });

      it('should allow optional status field', () => {
        const result = createFeatureSchema.safeParse({
          title: 'Test Feature',
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'in-progress',
        });
        expect(result.success).toBe(true);
      });

      it('should reject without title', () => {
        const result = createFeatureSchema.safeParse({
          project_id: '550e8400-e29b-41d4-a716-446655440000',
        });
        expect(result.success).toBe(false);
      });

      it('should reject without project_id', () => {
        const result = createFeatureSchema.safeParse({
          title: 'Test Feature',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('updateFeatureStatusSchema', () => {
      it('should validate status update', () => {
        const result = updateFeatureStatusSchema.safeParse({
          status: 'shipped',
        });
        expect(result.success).toBe(true);
      });

      it('should allow optional farcaster_cast_hash', () => {
        const result = updateFeatureStatusSchema.safeParse({
          status: 'shipped',
          farcaster_cast_hash: 'cast-hash-123',
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid status', () => {
        const result = updateFeatureStatusSchema.safeParse({
          status: 'invalid',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Admin Schemas', () => {
    describe('registerProjectSchema', () => {
      const validRegistration = {
        projectHandle: 'test-project',
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        voteIncrement: 100,
      };

      it('should validate a valid registration', () => {
        const result = registerProjectSchema.safeParse(validRegistration);
        expect(result.success).toBe(true);
      });

      it('should require projectHandle', () => {
        const { projectHandle, ...registrationWithoutHandle } = validRegistration;
        const result = registerProjectSchema.safeParse(registrationWithoutHandle);
        expect(result.success).toBe(false);
      });

      it('should require tokenAddress', () => {
        const { tokenAddress, ...registrationWithoutAddress } = validRegistration;
        const result = registerProjectSchema.safeParse(registrationWithoutAddress);
        expect(result.success).toBe(false);
      });

      it('should require voteIncrement', () => {
        const { voteIncrement, ...registrationWithoutIncrement } = validRegistration;
        const result = registerProjectSchema.safeParse(registrationWithoutIncrement);
        expect(result.success).toBe(false);
      });

      it('should reject zero or negative voteIncrement', () => {
        const result1 = registerProjectSchema.safeParse({ ...validRegistration, voteIncrement: 0 });
        expect(result1.success).toBe(false);

        const result2 = registerProjectSchema.safeParse({ ...validRegistration, voteIncrement: -1 });
        expect(result2.success).toBe(false);
      });
    });

    describe('addProjectAdminSchema', () => {
      const validAdmin = {
        projectHandle: 'test-project',
        fid: 123,
        role: 'admin' as const,
      };

      it('should validate a valid admin addition', () => {
        const result = addProjectAdminSchema.safeParse(validAdmin);
        expect(result.success).toBe(true);
      });

      it('should default role to admin', () => {
        const { role, ...adminWithoutRole } = validAdmin;
        const result = addProjectAdminSchema.safeParse(adminWithoutRole);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.role).toBe('admin');
        }
      });

      it('should accept all valid roles', () => {
        const roles: Array<'owner' | 'admin' | 'moderator'> = ['owner', 'admin', 'moderator'];
        roles.forEach((role) => {
          const result = addProjectAdminSchema.safeParse({ ...validAdmin, role });
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid role', () => {
        const result = addProjectAdminSchema.safeParse({ ...validAdmin, role: 'invalid' });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Auth Schemas', () => {
    describe('generateTokenSchema', () => {
      it('should validate a valid token request', () => {
        const result = generateTokenSchema.safeParse({ fid: 123 });
        expect(result.success).toBe(true);
      });

      it('should require fid', () => {
        const result = generateTokenSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it('should reject invalid fid', () => {
        const result = generateTokenSchema.safeParse({ fid: 0 });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('validateRequest Helper', () => {
    it('should return success with data for valid input', () => {
      const schema = fidSchema;
      const result = validateRequest(schema, 123);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(123);
      }
    });

    it('should return failure with error message for invalid input', () => {
      const schema = fidSchema;
      const result = validateRequest(schema, 0);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
        expect(result.error.length).toBeGreaterThan(0);
      }
    });

    it('should handle project schema validation', () => {
      const validProject = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Project',
        project_handle: 'test-project',
      };
      const result = validateRequest(createProjectSchema, validProject);
      expect(result.success).toBe(true);
    });

    it('should aggregate multiple validation errors', () => {
      const schema = createProjectSchema;
      const result = validateRequest(schema, {});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('name');
        expect(result.error).toContain('project_handle');
      }
    });
  });
});
