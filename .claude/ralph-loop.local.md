---
active: true
iteration: 1
max_iterations: 25
completion_promise: "COMPLETE"
started_at: "2026-01-18T13:04:54Z"
---

Migrate Radar from Vercel cron to Supabase pg_cron.

REMOVE VERCEL CRON:
* Delete vercel.json cron configuration (if exists)
* Keep API endpoints but ensure they validate CRON_SECRET

SUPABASE SETUP:
* Create migration file to enable pg_cron and pg_net extensions
* Create cron jobs table to track job status and history
* Set up cron schedules:
  - fetch-sources: every 30 minutes
  - morning-digest: 6am daily (EST/UTC-5)
  - evening-digest: 9pm daily (EST/UTC-5)  
  - weekly-digest: Sunday 8am (EST/UTC-5)

MIGRATION SQL:
* Enable extensions: pg_cron, pg_net
* Create cron.schedule entries that call API endpoints via net.http_post
* Pass CRON_SECRET in Authorization header
* Create cron_job_logs table to track executions

API ENDPOINTS:
* Ensure these endpoints exist and work:
  - POST /api/cron/fetch-sources - Fetches all active sources
  - POST /api/cron/morning-digest - Generates and sends morning digest
  - POST /api/cron/evening-digest - Generates and sends evening digest
  - POST /api/cron/weekly-digest - Generates and sends weekly digest
* All endpoints validate Bearer token matches CRON_SECRET
* All endpoints return JSON with success/error status
* Log results to cron_job_logs table

ENV VARIABLES:
* Use existing CRON_SECRET for auth
* Use NEXT_PUBLIC_SUPABASE_URL for the base URL in cron calls

EDGE FUNCTION ALTERNATIVE (if pg_net not available):
* Create Supabase Edge Function as fallback
* Edge function calls the API endpoints on schedule

SUCCESS CRITERIA:
* No Vercel cron configuration
* pg_cron jobs created in Supabase
* fetch-sources runs every 30 min
* morning-digest runs at 6am EST
* evening-digest runs at 9pm EST
* weekly-digest runs Sunday 8am EST
* Job executions logged to cron_job_logs
* All endpoints protected by CRON_SECRET
* No linter errors

Output <promise>COMPLETE</promise> when done.
