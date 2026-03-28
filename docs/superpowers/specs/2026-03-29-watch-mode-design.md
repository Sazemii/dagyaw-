# Watch Mode — Municipality Dashboard & Resolution System

**Date:** 2026-03-29
**Status:** Approved

## Overview

Watch Mode is a specialized dashboard for institutional users (government, NGOs, volunteers) that provides municipality-level analytics, a priority queue, and a structured pin resolution workflow with community voting. It introduces authentication, role-based access, a 3-day pending resolution window with upvote/downvote validation, community-initiated resolves, and a notification system.

## Technical Approach

Single-app with Supabase Auth. Watch Mode lives at `/dashboard` as a new Next.js page within the existing app. No separate codebase. The existing map page gains auth-gated features (reporting, community resolve, voting, notifications).

---

## 1. Data Model

### Modified: `pins` table

New columns:

| Column | Type | Description |
|---|---|---|
| `status` | text | Now supports 3 values: `active`, `pending_resolved`, `resolved` |
| `pending_resolved_at` | timestamptz, nullable | Timestamp when 3-day window started |
| `pending_resolved_by` | uuid, nullable, FK → auth.users | Institutional user who initiated resolve |
| `community_resolve_requested` | boolean, default false | Flag set by regular user |
| `community_resolve_by` | uuid, nullable, FK → auth.users | Regular user who requested community resolve |

### New: `user_profiles` table

| Column | Type | Description |
|---|---|---|
| `id` | uuid, PK, FK → auth.users | User ID |
| `display_name` | text | Display name |
| `role` | text | `regular`, `institutional`, `admin` |
| `role_status` | text | `active`, `pending_approval`, `rejected` |
| `municipality` | text, nullable | Municipality they watch (institutional) |
| `institution_name` | text, nullable | e.g. "Cebu City LGU" |
| `notification_municipality` | text, nullable | Municipality for notifications (regular users) |
| `notification_interests` | text[], nullable | Category IDs for filtered notifications |
| `created_at` | timestamptz | Auto-set on creation |

Auto-created via Supabase database trigger on `auth.users` insert, with `role: 'regular'`, `role_status: 'active'`.

### New: `votes` table

| Column | Type | Description |
|---|---|---|
| `id` | uuid, PK | Vote ID |
| `pin_id` | uuid, FK → pins | Which pin |
| `user_id` | uuid, FK → auth.users | Who voted |
| `vote` | text | `up` or `down` |
| `created_at` | timestamptz | When voted |

Constraint: `UNIQUE(pin_id, user_id)` — one vote per user per pin.

### New: `notifications` table

| Column | Type | Description |
|---|---|---|
| `id` | uuid, PK | Notification ID |
| `user_id` | uuid, FK → auth.users | Recipient |
| `type` | text | `pending_resolve`, `community_resolve`, `vote_result`, `new_report`, `role_update` |
| `pin_id` | uuid, nullable, FK → pins | Related pin |
| `title` | text | Notification title |
| `body` | text | Notification body |
| `read` | boolean, default false | Read state |
| `created_at` | timestamptz | When created |

### Row-Level Security (RLS)

- `pins`: public read, authenticated insert/update
- `user_profiles`: users read/update own row; admins read/update all
- `votes`: authenticated users insert (one per pin via unique constraint), read own
- `notifications`: users read/update own only

### Category Severity

Added to the in-code `categories.ts` definitions (not a DB column):

| Severity | Categories |
|---|---|
| 5 (critical) | Flooding/Drainage, Unsafe Structure |
| 4 (high) | Pothole/Road Damage, Illegal Dumping, Kaingin/Burning, Water Pollution |
| 3 (medium) | Broken Streetlight, Malfunctioning Traffic Light |
| 2 (low) | Fallen Tree/Debris, Stray Animal Hazard |
| 1 (minor) | Unsegregated Waste, Noise Pollution |

---

## 2. Pin Resolution Lifecycle

### State Machine

```
                    ┌──────────────────────────────────┐
                    │                                  │
                    ▼                                  │
┌──────────┐   institutional    ┌─────────────────┐   │  fails 70%
│  ACTIVE  │ ───── resolve ───→ │ PENDING_RESOLVED │ ──┘  (reverts)
│          │                    │    (3-day vote)  │
└──────────┘                    └─────────────────┘
     │                                  │
     │  regular user                    │  after 3 days:
     │  "community resolve"             │  70%+ upvotes OR no votes
     ▼                                  ▼
┌──────────────────┐            ┌──────────┐
│ COMMUNITY_RESOLVE│            │ RESOLVED │ ──→ hidden from map
│ (flag on active) │            │          │     (toggle to show)
└──────────────────┘            └──────────┘
     │
     │  institutional approves
     │  (triggers 3-day window)
     ▼
┌─────────────────┐
│ PENDING_RESOLVED│
│  (3-day vote)   │
└─────────────────┘
```

### Rules

- `community_resolve_requested` is a boolean flag on an `active` pin, not a separate status value.
- Only institutional users for that pin's municipality can: mark pending resolved, approve community resolves.
- All logged-in users (regular + institutional) can vote on pending resolved pins.
- Voting window: exactly 3 days from `pending_resolved_at`.
- Resolution check: Supabase Edge Function on hourly cron. Finds pins where `pending_resolved_at + 3 days < now()`:
  - If 70%+ upvotes (or zero votes): set `status = 'resolved'`, set `resolved_at`.
  - If < 70% upvotes: set `status = 'active'`, clear `pending_resolved_at`, `pending_resolved_by`, `community_resolve_requested`, `community_resolve_by`.
- Resolved pins are hidden from the map by default. A toggle shows them.

---

## 3. Authentication & Roles

### Auth Flow

- Supabase Auth with email/password.
- On signup, database trigger creates `user_profiles` row with `role: 'regular'`, `role_status: 'active'`.
- Regular users can use the app immediately after signup.

### Role Request Flow

1. Logged-in user navigates to "Request Watch Mode Access" page.
2. Fills in: municipality, institution name, role type (government / NGO / volunteer).
3. Sets `role_status: 'pending_approval'`, `role: 'institutional'` on their profile.
4. Cannot access `/dashboard` until approved.
5. Admin approves via `/admin` page (lists pending requests, approve/reject buttons).
6. On approval: `role_status: 'active'` — user can now access Watch Mode.

### Access Control

| Feature | Anonymous | Regular (logged in) | Institutional (approved) | Admin |
|---|---|---|---|---|
| View map + pins | Yes | Yes | Yes | Yes |
| Toggle resolved pins on map | Yes | Yes | Yes | Yes |
| Report new pin | No | Yes | Yes | Yes |
| Community resolve request | No | Yes | Yes | Yes |
| Vote on pending pins | No | Yes | Yes | Yes |
| Mark pending resolved | No | No | Yes | Yes |
| Access Watch Mode dashboard | No | No | Yes | Yes |
| Approve community resolves | No | No | Yes | Yes |
| Approve role requests | No | No | No | Yes |
| Receive notifications | No | Yes | Yes | Yes |

### Login UI

- User icon button in top bar (next to search + theme toggle).
- Opens login/signup modal (bottom sheet on mobile, centered modal on desktop).
- Email + password, sign up / sign in toggle.
- Once logged in: icon shows user initial/avatar.
- Institutional users see an additional shield/dashboard icon linking to `/dashboard`.

---

## 4. Watch Mode Dashboard

### Layout

Full-screen page at `/dashboard`, replacing the map view. "Back to Map" button returns to `/`.

### Navigation

Top bar: Dagyaw logo, "WATCH MODE" badge, notification bell (with unread count), user avatar, "Back to Map" button.

Municipality header: city name + province, tab bar.

### Tabs

**Overview:**
- Stat cards: Active (red), Pending (yellow), Resolved (green), Community Requests (blue). Each shows count + contextual subtitle.
- Reports over time: stacked bar chart (active vs resolved) by day, last 7 days.
- Category breakdown: horizontal bars with category colors, counts, and labels.
- Priority queue (right column): pins sorted by category severity (highest first), then by age (oldest first). Each card shows category, location, severity badge, age.
- Closest to resolve (right column): pending resolved pins sorted by upvote percentage descending. Each shows vote progress bar (red → yellow → green gradient), vote tally, time remaining.

**Pending Review:**
- List of all `pending_resolved` pins. Each card shows: photo, description, category, vote tally (upvotes/downvotes), time remaining, and vote buttons (upvote/downvote) for the institutional user.

**Archive:**
- Searchable, filterable table of all resolved pins. Filters: category, date range, barangay/location. Each row shows: category, description, reported date, resolved date, resolution proof photo + comment.

**Community Requests:**
- List of active pins with `community_resolve_requested = true`. Each shows: pin details, who requested, when. Approve button triggers the 3-day pending window. Reject button clears the flag.

---

## 5. Map UI Changes

### Pin Visual States

| State | Fill | Outline | Effect |
|---|---|---|---|
| Active | Category color, full opacity | Category color | None (as today) |
| Pending resolved | Category color, ~60% opacity | Category color, ~60% opacity | Slow pulse animation |
| Resolved | Category color, ~40% opacity | Green (#22c55e), 2px | None, hidden by default |

Category colors are preserved across all states for accessibility — users can always identify the issue type at a glance.

### New Map UI Elements

- **User icon button** — top bar, next to search + theme toggle. Opens login/signup modal or profile menu.
- **"Show Resolved" toggle** — filter button near map controls (bottom-right). Toggles resolved pins on/off with fade animation. Off by default.
- **Watch Mode entry** — shield/dashboard icon in top bar for institutional users. Links to `/dashboard`.
- **Vote UI on PinDetailModal** — when viewing a pending resolved pin, logged-in users see upvote/downvote buttons, current tally, and time remaining.
- **"Community Resolve" button** — on PinDetailModal for active pins, visible to logged-in regular users. Replaces the current "Mark as Resolved" button (which becomes institutional-only).
- **Login gate on Report** — anonymous users tapping Report get prompted to log in first.

---

## 6. Notifications

### In-App

- Bell icon in top bar (visible when logged in), red badge with unread count.
- Dropdown (desktop) / bottom sheet (mobile) listing notifications newest-first.
- Each notification: icon, title, body, time ago, read/unread indicator.
- Clicking a notification marks it read and navigates to the relevant pin or dashboard tab.

### Browser Push

- Web Push API. Prompt on first login.
- Push payload mirrors in-app notification: title, body, pin ID for deep linking.
- Users can disable push in profile settings.

### Notification Settings (in user profile)

- Municipality to watch (search/dropdown).
- Interests (multi-select from categories) — only notified for selected categories.
- Push notifications on/off toggle.

### Trigger Matrix

| Event | Recipients | Channel |
|---|---|---|
| New report in municipality + matching interest | Regular users with matching municipality + category | In-app + push |
| Pin marked pending resolved | Regular users in that municipality | In-app + push |
| Community resolve requested | Institutional users for that municipality | In-app + push |
| Community resolve approved | The regular user who requested it | In-app + push |
| Community resolve rejected | The regular user who requested it | In-app + push |
| Vote window ends — resolved | All voters + original reporter (if logged in) | In-app + push |
| Vote window ends — reverted | Institutional user who initiated + all voters | In-app + push |
| Role request approved/rejected | The requesting user | In-app + push |

### Implementation

Supabase Edge Functions triggered by database webhooks (on insert/update to `pins`, `votes`, `user_profiles`). The edge function checks notification preferences, creates `notifications` rows, and sends push via Web Push API.

---

## 7. New Pages & Components Summary

### New Pages
- `/dashboard` — Watch Mode dashboard (protected: institutional + admin)
- `/admin` — Role request approval (protected: admin only)

### New Components
- `AuthModal` — login/signup bottom sheet / modal
- `WatchModeDashboard` — full dashboard with tabs (Overview, Pending Review, Archive, Community Requests)
- `NotificationBell` — bell icon + dropdown/bottom sheet
- `VoteButtons` — upvote/downvote UI for PinDetailModal
- `ResolvedToggle` — map filter button for showing/hiding resolved pins
- `ProfileMenu` — user menu with settings, role request, logout

### Modified Components
- `page.tsx` — auth state, login gate on report, new top bar buttons
- `MapView.tsx` — new pin visual states (pending pulse, resolved green outline)
- `PinDetailModal.tsx` — vote UI, community resolve button, role-aware resolve button
- `categories.ts` — add `severity` field to each category
- `pins.ts` — new functions for voting, community resolve, pending resolve, notification queries

### New Supabase Infrastructure
- Auth enabled
- Database trigger: auto-create `user_profiles` on signup
- Edge Function: hourly cron for resolution check (3-day window expiry)
- Edge Function: webhook-triggered notification dispatcher
- New `push_subscriptions` table (user_id, endpoint, keys, created_at) — separate table since users may have multiple devices
