## ROADMAPR - Technical Specification for MVP

**tl;dr**: Community-weighted roadmap tool. Launch as Farcaster miniapp using Neynar scores for voting. No token spending in MVP. Build flexible foundation for later: token-based voting, cross-chain, embeds, prediction markets.

---

## Core Concept

Devs create roadmaps. Community submits features. Users vote with weight (Neynar score in MVP, tokens later). Features rank by total weight. Devs ship stuff, mark complete, claim rewards (in token version).

Think: GitHub Issues meets Canny meets "put your money where your mouth is"

---

## MVP Scope - The Farcaster Instance

**What we're building first:**

Official Farcaster protocol roadmap as a miniapp. Farcaster community submits bugs/features, votes using Neynar score (read-only reputation, no spending). Farcaster core team marks items shipped. That's it.

**Why this first:**

- Immediate dogfooding by Farcaster community (they just got acquired, need coordination badly)
- No token mechanics = way less complexity
- Neynar score API already exists
- Distribution built-in via miniapp ecosystem
- Proves the UX before adding financial chaos

**NOT in MVP:**

- Token spending/locking
- Escrow mechanics
- Cross-chain anything
- Embeddable widget
- Multi-tenant (other projects creating roadmaps)
- Community verification of shipped features
- Prediction markets
- AI duplicate detection
- Acceptance criteria checklists

---

## Data Model

**Stack:**

- Frontend: Next.js (or whatever, doesn't matter)
- Auth: Farcaster (via Neynar SDK)
- Database: Supabase (Postgres)
- Hosting: Vercel or wherever

**Schema:**

```sql
-- Projects (for post-MVP multi-tenant)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  creator_fid INTEGER, -- Farcaster ID
  claiming_address TEXT, -- Ethereum/Solana address for token claims
  token_address TEXT, -- Which token for voting (null = Neynar score)
  chain TEXT, -- 'base' | 'solana' | null
  min_vote_amount NUMERIC DEFAULT 1,
  is_binding BOOLEAN DEFAULT false, -- Dev committed to building top votes?
  voting_type TEXT DEFAULT 'score', -- 'score' | 'token'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- In MVP, there's exactly 1 hardcoded project: "Farcaster Protocol"

-- Features/Issues
CREATE TABLE features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  submitter_fid INTEGER NOT NULL,
  status TEXT DEFAULT 'open', -- 'open' | 'in_progress' | 'shipped' | 'hidden'
  total_weight NUMERIC DEFAULT 0, -- Sum of all vote weights
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_features_project_weight ON features(project_id, total_weight DESC);
CREATE INDEX idx_features_status ON features(status);

-- Votes
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
  voter_fid INTEGER NOT NULL,
  weight NUMERIC NOT NULL, -- Positive = upvote, negative = downvote
  voting_power_source TEXT DEFAULT 'neynar_score', -- 'neynar_score' | 'token_balance'
  tx_hash TEXT, -- For token votes (post-MVP)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feature_id, voter_fid) -- One vote per user per feature
);

CREATE INDEX idx_votes_feature ON votes(feature_id);
CREATE INDEX idx_votes_voter ON votes(voter_fid);

-- Authorized Markers (who can mark features as shipped)
CREATE TABLE authorized_markers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  fid INTEGER NOT NULL,
  added_by_fid INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, fid)
);

-- For MVP: seed this table with Farcaster core team FIDs
```

**Vote Weight Calculation:**

In MVP: Simple. User's current Neynar score = their voting weight per feature.

```typescript
// Pseudocode
async function castVote(featureId, voterFid, direction) {
  const neynarScore = await getNeynarScore(voterFid);
  
  if (neynarScore <= 0) throw new Error("Need Neynar score > 0 to vote");
  
  const weight = direction === 'up' ? neynarScore : -neynarScore;
  
  // Upsert vote
  await db.votes.upsert({
    feature_id: featureId,
    voter_fid: voterFid,
    weight: weight
  });
  
  // Recalculate feature total
  const totalWeight = await db.votes
    .where('feature_id', featureId)
    .sum('weight');
  
  await db.features.update(featureId, { total_weight: totalWeight });
  
  // If total_weight < 0, set status = 'hidden'
  if (totalWeight < 0) {
    await db.features.update(featureId, { status: 'hidden' });
  }
}
```

Post-MVP token version: Query user's token balance onchain, use that as weight. Lock tokens in escrow contract. Whole different beast.

---

## User Flows

### **1. Submit Feature (MVP)**

```
User opens Farcaster miniapp
→ Authenticates with Farcaster (Neynar handles this)
→ Sees ranked list of features
→ Clicks "Submit Feature"
→ Fills form:
   - Title (required, max 200 chars)
   - Description (optional, max 2000 chars)
→ Submits
→ Feature appears in feed with 0 votes
```

**Validation:**

- Must have Farcaster account
- Title not empty
- No spam throttling in MVP (add rate limits post-MVP)

### **2. Vote on Feature (MVP)**

```
User sees feature in feed
→ Clicks upvote or downvote
→ System checks Neynar score
→ If score > 0: vote records, weight updates immediately
→ If score = 0: Error message "Need Neynar score > 0 to vote"
→ User can change vote (upvote → downvote or vice versa)
→ Weight recalculates
```

**Display:**

- Show total weight as shortened number (1k, 1.2m, etc.)
- Hover shows full number
- Show user's current vote state (upvoted/downvoted/none)
- Optionally show vote count (how many people voted) separate from weight

### **3. Mark as Shipped (MVP)**

```
Authorized team member (hardcoded FIDs)
→ Sees "Mark Shipped" button on features
→ Clicks it
→ Feature status → 'shipped'
→ Feature shows badge "✅ Shipped"
→ Still visible in feed but sorted separately
```

**Who can mark shipped in MVP:** Hardcode a list of Farcaster core team FIDs in env var or DB seed:

```
AUTHORIZED_MARKERS=123,456,789 // Dan, Varun, whoever
```

Post-MVP: Project creator manages this list via UI.

---

## UI/UX

**Main Feed:**

- Infinite scroll list of features
- Sorted by total_weight DESC (highest first)
- Filters: All | Open | In Progress | Shipped | Hidden
- Each feature card shows:
    - Title
    - Truncated description (expand to read more)
    - Total weight (formatted: 1.2k votes)
    - Upvote/downvote buttons
    - User's current vote (highlighted if they voted)
    - Status badge if not open
    - Submitter (show Farcaster username + avatar)
    - Timestamp

**Submit Feature:**

- Modal or separate page
- Clean form
- Character counters
- Submit button disabled until valid
- Success toast → redirect to feature page

**Feature Detail Page:**

- Full description
- Comments section (post-MVP, skip for now)
- Vote history graph (post-MVP, skip for now)
- Mark Shipped button (only visible to authorized users)

**Hidden Features Toggle:**

- Checkbox or tab: "Show Hidden"
- Hidden features render in collapsed/grayed state
- Can still upvote to resurrect above 0

---

## Tech Stack Recommendations

**Frontend:**

- Next.js 14+ with App Router
- TailwindCSS for styling
- Shadcn/ui for components (optional but nice)
- Farcaster auth via `@neynar/react` SDK

**Backend:**

- Supabase for database + auth
- Supabase Edge Functions for server logic if needed
- Neynar API for score lookups

**Deployment:**

- Vercel for frontend
- Supabase hosted DB

**APIs needed:**

- Neynar API: Get user score, validate FIDs
- Farcaster Hub: Optional for direct protocol access (probably overkill for MVP)

---

## Post-MVP Roadmap (for reference, don't build yet)

**V1 - Token Voting & Escrow:**

- Project creation flow
- Smart contracts for token locking
- Escrow logic (lock on vote, release on ship or 1 week timeout)
- Claiming interface for devs
- Community verification (voters confirm feature shipped)
- Base + Solana deployments

**V1.5 - Multi-tenant:**

- Anyone can create roadmap
- Embeddable widget
- Project discovery page

**V2 - Advanced Features:**

- AI duplicate detection
- Merge feature suggestions
- Acceptance criteria checklists
- Sub-features with nested votes
- Yes/no votes (separate from upvote/downvote)
- Cross-chain bridging (Layerzero? Axelar? TBD)

**V3 - Prediction Markets:**

- Votes become tradeable
- Bonding curves or order books
- Speculative feature markets
- "I'm long on dark mode" memes

---

## Open Questions / Decisions Needed

1. **Exact Farcaster core team FIDs** for authorized markers in MVP
2. **Miniapp manifest/config** - how's Farcaster miniapp deployment work? Need docs
3. **Neynar API rate limits** - what's the quota? Do we need caching?
4. **Vote change policy** - Can users change vote unlimited times or cooldown?
5. **Feature deletion** - Should there be a hard delete for spam or everything just goes hidden?

---

## Success Metrics (MVP)

- 50+ feature submissions in first week
- 500+ total votes cast
- 10+ features marked shipped by core team in first month
- Organic discussion in Farcaster channels about the roadmap

If we hit these, we know the core loop works. Then iterate toward token version.

---

## What Claude Code Should Build First

**Phase 1: Core CRUD**

- Supabase schema setup
- Feature submission form
- Feature feed with vote buttons
- Basic auth (Farcaster via Neynar)

**Phase 2: Voting Logic**

- Neynar score integration
- Vote weight calculation
- Real-time updates (Supabase realtime or polling)
- Hidden features toggle

**Phase 3: Admin Tools**

- Mark as Shipped button
- Authorized user check
- Status filters

**Phase 4: Polish**

- Number formatting (1k, 1m)
- Responsive design
- Loading states
- Error handling

**Phase 5: Deploy**

- Vercel deployment
- Environment variables
- Farcaster miniapp manifest/registration

---

That clear enough or you want me to go deeper on any section?