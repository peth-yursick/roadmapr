-- Add is_upvote column to project_votes table for upvote/downvote tracking
ALTER TABLE project_votes
ADD COLUMN IF NOT EXISTS is_upvote BOOLEAN DEFAULT true;

-- Update existing votes (assume true for backwards compatibility)
UPDATE project_votes
SET is_upvote = true
WHERE is_upvote IS NULL;
