---
active: true
iteration: 1
max_iterations: 35
completion_promise: "COMPLETE"
started_at: "2026-01-18T01:37:57Z"
---

Build Radar Phase 2 - AI Summaries & Email Digests.

AI SUMMARIZATION:
* Create lib/ai/summarize.ts using Claude API
* On content fetch, generate 2-3 sentence summary
* Extract key points array
* Calculate sentiment (-1 to 1)
* Store in content_items table

DEEP DIVE:
* Add Deep Dive button to cards
* Generate full analysis: key points, sentiment, related items, action items
* Display in modal or slide-out panel

EMAIL DIGESTS:
* Set up Resend client in lib/email/resend.ts
* Create email templates:
  - MorningDigest.tsx (Top 5, advisor highlights, AI insight)
  - WeeklyDigest.tsx (Week summary, trends, top content)
* Create digest generation endpoint /api/digests/generate
* Create digest send endpoint /api/digests/send

SCHEDULING:
* Set up Vercel cron jobs:
  - fetch-sources: every 30 minutes
  - morning-digest: 6am daily
  - weekly-digest: Sunday 8am

DIGEST PREFERENCES:
* Add to settings page: digest time, frequency, topics to include
* Store in user preferences

Success criteria:
* All content has AI summary after fetch
* Deep Dive generates full analysis
* Morning digest email renders correctly
* Weekly digest email renders correctly
* Cron jobs run on schedule
* User can configure digest preferences
* No linter errors

Output <promise>COMPLETE</promise> when done.
