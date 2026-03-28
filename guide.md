Theme
    - Innovating a Greener Urban Future: Encouraging Sustainable Living in Cities! 


# Bayanihan — Community-Driven Urban Sustainability Platform

**Date:** 2026-03-28
**Team:** Smart Dito sa Globe (SDG)
**Event:** Blue Hacks 2026 (2-day onsite hackathon)
**Theme:** Innovating for a Greener Urban Future: Encouraging Sustainable Living in Cities
**SDGs:** 7 (Affordable and Clean Energy), 11 (Sustainable Cities and Communities), 12 (Responsible Consumption and Production)

---

## Problem Statement

Filipino urban residents witness environmental and infrastructure problems daily — illegal dumping, burning trash, broken streetlights wasting electricity, flooded roads. Citizens care about what's happening in their surroundings, but the existing channels for reporting require directly confronting local government officials who often respond badly to criticism. Residents are either overwhelmed with fear of retaliation or deterred by official reporting processes that feel bureaucratic and slow. The result: problems go unreported, LGUs lack real-time ground-truth data to prioritize interventions, resources are misallocated, and citizens lose trust in local governance.

Bayanihan removes the friction and the fear. A structured, transparent platform where reports are data — not confrontations — and where resolution is tracked publicly, holding both citizens and LGUs accountable.

## Solution

A mobile-first citizen reporting platform where residents report urban sustainability issues, and LGUs receive an AI-assisted dashboard to prioritize and resolve them. A transparency loop (red/yellow/green states with citizen verification) ensures accountability on both sides.

**One-liner pitch:** _"Citizens are the city's eyes. Every problem reported is a step toward a greener, smarter community."_

---

## SDG Alignment

| SDG | How Bayanihan Addresses It |
|-----|---------------------------|
| **SDG 7 — Affordable and Clean Energy** | Citizens report energy waste in public infrastructure: broken streetlights still consuming electricity, malfunctioning traffic lights drawing power, unreported power outages. Every report is an energy audit the city didn't have to pay for. |
| **SDG 11 — Sustainable Cities and Communities** | The core of the app. Citizen-driven environmental monitoring, LGU accountability, data-enriched hazard awareness (flood zones, fire risk), and transparent resolution tracking all contribute to more sustainable, resilient urban communities. |
| **SDG 12 — Responsible Consumption and Production** | Waste-related reports (illegal dumping, unsegregated trash, kaingin) directly address irresponsible consumption byproducts. Visibility into waste patterns helps LGUs and citizens confront consumption-driven environmental damage. |

---

## Report Categories

### Waste & Pollution (SDG 12)
- **Illegal dumping** — unauthorized trash accumulation in public areas
- **Unsegregated waste** — bins/collection points not following RA 9003 segregation
- **Kaingin / illegal burning** — open burning of trash or vegetation
- **Water pollution** — visible contamination in rivers, creeks, drainage

### Energy & Infrastructure (SDG 7)
- **Broken streetlights** — non-functional or lights on during daytime (energy waste)
- **Malfunctioning traffic lights** — drawing power but not functioning correctly
- **Power outage** — unreported outages affecting an area
- **Damaged solar installations** — broken public solar panels or solar streetlights

### Urban Environment (SDG 11)
- **Potholes / road damage** — hazards affecting commuter safety
- **Flooding / drainage blockage** — standing water, clogged drainage systems
- **Fallen trees / debris** — post-storm hazards blocking roads or walkways
- **Unsafe structures** — visibly damaged public infrastructure (bridges, overpasses, railings)
- **Noise pollution** — persistent excessive noise from construction, businesses, etc.
- **Stray animal hazard** — packs of stray dogs or other animal-related risks in public spaces

---

## Architecture

### System Overview

```
Citizens REPORT --> Data AGGREGATES --> LGU DASHBOARD --> LGU ACTS --> Citizens VERIFY
    ^                                                                        |
    |_______________________________ feedback loop __________________________|
```

### Two Interfaces

1. **Citizen App** — mobile-first web application
2. **LGU Dashboard** — desktop-first analytics and management view

### Data Flow

1. Citizen submits report (photo + category + optional description)
2. Report is auto-geotagged and timestamped
3. Report stored in Supabase, appears as red pin on map
4. External data enrichment runs (NOAH flood zones, fire risk, population density)
5. LGU dashboard receives report with AI-generated priority score
6. LGU acts on report, marks as "resolved" (yellow)
7. Original reporter + nearby citizens get notified
8. Citizens verify resolution with photo evidence
9. Confirmed → green. Rejected → back to red with explanation.

---

## Feature Specification

### 1. Citizen App (Mobile-First Web)

#### Main Map View
- Default view: only **red** (active) problems visible
- Toggle to show **yellow** (pending verification) and **green** (resolved)
- Counter bar at top: `Active: 24 | Pending: 8 | Resolved: 142`
- Filter by category (multi-select)
- Tap a pin to see report details

#### Reporting Flow
1. Tap "Report" button
2. Select category from list
3. Take photo or upload from gallery (auto-compressed to <1MB)
4. Location auto-detected via GPS, with option to manually adjust pin
5. Optional text description
6. Submit → pin appears immediately as red

#### Report Detail View
- Photo, category, description, timestamp, reporter
- Current state indicator (red / yellow / green)
- **Comment thread**: citizens and LGU post text + photo updates
  - Shows resolution progress: "Volunteers on-site" → "Cleanup in progress" → "LGU marks resolved"
- Verification buttons (when state is yellow): "Confirm Resolved" / "Not Yet Resolved" with photo evidence required

#### Citizen Verification Flow
- When LGU marks an issue as resolved → state changes to **yellow**
- Original reporter receives notification
- Any authenticated citizen can verify (not limited to original reporter — they may be a passerby who never returns)
  - **Confirm** with photo → state changes to **green**
  - **Reject** with photo + explanation → state returns to **red**, LGU notified
- MVP: first verification resolves the state. Future: multi-vote consensus threshold.

### 2. LGU Dashboard (Desktop-First)

#### Overview Panel
- Summary stats: total active, pending verification, resolved, average response time
- Trend charts: reports over time, resolution rate over time
- Barangay-level breakdown (if multi-barangay)

#### Report Management Table
- Sortable, filterable table of all reports
- Columns: category, location, date reported, status, priority score, days open
- Bulk actions: assign, mark resolved, escalate

#### AI-Assisted Prioritization
- Each report gets an auto-generated priority score based on:
  - **Category severity** (e.g., flooding > pothole)
  - **External data overlay**: is the report location in a NOAH flood zone? Near a fire-prone area? In a densely populated zone?
  - **Report clustering**: multiple reports in the same area = higher priority
  - **Time open**: older unresolved reports get escalated
- AI can generate a recommended action order: "Address these 5 reports first"
- LGU can accept, modify, or override the AI recommendation

#### Transparency Metrics
- Average resolution time by category
- Resolution rate (% of reports resolved within 7/14/30 days)
- Active vs. resolved ratio trend
- These metrics are **publicly visible** to citizens — LGU accountability

### 3. Data Enrichment Layer

| Citizen Report | External Data Source | Enriched Insight |
|---|---|---|
| Trash dump | NOAH flood zone API | "Dump is in flood-risk area — contamination risk during monsoon" |
| Kaingin/burning | Dry season + wind data | "Fire spread risk elevated — priority response" |
| Broken streetlight | DOE energy data | "Area already has above-average energy consumption" |
| Flooding report | NOAH real-time data | "Corroborated by NOAH flood advisory — escalate" |
| Multiple reports in area | Population density data | "Dense residential zone — affects more people" |

---

## State Machine

```
REPORTED (Red)
    |
    v
LGU MARKS RESOLVED (Yellow)
    |
    +--> Citizen CONFIRMS --> RESOLVED (Green)
    |
    +--> Citizen REJECTS --> REPORTED (Red) [with rejection reason]
```

- **Red**: Active problem. Visible by default.
- **Yellow**: LGU claims resolved. Awaiting citizen verification. Notification sent.
- **Green**: Citizen-verified resolution. Hidden by default, toggleable.

---

## Tech Stack

### Existing (from Bayanihan Map codebase)
- **Frontend:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS, Framer Motion, React Icons
- **Mapping:** React Leaflet (react-leaflet, leaflet)
- **Backend / Database:** Supabase (PostgreSQL)
- **Utilities:** browser-image-compression

### New Additions
- **AI Priority Engine:** Claude API (or similar) for report prioritization and statistical analysis
- **External APIs:** Project NOAH flood data, fire risk data
- **Notifications:** Supabase Realtime or push notifications for state changes
- **Auth:** Supabase Auth (citizens + LGU roles)
- **Charts:** Recharts or Chart.js for LGU dashboard visualizations

---

## MVP Scope (2-Day Hackathon)

### Must Build (Demo on Stage)
- [ ] Citizen reporting flow: category select → photo → geotag → submit
- [ ] Map view with red/yellow/green pins
- [ ] Report detail view with comment thread
- [ ] LGU dashboard: report table + summary stats
- [ ] State machine: red → yellow → green with citizen verification
- [ ] Counter bar showing active/pending/resolved counts
- [ ] Category filtering on map
- [ ] At least one external data overlay (NOAH flood zones)

### Should Build (If Time Allows)
- [ ] AI-assisted priority scoring for LGU dashboard
- [ ] Transparency metrics (resolution time, resolution rate charts)
- [ ] Notifications on state changes
- [ ] Multiple barangay support with comparison

### Pitch Deck Only (Reference, Don't Build)
- [ ] Full AI statistical analysis
- [ ] DOE energy data integration
- [ ] Fire/landslide risk overlay
- [ ] Barangay leaderboard

---

## Pitch Strategy

### Opening Hook
_"Two days ago, the Philippines declared a national energy emergency. Broken streetlights are wasting electricity we can't afford. Illegal dumps are piling up in flood zones. And your LGU doesn't know about any of it — because nobody told them. Until now."_

### Core Message
Bayanihan turns every citizen into a sustainability sensor. Report what you see. Watch your LGU respond. Verify the fix yourself. For the first time, communities have transparency into whether their city is actually getting greener — or just talking about it.

### Demo Flow (Suggested)
1. Open citizen app → show map with existing reports
2. Live-report an issue on stage (snap photo, select category, submit)
3. Watch the red pin appear in real time
4. Switch to LGU dashboard → show the report with AI priority score
5. LGU marks it as resolved → show state change to yellow
6. Switch back to citizen app → verify resolution → green
7. Show the counter update: one more resolved, one fewer active
8. "That loop — report, respond, verify — that's Bayanihan."

### Judge-Specific Notes
- **Derique (Theme/Environment judge):** Emphasize citizen science, ground-truth data the city doesn't have, practical Filipino-context solution. Mention PlasticCount PH as inspiration. Don't over-tech.
- **General:** Problem-first framing. The energy crisis is the hook but the platform is evergreen — cities always have sustainability problems that go unreported.
