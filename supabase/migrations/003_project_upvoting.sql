-- Migration: Add project upvoting
-- Version: 003

-- Add vote tracking to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS total_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0;

-- Create project_votes table
CREATE TABLE IF NOT EXISTS project_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    voter_fid INTEGER NOT NULL,
    voter_address TEXT,
    vote_amount NUMERIC DEFAULT 0.1 NOT NULL,
    tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, voter_fid)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_votes_project ON project_votes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_votes_voter ON project_votes(voter_fid);

-- Enable RLS
ALTER TABLE project_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read project votes" ON project_votes FOR SELECT USING (true);
CREATE POLICY "Service insert project votes" ON project_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update project votes" ON project_votes FOR UPDATE WITH CHECK (true);
CREATE POLICY "Service delete project votes" ON project_votes FOR DELETE WITH CHECK (true);

-- Function to update project vote count
CREATE OR REPLACE FUNCTION update_project_vote_count() RETURNS TRIGGER AS $$
BEGIN
    UPDATE projects
    SET
        total_votes = (
            SELECT COUNT(*)::INTEGER
            FROM project_votes
            WHERE project_id = projects.id
        ),
        vote_count = (
            SELECT COUNT(*)::INTEGER
            FROM project_votes
            WHERE project_id = projects.id
        )
    WHERE id = NEW.project_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update vote counts
DROP TRIGGER IF EXISTS update_project_votes_trigger ON project_votes;
CREATE TRIGGER update_project_votes_trigger
AFTER INSERT OR DELETE ON project_votes
FOR EACH ROW
EXECUTE FUNCTION update_project_vote_count();
