# UI Design System — Overview

> **Document Owner:** Design & Front-End Team
> **Last Updated:** 2026-07-16
> **Status:** Active — Source of Truth
> **Version:** 2.0.0

---

## 1. Design Philosophy

South Rally's design language is modeled after Avenor's **token-driven structure and layout principles**, but shifts the visual tone to a **premium, dynamic, and clean athletic style**.

While Avenor is warm, organic, and terracotta-focused to reduce job search anxiety, South Rally represents an **active, sporty, and social sports club**. The UI is built to feel energetic, high-performance, and incredibly sharp, using a high-contrast premium palette.

---

## 2. Five Design Principles

### 1. Dynamic & Energizing
The interface should inspire action. The vibrant energy of **Volt Lime** accents represents a pickleball bouncing on the court. It is a tool for scheduling, playing, and scoring. It feels alive.

### 2. High Information Density with Clean Structure
Managing 14 courts, booking grids, and 3 distinct queue lists is complex. The UI must avoid clutter by using strict typography hierarchies, thin slate borders, and distinct card panels. Content is grouped logically so staff and players can parse booking times or player lists at a glance.

### 3. Frictionless & Mobile-First
Most players interact with the app on their phone at the court lobby. The QR code check-in, Open Play joins, and credit top-ups are built as large, tap-friendly targets with clear confirmation states.

### 4. Whispering Environments (Recessive UI)
The navigation bars, structural dividers, and environmental backgrounds are muted and cool, dropping into the background. The active court bookings, stack cards, and transaction records stand out as the primary visual focus.

### 5. Strict Token Consistency
Every spacing multiplier, hover background, card corner, and font size must reference a design token. Hand-coded values are forbidden.

---

## 3. Visual System Index

The system details are divided into the following files:

*   [docs/ui/colors.md](file:///home/eisen/projects/random-proj/south-rally/docs/ui/colors.md) — Exact colors, semantic mappings, and accessibility checks.
*   [docs/ui/design-tokens.md](file:///home/eisen/projects/random-proj/south-rally/docs/ui/design-tokens.md) — Master registers (spacings, shadows, corners, fonts).
*   [docs/ui/components/sidebar.md](file:///home/eisen/projects/random-proj/south-rally/docs/ui/components/sidebar.md) — App navigation.
*   [docs/ui/components/cards.md](file:///home/eisen/projects/random-proj/south-rally/docs/ui/components/cards.md) — Metrics and item components.
*   [docs/ui/components/paddle-stack.md](file:///home/eisen/projects/random-proj/south-rally/docs/ui/components/paddle-stack.md) — Queue dashboard interface.
*   [docs/ui/components/bookings-calendar.md](file:///home/eisen/projects/random-proj/south-rally/docs/ui/components/bookings-calendar.md) — Reservation grid schedule interface.

---

## 4. Key Interface Archetypes (From Templates)

South Rally remodels three core interface environments:

1.  **The Public Landing Page:** Clean white background, thick navy titles, dynamic hero action sections, and bright green/lime accents featuring court activities.
2.  **The Member Dashboard:** Left sidebar navigation (`220px`), top greeting card (`Court Navy` header containing quick buttons to "Join Open Play", "Book a Court", "My QR"), and a dashboard grid displaying active queues, transaction balance, and recent activities.
3.  **The Live Paddle Stack Dashboard:** A full-screen, highly readable board split by courts (timings, active rosters) and queue lines (Novice, Intermediate, Advanced) displaying real-time players waiting for courts.
