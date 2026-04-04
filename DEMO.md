# DentaLink — 1-Hour Grading Demo Workflow

> **Credentials for all seeded accounts:** password `123123`
> - Regular users: `regular1@csc309.utoronto.ca` through `regular20@csc309.utoronto.ca`
> - Businesses: `business1@csc309.utoronto.ca` through `business10@csc309.utoronto.ca`
> - Admin: `admin1@csc309.utoronto.ca`

> **Tip:** Before the interview, reseed your database so all states are fresh. Have 3 browser tabs/profiles ready (Admin, Business, Regular) so you can switch roles instantly.

---

## Phase 0 — Public Pages & Authentication (~8 min)

### 0.1 Landing Page
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 1 | Open the root URL | — | Landing page introduces the platform, has clear CTAs to Register / Login |
| 2 | Click "View Businesses" or equivalent | `GET /businesses` (public) | Navigate to the public business list without logging in |

### 0.2 Public Business List & Profile
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 3 | Browse the business list | `GET /businesses?page=1&limit=10` | Pagination controls, at least 2 pages; **no** admin-only fields (owner_name, verified, activated) visible |
| 4 | Go to page 2 | `GET /businesses?page=2` | Pagination works |
| 5 | Click on a specific business | `GET /businesses/:businessId` | Public profile: business name, location, avatar, biography, postal address. **No** owner_name or verified status visible |
| **Bad Path** | Try accessing an admin route directly via URL (e.g. `/admin/users`) | — | Redirect to login or show 403/unauthorized message |

### 0.3 Regular User Registration
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 6 | Click "Register as Regular User" | — | Registration form appears |
| 7 | Submit with **missing required fields** (leave email blank) | `POST /users` → 400 | Frontend shows validation error |
| 8 | Submit with **invalid password** (e.g. "abc") | `POST /users` → 400 | Error: password doesn't meet requirements |
| 9 | Submit with **duplicate email** (e.g. `regular1@csc309.utoronto.ca`) | `POST /users` → 409 | Error: account already exists |
| 10 | Submit with **valid data** using a new email | `POST /users` → 201 | Success message, show that a reset token is returned (for activation) |

### 0.4 Business User Registration
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 11 | Navigate to business registration | — | Form includes business_name, owner_name, email, password, phone, postal_address, location |
| 12 | Submit with valid data | `POST /businesses` → 201 | Success, reset token returned |
| **Bad Path** | Submit with same email as a regular user | `POST /businesses` → 409 | Cross-role email uniqueness enforced |

### 0.5 Account Activation & Password Reset
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 13 | Try logging in with unactivated account | `POST /auth/tokens` → 403 | Error: account not activated |
| 14 | Use the activation flow (reset token) | `POST /auth/resets/:resetToken` | Account activated successfully |
| 15 | Request a password reset | `POST /auth/resets` → 202 | Token returned with expiry |
| 16 | Request **again immediately** (same IP) | `POST /auth/resets` → 429 | Rate limited — cooldown enforced |
| 17 | Complete password reset with new password | `POST /auth/resets/:resetToken` | Password changed |
| **Bad Path** | Use expired/invalid token | `POST /auth/resets/:resetToken` → 404 or 410 | Appropriate error shown |
| **Bad Path** | Mismatched email with token | `POST /auth/resets/:resetToken` → 401 | Unauthorized |

### 0.6 Login
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 18 | Login with wrong password | `POST /auth/tokens` → 401 | Invalid credentials error |
| 19 | Login as `regular1@csc309.utoronto.ca` / `123123` | `POST /auth/tokens` → 200 | JWT received, navbar updates to show logged-in state with role-appropriate links |

---

## Phase 1 — Admin Workflow (~12 min)

> **Login as:** `admin1@csc309.utoronto.ca` / `123123`

### 1.1 Manage Regular Users
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 20 | Navigate to admin user management | `GET /users?page=1&limit=10` | List of regular users with pagination (2+ pages) |
| 21 | Go to page 2 | `GET /users?page=2` | Pagination works |
| 22 | Use keyword filter (e.g. search by name) | `GET /users?keyword=...` | Filtered results |
| 23 | Filter by activated status | `GET /users?activated=true` | Filtered results |
| 24 | Filter by suspended status | `GET /users?suspended=false` | Filtered results |
| 25 | **Suspend** a user (e.g. regular5) | `PATCH /users/:userId/suspended` with `{suspended: true}` | User status updates to suspended |
| 26 | **Unsuspend** that user | `PATCH /users/:userId/suspended` with `{suspended: false}` | User status reverts |

### 1.2 Manage Businesses
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 27 | Navigate to admin business management | `GET /businesses` (admin view) | List shows admin-only fields: owner_name, verified, activated |
| 28 | Filter by `verified=false` | `GET /businesses?verified=false` | Only unverified businesses shown |
| 29 | Sort by business_name | `GET /businesses?sort=business_name&order=asc` | Sorted list |
| 30 | **Verify** a business | `PATCH /businesses/:businessId/verified` with `{verified: true}` | Status updates |
| 31 | **Unverify** a business | `PATCH /businesses/:businessId/verified` with `{verified: false}` | Status reverts |

### 1.3 Manage Position Types
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 32 | Navigate to position types | `GET /position-types` (admin) | List with hidden/num_qualified fields visible, sorted by num_qualified then name |
| 33 | **Create** a new position type | `POST /position-types` | New type appears (default hidden=true) |
| 34 | **Edit** a position type (change name or description) | `PATCH /position-types/:id` | Updated fields returned |
| 35 | **Unhide** a position type | `PATCH /position-types/:id` with `{hidden: false}` | Now visible to regular/business users |
| 36 | **Hide** a position type | `PATCH /position-types/:id` with `{hidden: true}` | Hidden again |
| 37 | **Delete** a position type with 0 qualified users | `DELETE /position-types/:id` → 204 | Removed from list |
| **Bad Path** | Delete a position type with qualified users | `DELETE /position-types/:id` → 409 | Conflict error shown |
| 38 | Filter by keyword, filter by hidden status | `GET /position-types?keyword=...&hidden=true` | Filtering works |
| 39 | Pagination on position types | `GET /position-types?page=2` | Page 2 loads |

### 1.4 Review Qualifications
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 40 | Navigate to qualification review | `GET /qualifications?page=1` | Only "submitted" and "revised" qualifications shown |
| 41 | Search qualifications by keyword | `GET /qualifications?keyword=...` | Filtered by user name/email |
| 42 | Click on a qualification | `GET /qualifications/:qualificationId` | Full detail: user info, document, note, position type |
| 43 | **Approve** a qualification | `PATCH /qualifications/:id` with `{status: "approved"}` | Status changes, updatedAt refreshes |
| 44 | **Reject** a qualification | `PATCH /qualifications/:id` with `{status: "rejected"}` | Status changes |
| **Bad Path** | Try to approve an already-approved qualification | `PATCH /qualifications/:id` → 403 | Cannot change from approved directly |
| 45 | Pagination on qualifications | `GET /qualifications?page=2` | Works |

### 1.5 System Configuration
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 46 | Navigate to system settings | — | Form showing current values for all 4 settings |
| 47 | Change **reset cooldown** | `PATCH /system/reset-cooldown` | Updated |
| 48 | Change **negotiation window** | `PATCH /system/negotiation-window` | Updated |
| 49 | Change **job start window** | `PATCH /system/job-start-window` | Updated |
| 50 | Change **availability timeout** | `PATCH /system/availability-timeout` | Updated |
| **Bad Path** | Set negotiation window to 0 or negative | → 400 | Validation error |
| **Bad Path** | Set availability timeout to negative | → 400 | Validation error |

---

## Phase 2 — Regular User Workflow (~15 min)

> **Login as:** `regular1@csc309.utoronto.ca` / `123123`

### 2.1 Profile Management
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 51 | View own profile | `GET /users/me` | All personal info: name, email, birthday, qualifications, avatar, resume, biography, availability status |
| 52 | Edit profile (change phone, postal address) | `PATCH /users/me` | Only changed fields returned |
| 53 | Upload/replace avatar | `PUT /users/me/avatar` (multipart) | Avatar updates on profile |
| 54 | Upload/replace resume | `PUT /users/me/resume` (multipart) | Resume path updates |
| **Bad Path** | Upload non-image file as avatar | → 400 | Invalid file type error |
| **Bad Path** | Upload non-PDF as resume | → 400 | Invalid file type error |

### 2.2 Position Types & Qualifications
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 55 | View visible position types | `GET /position-types` (regular) | Only non-hidden types shown, no hidden/num_qualified fields |
| 56 | **Create** a qualification request | `POST /qualifications` | New qualification with status "created" |
| 57 | Add a note to the qualification | `PATCH /qualifications/:id` with `{note: "..."}` | Note updated |
| 58 | Upload qualification document | `PUT /qualifications/:id/document` (multipart) | Document path set |
| 59 | **Submit** the qualification (change status created → submitted) | `PATCH /qualifications/:id` with `{status: "submitted"}` | Status changes to "submitted" |
| 60 | View qualification detail | `GET /qualifications/:id` | Full detail with status, note, document |
| **Bad Path** | Try to create qualification for hidden position type | → likely 400 or no option available | Position type not visible |
| **Bad Path** | Try to submit without meeting prerequisites | → 403 or appropriate error | Clear feedback |

### 2.3 Revise a Rejected Qualification
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 61 | Find a rejected qualification (use seeded data) | `GET /qualifications/:id` | Status shows "rejected" |
| 62 | Update note and resubmit (status → "revised") | `PATCH /qualifications/:id` with `{status: "revised", note: "..."}` | Status changes to "revised" |

### 2.4 Set Availability
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 63 | Set availability to **available** | `PATCH /users/me/available` with `{available: true}` | Status changes |
| **Bad Path** | Try setting available while suspended | → 400 | Error: account is suspended |
| **Bad Path** | Try setting available with no approved qualifications | → 400 | Error: no qualifications |
| 64 | Set availability to **unavailable** | `PATCH /users/me/available` with `{available: false}` | Status changes |

### 2.5 Browse Jobs
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 65 | Navigate to job listings | `GET /jobs?page=1&limit=10` | Paginated list of open jobs user qualifies for |
| 66 | Page 2 | `GET /jobs?page=2` | Pagination works |
| 67 | **Sort** by salary_min descending | `GET /jobs?sort=salary_min&order=desc` | Highest salary first |
| 68 | **Sort** by start_time | `GET /jobs?sort=start_time&order=asc` | Earliest start first |
| 69 | **Filter** by position type | `GET /jobs?position_type_id=...` | Filtered list |
| 70 | **Filter** by business | `GET /jobs?business_id=...` | Filtered list |
| 71 | Provide lat/lon to see distance & ETA | `GET /jobs?lat=...&lon=...` | Distance (km) and ETA (min) columns appear |
| 72 | **Sort** by distance | `GET /jobs?sort=distance&lat=...&lon=...` | Closest first |
| **Bad Path** | Sort by distance without lat/lon | → 400 | Error message |

### 2.6 Job Detail & Express Interest
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 73 | Click on a job to see detail | `GET /jobs/:jobId` | Full detail: position type, business, salary range, times, note, status |
| 74 | **Express interest** | `PATCH /jobs/:jobId/interested` with `{interested: true}` | Interest recorded, inactivity timer reset |
| 75 | **Withdraw interest** | `PATCH /jobs/:jobId/interested` with `{interested: false}` | Interest removed |
| **Bad Path** | Withdraw interest when none exists | → 400 | Nothing to withdraw |
| **Bad Path** | Express interest in a filled/expired job | → 409 | Job not available |
| **Bad Path** | Express interest in a job you're not qualified for | → 403 | Forbidden |

### 2.7 View Invitations
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 76 | Navigate to invitations | `GET /users/me/invitations?page=1` | List of jobs where businesses invited this user |
| 77 | Pagination | `GET /users/me/invitations?page=2` | Works |

### 2.8 View Interests (My Interested Jobs)
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 78 | Navigate to "My Interests" | `GET /users/me/interests?page=1` | List of jobs with mutual interest indicator |
| 79 | Identify a **mutual interest** entry | — | `mutual: true` clearly shown |
| 80 | Identify a **non-mutual** entry | — | `mutual: false` clearly shown |

### 2.9 View Commitments / Past Jobs
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 81 | Navigate to commitments/work history | Various `GET /jobs/:jobId` calls | Current filled jobs and past completed/cancelled jobs shown with clear status indicators |

---

## Phase 3 — Business User Workflow (~12 min)

> **Login as:** `business1@csc309.utoronto.ca` / `123123` (must be verified)

### 3.1 Business Profile
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 82 | View own business profile | `GET /businesses/me` | Full profile with location, avatar, biography, verified status |
| 83 | Edit profile (change biography, location) | `PATCH /businesses/me` | Updated fields returned |
| 84 | Upload/replace business avatar | `PUT /businesses/me/avatar` (multipart) | Avatar updates |

### 3.2 Create a Job Posting
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 85 | Navigate to "Create Job" | — | Form with position type, salary range, start/end time, note |
| 86 | Submit with valid data | `POST /businesses/me/jobs` → 201 | Job created with status "open" |
| **Bad Path** | Start time too far in the future (beyond job_start_window) | → 400 | Error shown |
| **Bad Path** | End time before start time | → 400 | Error shown |
| **Bad Path** | Start time in the past | → 400 | Error shown |
| **Bad Path** | Not enough time for negotiation before start | → 400 | Posting would be immediately expired |
| **Bad Path** | Try creating a job while **unverified** | → 403 | Forbidden |

### 3.3 View & Manage Jobs
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 87 | View all my jobs | `GET /businesses/me/jobs?page=1` | Paginated list with status, worker, position type |
| 88 | Pagination | `GET /businesses/me/jobs?page=2` | Works |
| 89 | **Filter** by status (open, filled, expired, etc.) | `GET /businesses/me/jobs?status=open` | Filtered |
| 90 | **Filter** by position type | `GET /businesses/me/jobs?position_type_id=...` | Filtered |
| 91 | **Filter** by salary/time range | `GET /businesses/me/jobs?salary_min=...&start_time=...` | Filtered |
| 92 | Click on a job to see detail | `GET /jobs/:jobId` (business) | Full detail |
| 93 | **Edit** an open job (change salary) | `PATCH /businesses/me/jobs/:jobId` | Updated fields + updatedAt |
| **Bad Path** | Edit a filled job | → 409 | Conflict: already filled |
| 94 | **Delete** an open or expired job | `DELETE /businesses/me/jobs/:jobId` → 204 | Removed from list |
| **Bad Path** | Delete a filled job | → 409 | Conflict |
| **Bad Path** | Delete a job with active negotiation | → 409 | Conflict |

### 3.4 Discover Candidates
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 95 | Select an open job → view candidates | `GET /jobs/:jobId/candidates?page=1` | List of discoverable qualified users with invited status |
| 96 | Pagination | `GET /jobs/:jobId/candidates?page=2` | Works |
| 97 | Click on a candidate for detail | `GET /jobs/:jobId/candidates/:userId` | Qualification info, document, resume, biography, avatar |

### 3.5 Invite / Express Interest in Candidates
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 98 | **Invite** a candidate | `PATCH /jobs/:jobId/candidates/:userId/interested` with `{interested: true}` | Interest created, shows on candidate list |
| 99 | **Withdraw** invitation | `PATCH /jobs/:jobId/candidates/:userId/interested` with `{interested: false}` | Invitation removed |
| **Bad Path** | Invite for a non-open job | → 409 | Conflict |
| **Bad Path** | Withdraw when never invited | → 400 | Nothing to withdraw |

### 3.6 View Interested Users for a Job
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 100 | View interested users | `GET /jobs/:jobId/interests?page=1` | List with mutual interest indicators |
| 101 | Identify mutual interest entries | — | `mutual: true` highlighted |

### 3.7 No-Show Reporting
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 102 | Find a filled job currently in its work window | `GET /jobs/:jobId` with status "filled" | Job detail showing it's within start_time–end_time |
| 103 | **Report no-show** | `PATCH /jobs/:jobId/no-show` | Job → "canceled", worker → suspended |
| **Bad Path** | Report no-show before job starts | → 409 | Conflict: job hasn't started |
| **Bad Path** | Report no-show after job ends | → 409 | Conflict: job already over |
| **Bad Path** | Report no-show on unfilled job | → 409 | Conflict |

---

## Phase 4 — Negotiation (Full Round-Trip) (~10 min)

> **This is the most critical workflow.** Use two browser windows side by side.
> Set negotiation window to something manageable (e.g. 5–10 minutes) via admin first.

### 4.1 Setup — Create Mutual Interest
| # | Action | Endpoint Hit | Who |
|---|--------|-------------|-----|
| 104 | As **business**: create or pick an open job | `POST /businesses/me/jobs` or existing | Business |
| 105 | As **business**: invite a specific regular user | `PATCH /jobs/:jobId/candidates/:userId/interested` | Business |
| 106 | As **regular user**: express interest in same job | `PATCH /jobs/:jobId/interested` with `{interested: true}` | Regular |
| 107 | Verify mutual interest is shown on both sides | `GET /users/me/interests` and `GET /jobs/:jobId/interests` | Both |

### 4.2 Start Negotiation
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 108 | Either party initiates negotiation | `POST /negotiations` with `{interest_id: ...}` → 201 | Negotiation created with status "active", expiresAt visible |
| 109 | Both parties see notification | Socket.IO `negotiation:started` event | Real-time notification |
| 110 | **Countdown timer** visible | — | Timer counting down to expiresAt |

### 4.3 Negotiation Chat (Socket.IO)
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 111 | Regular user sends a message | Socket `negotiation:message` | Message appears for both parties in real-time |
| 112 | Business sends a reply | Socket `negotiation:message` | Both see it, sender role identified |

### 4.4 Decision Making
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 113 | Regular user **accepts** | `PATCH /negotiations/me/decision` with `{decision: "accept", negotiation_id: ...}` | candidate decision = "accept" |
| 114 | Show that one accept is not enough | `GET /negotiations/me` | Status still "active", business decision still null |
| 115 | Business **accepts** | `PATCH /negotiations/me/decision` with `{decision: "accept", negotiation_id: ...}` | Both accepted → negotiation "success", job "filled" |
| 116 | Verify job is now filled | `GET /jobs/:jobId` | Status = "filled", worker assigned |

### 4.5 Failed Negotiation (Decline Path)
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 117 | Set up another mutual interest pair | (repeat steps 104–107) | — |
| 118 | Start negotiation | `POST /negotiations` | Active |
| 119 | One party **declines** | `PATCH /negotiations/me/decision` with `{decision: "decline"}` | Negotiation → "failed" immediately |
| 120 | Regular user auto-returned to available | `GET /users/me` | available = true |
| 121 | Interests reset/nulled for both parties | — | Both parties' interests cleared |

### 4.6 Negotiation Bad Paths
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| **Bad Path** | Try to start negotiation without mutual interest | `POST /negotiations` → 403 | Not mutual |
| **Bad Path** | Try to start negotiation while already in one | `POST /negotiations` → 409 | Already negotiating |
| **Bad Path** | Decision with wrong negotiation_id | `PATCH /negotiations/me/decision` → 409 | Mismatch |
| **Bad Path** | Decision after expiry | → 409 | Negotiation expired |
| **Bad Path** | Try initiating other negotiations while one is active | → 409 | Exclusive lock |

### 4.7 Job Edit During Negotiation (Optional but impressive)
| # | Action | Endpoint Hit | What to Show |
|---|--------|-------------|--------------|
| 122 | Business edits salary during active negotiation | `PATCH /businesses/me/jobs/:jobId` | Both decisions reset to null |
| 123 | Both parties must re-accept | `GET /negotiations/me` | decisions both null again |

---

## Phase 5 — Cross-Cutting Concerns & Edge Cases (~3 min)

### 5.1 State Visibility
| What | How to Demonstrate |
|------|--------------------|
| Job statuses clearly shown | Show jobs in open / filled / expired / canceled / completed states on business job list |
| Negotiation state surfaced | Active negotiation banner/indicator visible from anywhere in the app |
| Deadlines/timers visible | Countdown timer on negotiation, time-sensitive labels on jobs |
| Unavailable actions explained | Grayed-out buttons with tooltips or messages explaining *why* (e.g., "Cannot negotiate — already in negotiation") |

### 5.2 Role-Based Access Control
| What | How to Demonstrate |
|------|--------------------|
| Navbar changes per role | Show different nav items for Regular vs Business vs Admin vs Unauthenticated |
| Route protection | Try accessing `/admin/...` while logged in as Regular → redirect or 403 |
| API-level protection | Business can't see admin-only fields, regular user can't access admin endpoints |

### 5.3 Pagination Everywhere
Confirm pagination works on **every** list:
- Admin: users list, businesses list, position types, qualifications
- Regular: jobs list, invitations, interests
- Business: my jobs, candidates, interested users
- Public: businesses list

### 5.4 Loading & Empty States
| What | How to Demonstrate |
|------|--------------------|
| Loading indicators | Briefly visible when fetching data |
| Empty states | Filter to produce 0 results → helpful "No results found" message |

---

## Endpoint Coverage Checklist

Use this to verify you've touched every endpoint during the demo:

| Endpoint | Method | Covered In |
|----------|--------|------------|
| `/users` | POST | Phase 0.3 (#10) |
| `/users` | GET | Phase 1.1 (#20) |
| `/users/:userId/suspended` | PATCH | Phase 1.1 (#25–26) |
| `/users/me` | GET | Phase 2.1 (#51) |
| `/users/me` | PATCH | Phase 2.1 (#52) |
| `/users/me/avatar` | PUT | Phase 2.1 (#53) |
| `/users/me/resume` | PUT | Phase 2.1 (#54) |
| `/users/me/available` | PATCH | Phase 2.4 (#63–64) |
| `/users/me/invitations` | GET | Phase 2.7 (#76) |
| `/users/me/interests` | GET | Phase 2.8 (#78) |
| `/businesses` | POST | Phase 0.4 (#12) |
| `/businesses` | GET | Phase 0.2 (#3) + Phase 1.2 (#27) |
| `/businesses/:businessId` | GET | Phase 0.2 (#5) |
| `/businesses/:businessId/verified` | PATCH | Phase 1.2 (#30–31) |
| `/businesses/me` | GET | Phase 3.1 (#82) |
| `/businesses/me` | PATCH | Phase 3.1 (#83) |
| `/businesses/me/avatar` | PUT | Phase 3.1 (#84) |
| `/businesses/me/jobs` | POST | Phase 3.2 (#86) |
| `/businesses/me/jobs` | GET | Phase 3.3 (#87) |
| `/businesses/me/jobs/:jobId` | PATCH | Phase 3.3 (#93) |
| `/businesses/me/jobs/:jobId` | DELETE | Phase 3.3 (#94) |
| `/auth/resets` | POST | Phase 0.5 (#15) |
| `/auth/resets/:resetToken` | POST | Phase 0.5 (#14, #17) |
| `/auth/tokens` | POST | Phase 0.6 (#19) |
| `/position-types` | POST | Phase 1.3 (#33) |
| `/position-types` | GET | Phase 1.3 (#32) + Phase 2.2 (#55) |
| `/position-types/:id` | PATCH | Phase 1.3 (#34–36) |
| `/position-types/:id` | DELETE | Phase 1.3 (#37) |
| `/qualifications` | GET | Phase 1.4 (#40) |
| `/qualifications` | POST | Phase 2.2 (#56) |
| `/qualifications/:id` | GET | Phase 1.4 (#42) + Phase 2.2 (#60) |
| `/qualifications/:id` | PATCH | Phase 1.4 (#43–44) + Phase 2.2 (#57, #59) + Phase 2.3 (#62) |
| `/qualifications/:id/document` | PUT | Phase 2.2 (#58) |
| `/jobs` | GET | Phase 2.5 (#65) |
| `/jobs/:jobId` | GET | Phase 2.6 (#73) + Phase 3.3 (#92) |
| `/jobs/:jobId/interested` | PATCH | Phase 2.6 (#74–75) |
| `/jobs/:jobId/no-show` | PATCH | Phase 3.7 (#103) |
| `/jobs/:jobId/candidates` | GET | Phase 3.4 (#95) |
| `/jobs/:jobId/candidates/:userId` | GET | Phase 3.4 (#97) |
| `/jobs/:jobId/candidates/:userId/interested` | PATCH | Phase 3.5 (#98–99) |
| `/jobs/:jobId/interests` | GET | Phase 3.6 (#100) |
| `/negotiations` | POST | Phase 4.2 (#108) |
| `/negotiations/me` | GET | Phase 4.4 (#114) |
| `/negotiations/me/decision` | PATCH | Phase 4.4 (#113, #115) + Phase 4.5 (#119) |
| `/system/reset-cooldown` | PATCH | Phase 1.5 (#47) |
| `/system/negotiation-window` | PATCH | Phase 1.5 (#48) |
| `/system/job-start-window` | PATCH | Phase 1.5 (#49) |
| `/system/availability-timeout` | PATCH | Phase 1.5 (#50) |
| **Socket.IO** `negotiation:started` | — | Phase 4.2 (#109) |
| **Socket.IO** `negotiation:message` | — | Phase 4.3 (#111–112) |

---

## Suggested Time Budget

| Phase | Content | Time |
|-------|---------|------|
| 0 | Public pages, Registration, Activation, Login | ~8 min |
| 1 | Admin: users, businesses, position types, qualifications, system config | ~12 min |
| 2 | Regular User: profile, qualifications, availability, jobs, interests | ~15 min |
| 3 | Business: profile, job CRUD, candidates, invitations, no-show | ~12 min |
| 4 | Negotiation full round-trip + bad paths | ~10 min |
| 5 | Cross-cutting: state visibility, RBAC, pagination, edge cases | ~3 min |
| **Total** | | **~60 min** |

---

## Pre-Demo Checklist

- [ ] Reseed the database fresh
- [ ] Confirm the deployed URL is live and responsive
- [ ] Have 3 browser profiles/windows ready (Admin, Business, Regular)
- [ ] Set negotiation window to ~5 min (via admin) so you can demo the full cycle
- [ ] Know which seeded users have mutual interests set up for negotiation demo
- [ ] Know which seeded jobs are in each status (open, filled, expired, canceled, completed)
- [ ] Have a sample image (PNG/JPEG) and PDF ready for upload demos
- [ ] Practice the negotiation demo once — it's the trickiest part to time right