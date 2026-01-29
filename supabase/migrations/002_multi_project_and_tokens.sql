-- Migration: Multi-project support, token voting, tags, and bot infrastructure
-- Version: 002

-- Enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- PART 1: Update existing tables
-- ============================================

-- Update projects table for multi-project support
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_handle TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS owner_fid INTEGER,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS external_link TEXT,
ADD COLUMN IF NOT EXISTS fee_recipient_address TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by_bot BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS default_token_address TEXT,
ADD COLUMN IF NOT EXISTS vote_increment NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS vote_increment_usd NUMERIC;

-- Update features table for bot extraction and sub-items
ALTER TABLE features
ADD COLUMN IF NOT EXISTS source_cast_hash TEXT,
ADD COLUMN IF NOT EXISTS source_cast_author_fid INTEGER,
ADD COLUMN IF NOT EXISTS parent_feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_sub_item BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tokens_claimable NUMERIC DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_features_embedding ON features
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_features_parent ON features(parent_feature_id);
CREATE INDEX IF NOT EXISTS idx_features_source_cast ON features(source_cast_hash);

-- Update votes table for token escrow
ALTER TABLE votes
ADD COLUMN IF NOT EXISTS voter_address TEXT,
ADD COLUMN IF NOT EXISTS tokens_locked NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS unlock_available_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS withdrawn BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS claimed_by_owner BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS claim_tx_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_votes_address ON votes(voter_address);
CREATE INDEX IF NOT EXISTS idx_votes_locked ON votes(tokens_locked) WHERE tokens_locked > 0;

-- ============================================
-- PART 2: Tags system
-- ============================================

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  type TEXT DEFAULT 'custom',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predefined tags
INSERT INTO tags (name, type) VALUES
  ('bug', 'predefined'),
  ('feature', 'predefined'),
  ('enhancement', 'predefined'),
  ('marketing', 'predefined'),
  ('strategy', 'predefined'),
  ('design', 'predefined'),
  ('mobile', 'predefined'),
  ('web', 'predefined'),
  ('api', 'predefined'),
  ('documentation', 'predefined'),
  ('performance', 'predefined'),
  ('security', 'predefined')
ON CONFLICT (name) DO NOTHING;

-- Feature-tag junction table
CREATE TABLE IF NOT EXISTS feature_tags (
  feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (feature_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_feature_tags_feature ON feature_tags(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_tags_tag ON feature_tags(tag_id);

-- ============================================
-- PART 3: Feature sources (multiple casts can contribute)
-- ============================================

CREATE TABLE IF NOT EXISTS feature_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
  source_cast_hash TEXT NOT NULL,
  source_cast_author_fid INTEGER,
  source_cast_text TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_sources_feature ON feature_sources(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_sources_cast ON feature_sources(source_cast_hash);

-- ============================================
-- PART 4: Bot activity tracking
-- ============================================

CREATE TABLE IF NOT EXISTS bot_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cast_hash TEXT NOT NULL UNIQUE,
  mention_author_fid INTEGER NOT NULL,
  parent_cast_hash TEXT,
  parent_cast_author_fid INTEGER,
  parent_cast_text TEXT,
  detected_projects TEXT[],
  features_created INTEGER DEFAULT 0,
  features_merged INTEGER DEFAULT 0,
  error_message TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_mentions_author_date
  ON bot_mentions(mention_author_fid, processed_at);

-- Rate limit view (20 mentions per user per day)
CREATE OR REPLACE VIEW bot_mention_rate_limit AS
SELECT
  mention_author_fid,
  COUNT(*) as mentions_today
FROM bot_mentions
WHERE processed_at > NOW() - INTERVAL '24 hours'
GROUP BY mention_author_fid;

-- ============================================
-- PART 5: Fee tracking (1% on token votes)
-- ============================================

CREATE TABLE IF NOT EXISTS vote_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  token_address TEXT NOT NULL,
  collected BOOLEAN DEFAULT false,
  collected_at TIMESTAMPTZ,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vote_fees_project ON vote_fees(project_id);
CREATE INDEX IF NOT EXISTS idx_vote_fees_collected ON vote_fees(collected);

-- ============================================
-- PART 6: Project admins (owner + additional admins)
-- ============================================

CREATE TABLE IF NOT EXISTS project_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  fid INTEGER NOT NULL,
  role TEXT DEFAULT 'admin',
  added_by_fid INTEGER,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, fid)
);

CREATE INDEX IF NOT EXISTS idx_project_admins_project ON project_admins(project_id);
CREATE INDEX IF NOT EXISTS idx_project_admins_fid ON project_admins(fid);

-- ============================================
-- PART 7: Token claims tracking
-- ============================================

CREATE TABLE IF NOT EXISTS token_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  claimer_fid INTEGER NOT NULL,
  claimer_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  token_address TEXT NOT NULL,
  tx_hash TEXT,
  claimed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_claims_feature ON token_claims(feature_id);
CREATE INDEX IF NOT EXISTS idx_token_claims_project ON token_claims(project_id);

-- ============================================
-- PART 8: Vector similarity search function
-- ============================================

CREATE OR REPLACE FUNCTION match_features(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  project_filter uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    features.id,
    features.title,
    features.description,
    1 - (features.embedding <=> query_embedding) as similarity
  FROM features
  WHERE
    features.project_id = project_filter
    AND features.embedding IS NOT NULL
    AND 1 - (features.embedding <=> query_embedding) > match_threshold
    AND features.status != 'hidden'
  ORDER BY features.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================
-- PART 9: Helper functions
-- ============================================

-- Function to calculate claimable tokens for a shipped feature
CREATE OR REPLACE FUNCTION calculate_claimable_tokens(feature_uuid UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(SUM(tokens_locked), 0)
  FROM votes
  WHERE feature_id = feature_uuid
    AND tokens_locked > 0
    AND claimed_by_owner = false
    AND withdrawn = false;
$$;

-- Function to update feature's claimable tokens
CREATE OR REPLACE FUNCTION update_feature_claimable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
    NEW.shipped_at = NOW();
    NEW.tokens_claimable = calculate_claimable_tokens(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_feature_claimable ON features;
CREATE TRIGGER trigger_update_feature_claimable
  BEFORE UPDATE ON features
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_claimable();

-- ============================================
-- PART 10: RLS Policies for new tables
-- ============================================

-- Enable RLS only if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tags' AND rowsecurity = true) THEN
    ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'feature_tags' AND rowsecurity = true) THEN
    ALTER TABLE feature_tags ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'feature_sources' AND rowsecurity = true) THEN
    ALTER TABLE feature_sources ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'bot_mentions' AND rowsecurity = true) THEN
    ALTER TABLE bot_mentions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'vote_fees' AND rowsecurity = true) THEN
    ALTER TABLE vote_fees ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'project_admins' AND rowsecurity = true) THEN
    ALTER TABLE project_admins ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'token_claims' AND rowsecurity = true) THEN
    ALTER TABLE token_claims ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Public read access" ON tags;
DROP POLICY IF EXISTS "Public read access" ON feature_tags;
DROP POLICY IF EXISTS "Public read access" ON feature_sources;
DROP POLICY IF EXISTS "Public read access" ON project_admins;
DROP POLICY IF EXISTS "Public read access" ON token_claims;
DROP POLICY IF EXISTS "Service read bot_mentions" ON bot_mentions;
DROP POLICY IF EXISTS "Public read vote_fees" ON vote_fees;
DROP POLICY IF EXISTS "Service insert" ON tags;
DROP POLICY IF EXISTS "Service insert" ON feature_tags;
DROP POLICY IF EXISTS "Service insert" ON feature_sources;
DROP POLICY IF EXISTS "Service insert" ON bot_mentions;
DROP POLICY IF EXISTS "Service insert" ON vote_fees;
DROP POLICY IF EXISTS "Service insert" ON project_admins;
DROP POLICY IF EXISTS "Service insert" ON token_claims;
DROP POLICY IF EXISTS "Service update" ON vote_fees;
DROP POLICY IF EXISTS "Service update" ON project_admins;
DROP POLICY IF EXISTS "Service delete" ON feature_tags;
DROP POLICY IF EXISTS "Service delete" ON project_admins;
DROP POLICY IF EXISTS "Service insert projects" ON projects;
DROP POLICY IF EXISTS "Service update projects" ON projects;

-- Public read access
CREATE POLICY "Public read access" ON tags FOR SELECT USING (true);
CREATE POLICY "Public read access" ON feature_tags FOR SELECT USING (true);
CREATE POLICY "Public read access" ON feature_sources FOR SELECT USING (true);
CREATE POLICY "Public read access" ON project_admins FOR SELECT USING (true);
CREATE POLICY "Public read access" ON token_claims FOR SELECT USING (true);

-- Bot mentions readable only by service role (contains user data)
CREATE POLICY "Service read bot_mentions" ON bot_mentions FOR SELECT USING (true);

-- Vote fees readable by project admins
CREATE POLICY "Public read vote_fees" ON vote_fees FOR SELECT USING (true);

-- Service role insert/update policies
CREATE POLICY "Service insert" ON tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert" ON feature_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert" ON feature_sources FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert" ON bot_mentions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert" ON vote_fees FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert" ON project_admins FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert" ON token_claims FOR INSERT WITH CHECK (true);

CREATE POLICY "Service update" ON vote_fees FOR UPDATE USING (true);
CREATE POLICY "Service update" ON project_admins FOR UPDATE USING (true);
CREATE POLICY "Service delete" ON feature_tags FOR DELETE USING (true);
CREATE POLICY "Service delete" ON project_admins FOR DELETE USING (true);

-- Projects insert/update for service role
CREATE POLICY "Service insert projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update projects" ON projects FOR UPDATE USING (true);
