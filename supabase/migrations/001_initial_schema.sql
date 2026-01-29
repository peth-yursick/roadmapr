-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table (single hardcoded project for MVP, multi-tenant later)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  creator_fid INTEGER,
  claiming_address TEXT,
  token_address TEXT,
  chain TEXT,
  min_vote_amount NUMERIC DEFAULT 1,
  is_binding BOOLEAN DEFAULT false,
  voting_type TEXT DEFAULT 'score',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Features/Issues
CREATE TABLE IF NOT EXISTS features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  submitter_fid INTEGER NOT NULL,
  status TEXT DEFAULT 'open',
  total_weight NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_features_project_weight ON features(project_id, total_weight DESC);
CREATE INDEX IF NOT EXISTS idx_features_status ON features(status);

-- Votes
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
  voter_fid INTEGER NOT NULL,
  weight NUMERIC NOT NULL,
  voting_power_source TEXT DEFAULT 'neynar_score',
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feature_id, voter_fid)
);

CREATE INDEX IF NOT EXISTS idx_votes_feature ON votes(feature_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_fid);

-- Authorized Markers (who can mark features as shipped)
CREATE TABLE IF NOT EXISTS authorized_markers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  fid INTEGER NOT NULL,
  added_by_fid INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, fid)
);

-- Row Level Security (only enable if not already enabled)
DO $$
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'projects' AND rowsecurity = true
  ) THEN
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'features' AND rowsecurity = true
  ) THEN
    ALTER TABLE features ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'votes' AND rowsecurity = true
  ) THEN
    ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'authorized_markers' AND rowsecurity = true
  ) THEN
    ALTER TABLE authorized_markers ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Public read access" ON projects;
DROP POLICY IF EXISTS "Public read access" ON features;
DROP POLICY IF EXISTS "Public read access" ON votes;
DROP POLICY IF EXISTS "Public read access" ON authorized_markers;
DROP POLICY IF EXISTS "Service insert features" ON features;
DROP POLICY IF EXISTS "Service insert votes" ON votes;
DROP POLICY IF EXISTS "Service update features" ON features;
DROP POLICY IF EXISTS "Service update votes" ON votes;
DROP POLICY IF EXISTS "Service delete votes" ON votes;

-- Public read access for all tables
CREATE POLICY "Public read access" ON projects FOR SELECT USING (true);
CREATE POLICY "Public read access" ON features FOR SELECT USING (true);
CREATE POLICY "Public read access" ON votes FOR SELECT USING (true);
CREATE POLICY "Public read access" ON authorized_markers FOR SELECT USING (true);

-- Insert/update policies (handled via API routes with server-side auth)
-- Using service role key in API routes bypasses RLS
CREATE POLICY "Service insert features" ON features FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert votes" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update features" ON features FOR UPDATE USING (true);
CREATE POLICY "Service update votes" ON votes FOR UPDATE USING (true);
CREATE POLICY "Service delete votes" ON votes FOR DELETE USING (true);
