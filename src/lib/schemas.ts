/**
 * Zod Validation Schemas
 * Runtime type validation with TypeScript inference
 */

import { z } from 'zod';

/**
 * Common schemas
 */
export const fidSchema = z.number().int().positive().describe('User Farcaster ID');
export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe('Ethereum address');
export const projectHandleSchema = z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).describe('Project handle (lowercase, hyphens allowed)');
export const uuidSchema = z.string().uuid().describe('Resource UUID');

/**
 * Project schemas
 */
export const projectSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(100).describe('Project name'),
  project_handle: projectHandleSchema,
  description: z.string().max(500).optional().describe('Project description'),
  creator_fid: fidSchema.optional(),
  owner_fid: fidSchema.optional(),
  image_url: z.string().url().optional().describe('Project image URL'),
  website_url: z.string().url().optional().describe('Project website URL'),
  github_url: z.string().url().optional().describe('Project GitHub URL'),
  farcaster_channel_url: z.string().url().optional().describe('Farcaster channel URL'),
  tags: z.array(z.string()).optional().describe('Project tags'),
});

export const createProjectSchema = projectSchema
  .extend({
    id: uuidSchema.optional(),
  })
  .required({
    name: true,
    project_handle: true,
  });

/**
 * Voting schemas
 */
export const voteSchema = z.object({
  project_id: uuidSchema,
  feature_id: uuidSchema.optional(),
  voter_fid: fidSchema,
  voter_address: addressSchema.optional(),
  is_upvote: z.boolean(),
  vote_amount: z.number().positive().optional(),
  weight: z.number().optional().describe('Vote weight for simple voting'),
});

export const tokenVoteSchema = z.object({
  project_id: uuidSchema,
  vote_count: z.number().int().positive().describe('Number of votes'),
  is_upvote: z.boolean(),
  tx_hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).describe('Transaction hash'),
  token_address: addressSchema,
});

/**
 * Feature schemas
 */
export const featureSchema = z.object({
  id: uuidSchema,
  project_id: uuidSchema,
  title: z.string().min(1).max(200).describe('Feature title'),
  description: z.string().max(2000).optional().describe('Feature description'),
  status: z.enum(['open', 'in-progress', 'shipped', 'cancelled']).default('open'),
  creator_fid: fidSchema.optional(),
  submitter_fid: fidSchema.optional(),
  farcaster_cast_hash: z.string().optional().describe('Farcaster cast hash'),
  farcaster_cast_url: z.string().url().optional().describe('Farcaster cast URL'),
});

export const createFeatureSchema = featureSchema
  .extend({
    id: uuidSchema.optional(),
  })
  .extend({
    status: z.enum(['open', 'in-progress', 'shipped', 'cancelled']).optional(),
  })
  .required({
    title: true,
    project_id: true,
  });

export const updateFeatureStatusSchema = z.object({
  status: z.enum(['open', 'in-progress', 'shipped', 'cancelled']),
  farcaster_cast_hash: z.string().optional(),
});

/**
 * Admin schemas
 */
export const registerProjectSchema = z.object({
  projectHandle: projectHandleSchema,
  tokenAddress: addressSchema,
  voteIncrement: z.number().positive().describe('Token amount per vote'),
});

export const addProjectAdminSchema = z.object({
  projectHandle: projectHandleSchema,
  fid: fidSchema,
  role: z.enum(['owner', 'admin', 'moderator']).default('admin'),
});

/**
 * Auth schemas
 */
export const generateTokenSchema = z.object({
  fid: fidSchema,
});

/**
 * Request validation helpers
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);

  if (!result.success) {
    const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: errors };
  }

  return { success: true, data: result.data };
}

/**
 * Type exports for use in components
 */
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
export type TokenVoteInput = z.infer<typeof tokenVoteSchema>;
export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;
export type UpdateFeatureStatusInput = z.infer<typeof updateFeatureStatusSchema>;
export type RegisterProjectInput = z.infer<typeof registerProjectSchema>;
