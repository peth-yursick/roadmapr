// ============================================
// Project Types
// ============================================

export interface Project {
  id: string;
  name: string;
  description: string | null;
  creator_fid: number | null;
  claiming_address: string | null;
  token_address: string | null;
  chain: string | null;
  min_vote_amount: number;
  is_binding: boolean;
  voting_type: "score" | "token";
  created_at: string;
  updated_at: string;
  // Multi-project fields
  project_handle: string | null;
  owner_fid: number | null;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
  external_link: string | null;
  fee_recipient_address: string | null;
  is_verified: boolean;
  created_by_bot: boolean;
  default_token_address: string | null;
  vote_increment: number;
  vote_increment_usd: number | null;
}

export interface ProjectWithAdmins extends Project {
  admins: ProjectAdmin[];
}

export interface ProjectAdmin {
  id: string;
  project_id: string;
  fid: number;
  role: "owner" | "admin";
  added_by_fid: number | null;
  added_at: string;
}

// ============================================
// Feature Types
// ============================================

export interface Feature {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  submitter_fid: number;
  status: "open" | "in_progress" | "shipped" | "hidden";
  total_weight: number;
  created_at: string;
  updated_at: string;
  // Bot extraction fields
  source_cast_hash: string | null;
  source_cast_author_fid: number | null;
  parent_feature_id: string | null;
  is_sub_item: boolean;
  // Token claim fields
  shipped_at: string | null;
  tokens_claimable: number;
}

export interface FeatureWithSubmitter extends Feature {
  submitter?: NeynarUser;
  user_vote?: number | null; // positive = upvoted, negative = downvoted, null = no vote
  user_tokens_locked?: number; // tokens locked by user (for token voting)
}

export interface FeatureWithDetails extends FeatureWithSubmitter {
  project?: Project;
  sources?: FeatureSource[];
  sub_items?: FeatureWithSubmitter[];
  tags?: Tag[];
}

export interface FeatureSource {
  id: string;
  feature_id: string;
  source_cast_hash: string;
  source_cast_author_fid: number | null;
  source_cast_text: string | null;
  added_at: string;
}

// ============================================
// Tag Types
// ============================================

export interface Tag {
  id: string;
  name: string;
  type: "predefined" | "custom";
  created_at: string;
}

export interface FeatureTag {
  feature_id: string;
  tag_id: string;
}

// ============================================
// Vote Types
// ============================================

export interface Vote {
  id: string;
  feature_id: string;
  voter_fid: number;
  weight: number;
  voting_power_source: "neynar_score" | "token_balance";
  tx_hash: string | null;
  created_at: string;
  // Token voting fields
  voter_address: string | null;
  tokens_locked: number;
  locked_at: string | null;
  unlock_available_at: string | null;
  withdrawn: boolean;
  claimed_by_owner: boolean;
  claim_tx_hash: string | null;
}

export interface VoteFee {
  id: string;
  vote_id: string;
  project_id: string;
  amount: number;
  token_address: string;
  collected: boolean;
  collected_at: string | null;
  tx_hash: string | null;
  created_at: string;
}

// ============================================
// Token Claim Types
// ============================================

export interface TokenClaim {
  id: string;
  feature_id: string;
  project_id: string;
  claimer_fid: number;
  claimer_address: string;
  amount: number;
  token_address: string;
  tx_hash: string | null;
  claimed_at: string;
}

// ============================================
// Authorized Marker Types
// ============================================

export interface AuthorizedMarker {
  id: string;
  project_id: string;
  fid: number;
  added_by_fid: number | null;
  created_at: string;
}

// ============================================
// Bot Types
// ============================================

export interface BotMention {
  id: string;
  cast_hash: string;
  mention_author_fid: number;
  parent_cast_hash: string | null;
  parent_cast_author_fid: number | null;
  parent_cast_text: string | null;
  detected_projects: string[] | null;
  features_created: number;
  features_merged: number;
  error_message: string | null;
  processed_at: string;
}

// ============================================
// User Types
// ============================================

export interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  score: number;
}

export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  custody_address?: string;
  verified_addresses?: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateProjectRequest {
  name: string;
  project_handle: string;
  bio?: string;
  voting_type: "score" | "token";
  token_address?: string;
  chain?: string;
  vote_increment?: number;
  vote_increment_usd?: number;
  fee_recipient_address?: string;
  external_link?: string;
  website_url?: string;
}

export interface UpdateProjectRequest {
  bio?: string;
  avatar_url?: string;
  website_url?: string;
  external_link?: string;
  fee_recipient_address?: string;
  vote_increment?: number;
  vote_increment_usd?: number;
}

export interface CreateFeatureRequest {
  project_id: string;
  title: string;
  description?: string;
  submitter_fid: number;
  tags?: string[]; // tag IDs
  source_cast_hash?: string;
  source_cast_author_fid?: number;
  parent_feature_id?: string;
}

export interface VoteRequest {
  feature_id: string;
  voter_fid: number;
  direction: "up" | "down" | "remove";
  // For token voting
  voter_address?: string;
  vote_count?: number; // Number of vote increments
}

export interface TokenVoteRequest {
  feature_id: string;
  project_id: string;
  voter_address: string;
  vote_count: number;
  is_upvote: boolean;
  tx_hash: string;
}

export interface ClaimTokensRequest {
  feature_id: string;
  claimer_fid: number;
  claimer_address: string;
  tx_hash: string;
}

// ============================================
// Pagination Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  cursor: string | null;
  has_more: boolean;
}

export interface FeaturesQueryParams {
  project_id?: string;
  project_handle?: string;
  status?: "all" | "open" | "shipped" | "hidden";
  tags?: string[];
  cursor?: string;
  limit?: number;
  voter_fid?: number;
  voter_address?: string;
}
