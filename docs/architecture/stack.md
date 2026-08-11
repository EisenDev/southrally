# Technology Stack

> **Document Owner:** Architecture Team
> **Last Updated:** 2026-07-16
> **Status:** Active — Source of Truth

This document lists every technology in the South Rally stack along with architectural rationales.

---

## 1. Core Framework & Language

### Next.js 15 (App Router)
*   **Why:** React Server Components (RSC) enable direct data retrieval from Postgres without client-side API requests. Fast layout loading, suspense integration, and built-in API Route Handlers keep the entire deployment inside a single full-stack project.
*   **Trade-offs:** Stricter separation of Client/Server logic. Caching behavior must be configured explicitly to prevent stale booking slots.

### TypeScript (strict mode)
*   **Why:** Essential for building stable data structures around reservation times, member tiers, and financial transactions. IDE auto-completion serves as a blueprint for developer alignment.
*   **Configuration:** strict type checking rules, `"noUncheckedIndexedAccess": true`.

---

## 2. Database & Data Management

### PostgreSQL
*   **Why:** South Rally is heavily relational. A user makes a booking, which is assigned to a court, which belongs to a time block, and generates a transaction ledger entry. PostgreSQL provides the ACID transaction guarantees required to guarantee that a court is never double-booked and that credit balances never fall negative due to concurrency issues.

### Prisma ORM
*   **Why:** Provides complete TypeScript types matching our DB schemas, database migrations, and simple relation inclusion. Makes writing transactions highly readable.
*   **Rules:** Repository files handle database queries. Services invoke repositories. React components are blocked from calling database models.

---

## 3. Real-Time Infrastructure

### Pusher Channels (or WebSockets)
*   **Why:** The **Paddle Stack** (the board showing which players are on which court in real-time) and the **Bookings Calendar** are live, collaborative views. When staff checks in a player or a court timer expires, all active dashboards must update immediately without manual browser refreshes. Pusher provides a simple, managed WebSockets abstraction for pushing event notifications to clients.

---

## 4. UI & Styling

### Vanilla CSS Variables + TailwindCSS v4
*   **Why:** TailwindCSS v4 provides rapid layout assembly, while design tokens are mapped to global CSS variables (`globals.css`) in the style of Avenor. This creates a bulletproof Design System.
*   **Rules:** Inline styles are forbidden. Magic spacing values are not allowed. Developers must use utility classes linked to the Design System tokens (e.g. `--color-primary`, `--radius-xl`).

### shadcn/ui + Radix UI
*   **Why:** Provides headless, fully accessible primitives (Dialogs, Dropdowns, Tabs, Calendars). We copy the code directly into `src/components/ui/` and apply custom styling according to our sporty Navy and Volt Lime style.

---

## 5. What Is Excluded (And Why)

| Technology | Why Excluded |
|---|---|
| NoSQL (MongoDB) | Document storage is poorly suited to calendar time-slot conflict resolution and ledger entries. |
| Redux / MobX | Client-side caching using React Query + Server component state invalidations handles 95% of state management. |
| Custom WebSocket Servers | Managing raw WebSocket connections at scale creates operational overhead. Pusher handles connection states out-of-the-box. |
| Third-party Styling libraries | We write plain Tailwind CSS classes to maintain the light, modern layout patterns from Avenor. |
