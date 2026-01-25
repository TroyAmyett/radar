# PRD: Source Discovery

## Overview
AI-powered source discovery that helps users find relevant blogs, YouTube channels, and other sources based on their topics.

## Problem
- Users don't know what sources to follow for their topics
- Manual source finding is time-consuming
- No guidance on quality sources
- Empty topics feel incomplete

## Solution

### Core Features

#### 1. Discover Button on Sources Page
Location: Next to "Add Source" button
```
Sources (12/50)
[+ Add Source] [✨ Discover]
```

#### 2. Topic-Based Recommendations
When user clicks Discover:
1. Show dropdown of their topics
2. AI searches for relevant sources
3. Display results with reasoning

```
┌─────────────────────────────────────────────┐
│ Discover Sources                            │
├─────────────────────────────────────────────┤
│ Find sources for: [Agentforce ▾]  [Search]  │
│                                             │
│ Recommended:                                │
│                                             │
│ 📺 Salesforce Developers                    │
│    "Official channel - Agentforce tutorials │
│     and deep dives, 200k subscribers"       │
│    [+ Add to Agentforce]                    │
│                                             │
│ 📰 Salesforce Ben                           │
│    "Most popular SF blog - weekly           │
│     Agentforce coverage, practical guides"  │
│    [+ Add to Agentforce]                    │
└─────────────────────────────────────────────┘
```

#### 3. AI Chat Search
Free-form search for custom queries:
```
┌─────────────────────────────────────────────┐
│ Or search for anything:                     │
│ ┌─────────────────────────────────────────┐ │
│ │ kubernetes security blogs               │ │
│ └─────────────────────────────────────────┘ │
│                              [🔍 Search]    │
│                                             │
│ Found 4 sources:                            │
│                                             │
│ 📰 Kubernetes Security Blog                 │
│    "Official K8s security team updates,    │
│     vulnerability announcements"            │
│    [+ Add to: [Select Topic ▾]]            │
└─────────────────────────────────────────────┘
```

#### 4. Email Digest Recommendations
Add section to digest emails:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Recommended Sources

Based on your "Agentforce" topic:

• Salesforce Ben (blog)
  Popular Salesforce blog with Agentforce coverage
  → Add to Radar: https://radar.app/sources?add=...

• @SalesforceDev (YouTube)
  Official tutorials and demos
  → Add to Radar: https://radar.app/sources?add=...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Recommendation Reasoning
Every suggested source includes WHY:
- Relevance to topic
- Popularity/authority indicators
- Content type/frequency
- Unique value proposition

## Technical Implementation

### API Endpoints

#### POST /api/discover-sources
```typescript
Request:
{
  topic?: string;      // Topic name to search for
  query?: string;      // Free-form search query
}

Response:
{
  sources: [
    {
      name: string;
      url: string;
      type: 'rss' | 'youtube';
      reason: string;   // Why we recommend this
      metadata?: {
        subscribers?: string;
        frequency?: string;
      }
    }
  ]
}
```

### Implementation Flow
1. Take topic name or custom query
2. Web search: `"best {topic} blogs 2026"`, `"top {topic} YouTube channels"`
3. AI extracts source info from search results
4. Return structured recommendations with reasoning

### One-Click Add Flow
URL format: `/sources?add={base64-encoded-source-data}`
- Pre-fills Add Source form
- User confirms topic assignment
- Single click to save

## UI Components

### DiscoverSourcesModal
- Topic selector dropdown
- Free-form search input
- Results list with Add buttons
- Loading/empty states

### Sources Page Updates
- Add Discover button to header
- Handle `?add=` URL param for pre-fill

### Email Template Updates
- Add "Recommended Sources" section
- Generate one-click add links

## Success Metrics
- Sources added via Discover vs manual
- Time to first source added
- Topic coverage (% of topics with sources)

## Priority
Medium-High - Key differentiator, improves onboarding

## Estimated Effort
Medium - New API endpoint, modal component, email integration

## Future Enhancements
- Source quality scoring
- "Similar to sources you follow"
- Community-sourced recommendations
