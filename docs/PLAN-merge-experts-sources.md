# Plan: Merge Experts and Sources

## Overview
Combine the separate "Sources" (RSS feeds) and "Experts" (social accounts) into a unified "Experts" model where each expert can have multiple platform connections.

## Current State

### Database Tables
- **sources**: RSS feeds, YouTube channels - used for auto-fetching content
  - Fields: name, type, url, channel_id, username, topic_id
- **advisors**: Social accounts to track
  - Fields: name, platform, username, avatar_url, bio, topic_id
- **content_items**: Has both `source_id` and `advisor_id` foreign keys

### UI
- `/sources` page - Add RSS/YouTube feeds
- `/experts` page - Add Twitter/LinkedIn/YouTube accounts
- Dashboard filters by topic (including "Advisors" topic)

---

## Proposed New Schema

### Option A: Single Table with Connections Array (Simpler)
```sql
-- Rename advisors → experts, add profile fields
ALTER TABLE advisors RENAME TO experts;

ALTER TABLE experts ADD COLUMN connections JSONB DEFAULT '[]';
-- connections: [
--   { platform: 'youtube', username: 'AlexHormozi', feed_url: '...', channel_id: '...' },
--   { platform: 'twitter', username: 'AlexHormozi' },
--   { platform: 'rss', url: 'https://blog.example.com/feed' }
-- ]
```

**Pros**: Simple migration, single table
**Cons**: Harder to query specific connections, no FK integrity on connections

### Option B: Normalized Tables (Recommended)
```sql
-- experts table (people/entities to follow)
CREATE TABLE experts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- expert_connections table (platform-specific connections)
CREATE TABLE expert_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'youtube', 'rss')),
  username TEXT,           -- for social platforms
  url TEXT,                -- for RSS feeds
  channel_id TEXT,         -- for YouTube
  feed_url TEXT,           -- auto-generated RSS URL for YouTube
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expert_id, platform, COALESCE(username, url))  -- prevent duplicates
);
```

**Pros**:
- Proper relational structure
- Easy to query "all YouTube connections" or "all connections for expert X"
- Can track fetch status per connection
- Extensible for future platforms

**Cons**:
- Slightly more complex queries (need JOINs)
- More migration work

---

## Migration Strategy (Option B)

### Phase 1: Database Migration

```sql
-- 005_merge_experts_sources.sql

-- 1. Create new experts table from advisors
CREATE TABLE experts AS
SELECT
  id,
  account_id,
  name,
  avatar_url,
  bio,
  topic_id,
  is_active,
  created_at,
  updated_at
FROM advisors;

ALTER TABLE experts ADD PRIMARY KEY (id);
ALTER TABLE experts ADD CONSTRAINT experts_topic_fk
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL;

-- 2. Create expert_connections table
CREATE TABLE expert_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'youtube', 'rss')),
  username TEXT,
  url TEXT,
  channel_id TEXT,
  feed_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Migrate advisor connections
INSERT INTO expert_connections (expert_id, platform, username, created_at, updated_at)
SELECT id, platform, username, created_at, updated_at
FROM advisors;

-- 4. Create experts from sources (need to dedupe by name)
-- This will create new expert entries for sources that don't match existing experts
INSERT INTO experts (account_id, name, topic_id, is_active, created_at, updated_at)
SELECT DISTINCT ON (name)
  account_id,
  name,
  topic_id,
  is_active,
  created_at,
  updated_at
FROM sources
WHERE NOT EXISTS (
  SELECT 1 FROM experts e WHERE LOWER(e.name) = LOWER(sources.name)
);

-- 5. Migrate source connections to expert_connections
INSERT INTO expert_connections (expert_id, platform, username, url, channel_id, feed_url, is_active, last_fetched_at, created_at)
SELECT
  COALESCE(
    (SELECT id FROM experts e WHERE LOWER(e.name) = LOWER(s.name) LIMIT 1),
    -- Create inline if no match (shouldn't happen after step 4)
    uuid_generate_v4()
  ),
  s.type,
  s.username,
  CASE WHEN s.type = 'rss' THEN s.url ELSE NULL END,
  s.channel_id,
  CASE WHEN s.type = 'youtube' THEN s.url ELSE NULL END,
  s.is_active,
  s.last_fetched_at,
  s.created_at
FROM sources s;

-- 6. Update content_items to use expert_id only
-- First, set expert_id for items that only have source_id
UPDATE content_items ci
SET advisor_id = (
  SELECT ec.expert_id
  FROM expert_connections ec
  JOIN sources s ON (
    ec.platform = s.type AND
    (ec.username = s.username OR ec.url = s.url OR ec.channel_id = s.channel_id)
  )
  WHERE s.id = ci.source_id
  LIMIT 1
)
WHERE ci.source_id IS NOT NULL AND ci.advisor_id IS NULL;

-- 7. Rename advisor_id to expert_id
ALTER TABLE content_items RENAME COLUMN advisor_id TO expert_id;
ALTER TABLE content_items DROP COLUMN source_id;

-- 8. Drop old tables (after verification)
-- DROP TABLE advisors;
-- DROP TABLE sources;

-- 9. Add indexes
CREATE INDEX idx_expert_connections_expert_id ON expert_connections(expert_id);
CREATE INDEX idx_expert_connections_platform ON expert_connections(platform);
CREATE INDEX idx_experts_account_id ON experts(account_id);

-- 10. RLS policies for new tables
ALTER TABLE experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own experts" ON experts
  FOR SELECT USING (account_id = current_setting('app.account_id', true));
-- ... (full CRUD policies)

CREATE POLICY "Users can view their own expert connections" ON expert_connections
  FOR SELECT USING (expert_id IN (SELECT id FROM experts WHERE account_id = current_setting('app.account_id', true)));
-- ... (full CRUD policies)
```

### Phase 2: Type Definitions

```typescript
// src/types/database.ts

export interface Expert {
  id: string;
  account_id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  topic_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpertConnection {
  id: string;
  expert_id: string;
  platform: 'twitter' | 'linkedin' | 'youtube' | 'rss';
  username: string | null;
  url: string | null;
  channel_id: string | null;
  feed_url: string | null;
  is_active: boolean;
  last_fetched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpertWithConnections extends Expert {
  connections: ExpertConnection[];
  topic?: Topic | null;
}
```

### Phase 3: API Changes

**New endpoints:**
- `GET /api/experts` - List experts with their connections
- `POST /api/experts` - Create expert
- `PUT /api/experts/[id]` - Update expert
- `DELETE /api/experts/[id]` - Delete expert (cascades to connections)
- `POST /api/experts/[id]/connections` - Add connection to expert
- `DELETE /api/experts/[id]/connections/[connectionId]` - Remove connection

**Remove:**
- `/api/sources/*` routes
- `/api/advisors/*` routes (redirect to /api/experts)

### Phase 4: UI Changes

1. **Remove `/sources` page** - functionality moves to `/experts`

2. **Update Sidebar** - Remove "Sources" nav item

3. **Redesign `/experts` page:**
   ```
   ┌─────────────────────────────────────────────────┐
   │ [+ Add Expert]                                   │
   ├─────────────────────────────────────────────────┤
   │ ┌─────────────────────────────────────────────┐ │
   │ │ 🖼️ Alex Hormozi                              │ │
   │ │ Entrepreneur & Author                        │ │
   │ │                                              │ │
   │ │ Connections:                                 │ │
   │ │ 🎬 YouTube: @AlexHormozi  ✓ fetching        │ │
   │ │ 🐦 Twitter: @AlexHormozi                    │ │
   │ │ [+ Add Connection]                          │ │
   │ │                                              │ │
   │ │ Topic: Business  [Edit] [Delete]           │ │
   │ └─────────────────────────────────────────────┘ │
   └─────────────────────────────────────────────────┘
   ```

4. **Update AddExpertModal:**
   - Step 1: Expert profile (name, bio, avatar, topic)
   - Step 2: Add connections (repeatable)
     - Platform selector
     - Platform-specific fields (username for social, URL for RSS)
     - Auto-fetch profile data when available

5. **Update Dashboard filters:**
   - "Experts" filter shows content from any expert connection
   - Can filter by specific expert

### Phase 5: Content Fetching Updates

Update the fetch worker to:
1. Query `expert_connections` instead of `sources`
2. Use `feed_url` for YouTube, `url` for RSS
3. Associate fetched content with `expert_id`

---

## UI/UX Flow for Adding Expert

### Flow 1: Start with Platform
1. User clicks "Add Expert"
2. Select platform (YouTube, Twitter, LinkedIn, RSS)
3. Enter username/URL
4. System fetches profile info (name, avatar, bio)
5. User confirms/edits profile
6. Expert created with initial connection
7. User can add more connections

### Flow 2: Start with Expert (Alternative)
1. User clicks "Add Expert"
2. Enter name manually
3. Add connections one by one
4. System attempts to fetch profile from first connection

**Recommendation**: Flow 1 is more intuitive - most users start knowing "I want to follow @username"

---

## Rollout Plan

1. **Create migration file** (don't run yet)
2. **Build new UI components** (feature flagged)
3. **Build new API routes** (parallel to existing)
4. **Test with fresh data**
5. **Run migration on staging**
6. **Verify data integrity**
7. **Deploy to production**
8. **Remove old code/routes**

---

## Open Questions

1. **Name matching**: When migrating sources, how to match with existing experts? (Proposed: case-insensitive name match)

2. **Duplicate handling**: What if same YouTube channel exists as both source and advisor? (Proposed: Merge into single expert)

3. **Content attribution**: Should old content keep source_id reference or migrate to expert_id? (Proposed: Migrate all)

4. **Topic from filter**: The "Advisors" topic in the database - should it become "Experts"? (Proposed: Yes, rename via SQL UPDATE)

---

## Files to Modify

### Database
- [ ] `supabase/migrations/005_merge_experts_sources.sql`

### Types
- [ ] `src/types/database.ts`

### API Routes
- [ ] `src/app/api/experts/route.ts` (update)
- [ ] `src/app/api/experts/[id]/route.ts` (new)
- [ ] `src/app/api/experts/[id]/connections/route.ts` (new)
- [ ] Delete `src/app/api/sources/route.ts`
- [ ] Delete `src/app/api/advisors/route.ts` (or redirect)

### Pages
- [ ] `src/app/experts/page.tsx` (major update)
- [ ] Delete `src/app/sources/page.tsx`

### Components
- [ ] `src/components/modals/AddExpertModal.tsx` (replace AddAdvisorModal)
- [ ] `src/components/modals/AddConnectionModal.tsx` (new)
- [ ] `src/components/cards/ExpertCard.tsx` (new or update)
- [ ] `src/components/layout/Sidebar.tsx` (remove Sources)

### Fetch Worker
- [ ] `src/lib/fetch/worker.ts` or similar (update to use expert_connections)

---

## Estimated Effort

- Database migration: Medium (need careful data mapping)
- API routes: Low-Medium
- UI components: Medium-High (new modal flow, expert cards)
- Testing: Medium
- Total: ~2-3 focused sessions
