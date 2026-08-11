# Cards Component

> **Document Owner:** Design & Front-End Team
> **Last Updated:** 2026-07-16
> **Status:** Active — Source of Truth

---

## 1. Purpose

Cards are the fundamental grid containers for South Rally. They organize complex member booking statistics, court status schedules, transactions, and live queue timelines into structured blocks. They float above the cool slate environment background with subtle elevations.

---

## 2. Base Card Anatomy

```
┌──────────────────────────────────────────────────┐  ← --radius-xl (16px)
│  Card Header                                     │
│  ┌─ Title (H3/H4)        ──────── [Action/Badge] ┐│
│  └───────────────────────────────────────────────┘│
│  ──────────────────────── (optional divider)      │
│                                                  │
│  Card Body                                       │
│  Content lives here                              │
│                                                  │
│  Card Footer (optional)                          │
│  ─────────────────────────────────────────────── │
│  [Secondary link]                   [Action btn] │
└──────────────────────────────────────────────────┘
     ↑ Padding: --spacing-card-inner (24px) all sides
     ↑ Background: --color-card (#FFFFFF)
     ↑ Border: 1px solid --color-border (#E2E8F0)
     ↑ Shadow: --shadow-sm
```

---

## 3. Card Variants

### Default Content Card
Used for general sections (e.g., "Join an Event" highlights, "How to Join Open Play" rule cards, account setting sections).

```
Background:   --color-card (#FFFFFF)
Border:       1px solid --color-border (#E2E8F0)
Radius:       16px (--radius-xl)
Shadow:       --shadow-sm
Padding:      24px (--spacing-card-inner)

Interactive Hover State:
  Shadow:     --shadow-hover
  Transform:  translateY(-1px)
  Transition: --duration-fast (150ms), --ease-out
```

---

### Dashboard Metric / KPI Card
Compact, high-readability cards displaying member metrics across the top of the dashboard.

```
┌──────────────────────────────┐
│  Icon (secondary subtle)     │
│  Label (xs, Slate 600)       │
│  Value (h2, Bold, Navy)      │
│  Status indicator (xs)       │
└──────────────────────────────┘

Padding:      20px 24px
Height:       100px (--height-stat-card)
Radius:       16px
Shadow:       --shadow-sm
```

**KPI Anatomy Details:**
*   **Balance Metric:**
    *   Label: `Credits Balance` (Slate 600)
    *   Value: `₱2,450` (Navy, tabular monospaced digits)
    *   Footer: `12 sessions remaining` (Volt Green accent text if active)
*   **Bookings Metric:**
    *   Label: `Court Bookings` (Slate 600)
    *   Value: `3`
    *   Footer: `Next: Today, 6:00 PM` (Slate 600)
*   **Play Time Metric:**
    *   Label: `Play Hours`
    *   Value: `14.5 hrs`
    *   Footer: `+2.4 hrs this week` (Emerald green success color)

---

### Court Playing Card (Stacking Board)
A specific card representing court status on the real-time Paddle Stack page.

```
┌─────────────────────────────────┐
│ Court 3                 [14:32] │  ← Court Header (Forest Teal / Navy bg)
│ ─────────────────────────────── │
│ ❶ 🟢 Reagan Patricio            │  ← Player Row 1 (Skill indicator dot)
│ ❷ 🟡 Lheamae Patricio           │  ← Player Row 2
│ ❸ 🟢 Sheila Mae Rollon          │  ← Player Row 3
│ ❹ 🔵 Kriza Pearl Rollon         │  ← Player Row 4
└─────────────────────────────────┘

Width:        100% in a flex-grid layout
Background:   --color-card (#FFFFFF)
Border:       1px solid --color-border
Header BG:    --color-primary (#091E3A) if active play; --color-secondary (#1E4D4D) if warmup
Timer:        Monospaced JetBrains Mono in brackets
Player Rows:  32px height, align-center flex, border-bottom separator
```

---

## 4. Design Guidelines

### Do
*   ✅ Ensure cards always utilize `--spacing-card-inner` (24px) for inner margins.
*   ✅ Align stat card labels and titles to the left.
*   ✅ Provide interactive cursor changes and transitions on click-through cards.
*   ✅ Implement loading skeleton structures that match card contours.

### Don't
*   ❌ Do not nest cards inside other cards.
*   ❌ Do not use primary brand fills for card backdrops (keep backgrounds white `#FFFFFF`).
*   ❌ Do not hardcode custom sizes or colors on border outlines.
