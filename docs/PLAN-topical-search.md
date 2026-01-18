# Topical Search Feature Plan

Search across YouTube, X, and LinkedIn for topics to discover new Experts and potential clients.

## Overview

A search interface that queries multiple platforms simultaneously for a given keyword/topic, displaying results in a unified view. Users can then add discovered profiles as Experts to follow.

---

## API Services Breakdown

### FREE Services

#### 1. YouTube Data API v3
- **Cost**: Free quota of 10,000 units/day
- **Search cost**: ~100 units per search request
- **Daily searches**: ~100 searches/day free
- **What we get**:
  - Video results with titles, descriptions, thumbnails
  - Channel info (name, subscriber count, profile image)
  - View counts, publish dates
- **Already have**: API key configured in project

#### 2. RSS/Atom Feeds
- **Cost**: Completely free
- **Sources**:
  - Blog search via Google Blog Search RSS (deprecated but alternatives exist)
  - Podcast directories (some have RSS search)
  - News aggregators with RSS output
- **Limitations**: Not real-time, limited to sites with feeds

#### 3. Web Scraping (with caution)
- **Cost**: Free but risky
- **Targets**: Public profiles, search result pages
- **Limitations**:
  - Terms of service violations
  - Rate limiting/blocking
  - Maintenance burden as sites change
- **Recommendation**: Avoid for production

---

### PAID Services (Additional Costs)

#### 1. X/Twitter API v2
- **Free tier**: Very limited (1,500 tweets/month READ)
- **Basic tier**: $100/month
  - 10,000 tweets/month read
  - Search tweets (recent, 7-day window)
  - User lookup
- **Pro tier**: $5,000/month
  - Full-archive search
  - Higher rate limits
- **What we get**:
  - Tweet search by keyword
  - User profiles, follower counts
  - Engagement metrics

#### 2. LinkedIn API
- **Marketing API**: Requires LinkedIn Partnership
  - Must apply and be approved
  - Typically for ad platforms
- **Sales Navigator API**: Enterprise pricing (~$1,000+/month)
- **Scraping alternatives** (3rd party):
  - **Proxycurl**: $0.01/profile, $49/month for 490 credits
  - **PhantomBuster**: $59-$439/month
  - **Apify LinkedIn Scrapers**: Pay-per-use
- **Recommendation**: Skip LinkedIn initially or use Proxycurl for targeted lookups

#### 3. Social Search Aggregators
- **Social Searcher**: $3.49-$19.49/month
  - Searches Twitter, Facebook, YouTube, etc.
  - API access on higher plans
- **Mention**: $41-$149/month
  - Real-time monitoring
  - Sentiment analysis included
- **Brand24**: $79-$399/month
  - Comprehensive social listening
  - Influencer identification

#### 4. Google Custom Search API
- **Free**: 100 queries/day
- **Paid**: $5 per 1,000 queries (after free tier)
- **Use case**: Search across the web for topic mentions

---

## Recommended Implementation Phases

### Phase 1: Free YouTube Search (MVP)
**Cost: $0**

```
┌─────────────────────────────────────────────┐
│  Topical Search                             │
│  ┌─────────────────────────────┐  ┌──────┐ │
│  │ Enter topic to search...    │  │Search│ │
│  └─────────────────────────────┘  └──────┘ │
│                                             │
│  Platform: [YouTube ▼]                      │
│                                             │
│  Results:                                   │
│  ┌─────────────────────────────────────────┐│
│  │ 🎬 Channel: Marketing Over Coffee       ││
│  │    234K subscribers                     ││
│  │    [+ Add as Expert]                    ││
│  ├─────────────────────────────────────────┤│
│  │ 🎬 Video: "2024 Marketing Trends"       ││
│  │    by Digital Marketer · 45K views      ││
│  │    [+ Add Channel as Expert]            ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

**Features**:
- Search YouTube for videos and channels
- Display results with channel info
- One-click "Add as Expert" (creates Expert + YouTube Source)
- Filter by: Videos, Channels, Playlists

### Phase 2: Add X/Twitter ($100/month)
**Cost: $100/month for Basic API**

- Search recent tweets (7-day window)
- Find influential accounts tweeting about topic
- Display engagement metrics
- Add Twitter profiles as Experts

### Phase 3: Web Search + RSS Discovery
**Cost: ~$5/month for Google CSE overages**

- Search web for blogs/sites about topic
- Auto-discover RSS feeds from results
- Add discovered blogs as Sources

### Phase 4: LinkedIn (Optional, Premium)
**Cost: $49+/month for Proxycurl or similar**

- Search for LinkedIn profiles by topic/title
- Useful for B2B client discovery
- Add as Experts (limited to profile info, no content feed)

---

## Database Schema Additions

```sql
-- Track topical searches for analytics
CREATE TABLE topical_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id),
  query TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'youtube', 'twitter', 'linkedin', 'web'
  results_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track which experts were discovered via search
ALTER TABLE experts
ADD COLUMN discovered_via TEXT, -- 'search', 'manual', 'import'
ADD COLUMN discovery_query TEXT; -- The search term that found them
```

---

## API Endpoints

### POST /api/search/youtube
```typescript
// Request
{ query: string, type?: 'video' | 'channel' | 'playlist', maxResults?: number }

// Response
{
  results: [{
    id: string,
    type: 'video' | 'channel',
    title: string,
    description: string,
    thumbnail: string,
    channelId: string,
    channelTitle: string,
    publishedAt: string,
    viewCount?: number,
    subscriberCount?: number
  }]
}
```

### POST /api/search/twitter (Phase 2)
```typescript
// Request
{ query: string, maxResults?: number }

// Response
{
  results: [{
    id: string,
    text: string,
    authorId: string,
    authorName: string,
    authorHandle: string,
    authorFollowers: number,
    likeCount: number,
    retweetCount: number,
    createdAt: string
  }]
}
```

### POST /api/experts/from-search
```typescript
// Request
{
  platform: 'youtube' | 'twitter' | 'linkedin',
  platformId: string, // channel ID, user ID, etc.
  name: string,
  profileUrl: string,
  imageUrl?: string,
  discoveryQuery: string
}

// Response
{ expert: Expert, source?: Source }
```

---

## UI Components

### New Page: /search
- Search input with platform selector
- Results grid (reuse card components)
- "Add as Expert" action on each result
- Search history sidebar

### Modified: Expert Card
- Show "Discovered via: [query]" badge if applicable
- Link to original search result

---

## Cost Summary

| Phase | Monthly Cost | Features |
|-------|-------------|----------|
| Phase 1 (MVP) | $0 | YouTube search |
| Phase 2 | $100 | + Twitter search |
| Phase 3 | ~$5 | + Web/RSS search |
| Phase 4 | $49+ | + LinkedIn (optional) |

**Recommended start**: Phase 1 (free) to validate the feature, then add Twitter if users request it.

---

## Implementation Priority

1. **YouTube Search API endpoint** - leverage existing API key
2. **Search UI page** - /search route with results display
3. **"Add as Expert" flow** - create expert + auto-create YouTube source
4. **Search history** - track and display recent searches
5. **(Future)** Twitter integration when budget allows
