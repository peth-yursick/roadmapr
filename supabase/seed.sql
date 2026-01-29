-- Seed the default Farcaster Protocol project (uses Neynar score voting - FREE)
INSERT INTO projects (
  id,
  name,
  description,
  creator_fid,
  voting_type,
  project_handle,
  owner_fid,
  bio,
  is_verified,
  external_link
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Farcaster Protocol',
  'The official community roadmap for Farcaster Protocol. Submit feature requests, report bugs, and vote on what gets built next.',
  3,  -- Dan Romero's FID
  'score',
  'farcaster',
  3,  -- Dan Romero as owner
  'A sufficiently decentralized social network built on Ethereum.',
  true,
  'https://farcaster.xyz'
)
ON CONFLICT (id) DO UPDATE SET
  project_handle = EXCLUDED.project_handle,
  owner_fid = EXCLUDED.owner_fid,
  bio = EXCLUDED.bio,
  is_verified = EXCLUDED.is_verified,
  external_link = EXCLUDED.external_link;

-- Seed authorized markers (Farcaster core team)
INSERT INTO authorized_markers (project_id, fid, added_by_fid) VALUES
  ('00000000-0000-0000-0000-000000000001', 3, NULL),    -- Dan Romero
  ('00000000-0000-0000-0000-000000000001', 5, NULL),    -- Varun Srinivasan
  ('00000000-0000-0000-0000-000000000001', 2, NULL)     -- Other core team
ON CONFLICT (project_id, fid) DO NOTHING;

-- Seed project admins (same as authorized markers for Farcaster)
INSERT INTO project_admins (project_id, fid, role, added_by_fid) VALUES
  ('00000000-0000-0000-0000-000000000001', 3, 'owner', NULL),
  ('00000000-0000-0000-0000-000000000001', 5, 'admin', 3),
  ('00000000-0000-0000-0000-000000000001', 2, 'admin', 3)
ON CONFLICT (project_id, fid) DO NOTHING;

-- Example: Token-voting project (for testing)
-- Uncomment to seed a test token project
/*
INSERT INTO projects (
  id,
  name,
  description,
  creator_fid,
  voting_type,
  project_handle,
  owner_fid,
  bio,
  token_address,
  chain,
  vote_increment,
  vote_increment_usd,
  fee_recipient_address
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Example Token Project',
  'A test project demonstrating token-based voting.',
  12345,
  'token',
  'example',
  12345,
  'This is a test project for token voting.',
  '0x0000000000000000000000000000000000000000',
  'base',
  1000000,  -- 1M tokens per vote increment
  0.01,     -- Each increment worth $0.01
  '0x0000000000000000000000000000000000000000'
);
*/
