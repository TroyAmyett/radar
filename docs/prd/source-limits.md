# PRD: Source Limits

## Overview
Implement limits on sources per user to ensure system performance and encourage curation.

## Problem
- Uncapped sources could cause database bloat
- 100 sources x 20 items = 2,000 items per user
- Cron job timeouts with many sources
- Too many sources = noisy, unfocused feed
- Cost creep (storage, API calls)

## Solution

### Limits
| Limit | Value | Reason |
|-------|-------|--------|
| Max sources per user | 50 | Keeps fetches fast, forces curation |
| Warning threshold | 40 | Give users time to clean up |
| Items per source (kept) | 20 | Older items auto-pruned |
| Content age | 30 days | Auto-delete uninteracted items |

### User Experience

#### Sources Page Header
```
Sources (12/50)
[+ Add Source] [Discover]
```

#### Warning State (40+ sources)
```
Sources (42/50)
⚠️ You're approaching your source limit. Consider removing inactive sources.
```

#### Blocked State (50 sources)
```
Sources (50/50)
🚫 Source limit reached. Remove a source to add more.
[+ Add Source] ← disabled
```

## Technical Changes

### Constants
```typescript
// lib/constants.ts
export const MAX_SOURCES_PER_USER = 50;
export const SOURCE_WARNING_THRESHOLD = 40;
```

### API Changes

#### POST /api/sources
- Before insert, count existing sources for account
- If >= 50, return 400 error with message
- Return current count in response for UI

#### GET /api/sources
- Include `totalCount` in response metadata

### UI Changes

#### Sources Page
- Show "(X/50)" count in header
- Warning banner when >= 40
- Disable Add button when >= 50

## Backlog (Not Now)
- Recommend removing inactive sources (no clicks in 30 days)
- Source health indicator (last successful fetch)

## Priority
High - Prevent runaway costs

## Estimated Effort
Small - API validation + UI indicators
