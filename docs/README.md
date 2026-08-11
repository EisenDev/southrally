# South Rally Documentation — Overview

> **Document Owner:** Product & Design Team
> **Last Updated:** 2026-07-16
> **Status:** Active — Design Phase (Strictly No Code)
> **Version:** 2.0.0-draft

---

## 1. What Is South Rally?

South Rally is a premium, modern platform for **booking pickleball courts, tracking play time, organizing sessions (Open Play), and coordinating player queues (Paddle Stack)**.

The application is a full remodeling of the legacy PickleBook web interface. It shifts from an outdated visual style to a **modern, high-performance, and warm-minimalist athletic aesthetic** inspired by Attio, Linear, and Avenor. It scales through a disciplined **Modular Monolith** architecture.

---

## 2. Product Scope & Core Modules

South Rally coordinates the following key customer and member workflows:

*   **Member Dashboard:** Central hub showing credit balances, play activity graphs, upcoming court bookings, active play sessions, and quick shortcuts.
*   **Open Play & QR Code Check-in:** A secure, mobile-friendly check-in flow using user-specific QR codes, credit validations, and session-rate rules.
*   **Paddle Stack (Court & Queue Stacking):** A real-time, view-only and queue management board showing court assignments, playtime countdowns, player lists, and skill-level queues (Novice, Intermediate, Advanced).
*   **My Bookings (Scheduler):** An interactive grid view of courts over time, allowing bookings, status tracking (Paid, Reserved, Pending), and calendar filters.
*   **Events Calendar:** Club-hosted tournaments, matches, and social clinics.
*   **Transactions & Credits:** Member ledger showing top-ups, booking fees, and session credits.
*   **My Profile & Club ID:** Profile management containing membership categories, DUPR IDs, and check-in QR codes.

---

## 3. Design Personality: Modern Premium Athletic

Following the Avenor design ethos, South Rally rejects generic corporate designs, heavy glassmorphic overlays, and neon dashboard cards. Instead, it leans on:
*   **Whitespace as Breathing Room:** Spacious, clear grids that reduce user anxiety during peak booking hours.
*   **Sporty and Sophisticated Palette:** Rooted in the color tone of the new landing page—anchored by a deep, premium **Court Navy** (`#091E3A`), energized by a vibrant **Volt Lime** (`#8AE234`), and supported by organic **Forest Green/Teal** accents.
*   **Refined Typography:** Plus Jakarta Sans and Inter for modern readability.
*   **Interactive Fluidity:** High-density, keyboard-friendly pages, fast page responses, and smooth, springy transitions.

---

## 4. Documentation Index

The South Rally blueprint is fully detailed across the following documents. Refer to them before writing any code:

### Architecture & Foundation
*   [docs/architecture/overview.md](file:///home/eisen/projects/random-proj/south-rally/docs/architecture/overview.md) — Modular Monolith setup, directory layouts, and rules.
*   [docs/architecture/stack.md](file:///home/eisen/projects/random-proj/south-rally/docs/architecture/stack.md) — Technical stack specifications and rationale.

### UI & Design System
*   [docs/ui/README.md](file:///home/eisen/projects/random-proj/south-rally/docs/ui/README.md) — Visual principles and user experience guide.
*   [docs/ui/design-tokens.md](file:///home/eisen/projects/random-proj/south-rally/docs/ui/design-tokens.md) — Master registry of colors, typography, margins, shadows, and radii.
*   [docs/ui/colors.md](file:///home/eisen/projects/random-proj/south-rally/docs/ui/colors.md) — Sports-derived color system and accessibility ratio checks.

### Component Specifications
*   [docs/ui/components/sidebar.md](file:///home/eisen/projects/random-proj/south-rally/docs/ui/components/sidebar.md) — Left side navigation and AI club status panels.
*   [docs/ui/components/cards.md](file:///home/eisen/projects/random-proj/south-rally/docs/ui/components/cards.md) — Dashboard metrics, court slots, and content cards.
*   [docs/ui/components/paddle-stack.md](file:///home/eisen/projects/random-proj/south-rally/docs/ui/components/paddle-stack.md) — The real-time play stacking queue dashboard.
*   [docs/ui/components/bookings-calendar.md](file:///home/eisen/projects/random-proj/south-rally/docs/ui/components/bookings-calendar.md) — Grid schedule board and date selectors.
