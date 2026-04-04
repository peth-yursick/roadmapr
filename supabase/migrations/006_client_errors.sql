-- Client error reporting table
-- Fire-and-forget error capture from frontend + server-side errors

CREATE TABLE IF NOT EXISTS client_errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_text TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'client',  -- 'client', 'server', 'api'
  url TEXT,
  user_agent TEXT,
  user_fid INTEGER,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for admin queries
CREATE INDEX idx_client_errors_created_at ON client_errors (created_at DESC);
CREATE INDEX idx_client_errors_source ON client_errors (source);
CREATE INDEX idx_client_errors_error_text ON client_errors USING gin (to_tsvector('english', error_text));

-- RLS: allow anonymous inserts (fire-and-forget), restrict reads to service role
ALTER TABLE client_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert errors"
  ON client_errors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only service role can read errors"
  ON client_errors FOR SELECT
  USING (false);  -- Only accessible via service_role key (admin endpoints)

-- Auto-cleanup: keep errors for 30 days
-- (run via pg_cron or manual cleanup)
