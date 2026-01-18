---
active: true
iteration: 1
max_iterations: 25
completion_promise: "COMPLETE"
started_at: "2026-01-18T14:08:23Z"
---

Add Auth and Dual Mode to Radar. No billing.

AUTH PAGES (standalone mode only):
* /login - Sign in with email/password
* /signup - Create account
* /forgot-password - Request password reset
* Glassmorphism styling matching Radar design
* Redirect to dashboard after auth

DUAL MODE:
* Add RADAR_MODE env variable (standalone/embedded)
* Create StandaloneLayout with Radar header/nav
* Create EmbeddedLayout placeholder (for AgentPM integration later)
* Layout component switches based on mode
* Auth pages only render in standalone mode

AUTH HOOKS:
* useAuth() - returns user, session, signIn, signOut, signUp
* useRequireAuth() - redirects to /login if not authenticated
* Protect dashboard and all main routes

CROSS-APP ACTIONS:
* 'Create Task' button on cards:
  - Opens AgentPM in new tab: agentpm.funnelists.com/tasks/new?title=...&description=...
  - Pass title and summary as URL params
* 'Save to Notes' button on cards:
  - Opens NoteTaker in new tab: agentpm.funnelists.com/notes/new?title=...&content=...
  - Pass title and content as URL params

RENAME ADVISORS → EXPERTS:
* Update all UI labels from 'Advisors' to 'Experts'
* Update navigation links
* Update page titles
* Rename route /advisors to /experts
* Add redirect from /advisors to /experts for any old links
* Keep database table name as 'advisors' (no migration needed)

DO NOT INCLUDE:
* Subscriptions table
* Stripe integration
* Paywall UI
* Trial tracking
* Email sequences

Success criteria:
* Can sign up at /signup (standalone mode)
* Can sign in at /login
* Password reset works
* Dashboard protected - redirects to login if not authenticated
* Dual mode switches layout based on RADAR_MODE env
* Create Task opens AgentPM with prefilled data
* Save to Notes opens NoteTaker with prefilled data
* All UI says 'Experts' not 'Advisors'
* /experts route works
* /advisors redirects to /experts
* No linter errors

Output <promise>COMPLETE</promise> when done.
