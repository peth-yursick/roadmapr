-- Migration: Add token claiming for project upvotes
-- Version: 004

-- Add token escrow fields to project_votes
ALTER TABLE project_votes
ADD COLUMN IF NOT EXISTS tokens_locked NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS claimed_by_owner BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS claim_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS token_address TEXT;

-- Add total_tokens_claimable to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS total_tokens_claimable NUMERIC DEFAULT 0;

-- Create index for unclaimed votes
CREATE INDEX IF NOT EXISTS idx_project_votes_unclaimed
  ON project_votes(project_id)
  WHERE tokens_locked > 0 AND claimed_by_owner = false;

-- Function to calculate claimable tokens for a project
CREATE OR REPLACE FUNCTION calculate_project_claimable_tokens(project_uuid UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(SUM(tokens_locked), 0)
  FROM project_votes
  WHERE project_id = project_uuid
    AND tokens_locked > 0
    AND claimed_by_owner = false;
$$;

-- Function to update project's claimable tokens
CREATE OR REPLACE FUNCTION update_project_claimable_tokens()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update total_tokens_claimable when votes are added/updated
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE') THEN
    UPDATE projects
    SET total_tokens_claimable = calculate_project_claimable_tokens(NEW.project_id)
    WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE projects
    SET total_tokens_claimable = calculate_project_claimable_tokens(OLD.project_id)
    WHERE id = OLD.project_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to auto-update claimable tokens
DROP TRIGGER IF EXISTS update_project_claimable_trigger ON project_votes;
CREATE TRIGGER update_project_claimable_trigger
AFTER INSERT OR UPDATE OR DELETE ON project_votes
FOR EACH ROW
EXECUTE FUNCTION update_project_claimable_tokens();

-- Add policy for updating project_votes (for claiming)
DROP POLICY IF EXISTS "Service update project votes" ON project_votes;
CREATE POLICY "Service update project votes" ON project_votes
  FOR UPDATE USING (true);
