---
active: true
iteration: 1
max_iterations: 35
completion_promise: "COMPLETE"
started_at: "2026-01-18T03:48:19Z"
---

Build Radar Phase 3 - What's Hot Publishing.

WHAT'S HOT DATABASE:
* Create whats_hot_posts table
* Create email_subscribers table

PUBLISH FLOW:
* Add Publish button to content cards
* PublishModal: edit title/summary, toggle X post, toggle email
* On publish:
  - Create whats_hot_posts record
  - If X enabled, post via X API
  - If email enabled, queue for next digest

WHAT'S HOT PAGE (for funnelists-cms):
* Create /whats-hot page component
* List published posts with pagination
* Topic filter
* Link to original source

EMAIL SUBSCRIPTION:
* Create subscription widget component
* POST /api/subscribers endpoint
* Confirmation email via Resend
* Unsubscribe link

X INTEGRATION:
* Set up X API v2 client
* Post with title, summary, link, hashtags
* Store post ID for tracking

AUTO-PUBLISH (optional):
* Score content relevance 0-100
* Auto-publish if score > 80
* Queue for review if 50-80

Success criteria:
* Can publish content to What's Hot
* What's Hot page displays published posts
* Can post to X via API
* Email subscription works
* Subscribers receive digest
* Unsubscribe works
* No linter errors

Output <promise>COMPLETE</promise> when done.
