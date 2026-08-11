# Architecture Overview

> **Document Owner:** Architecture Team
> **Last Updated:** 2026-07-16
> **Status:** Active — Source of Truth

---

## 1. What Is South Rally?

South Rally is a premium **Pickleball Court Booking, Stacking, and Club Management Platform**. It is structured as a modular monolithic Next.js application, deliberately organized by business domains.

The architecture is built for maximum developer velocity, tight database transaction integrity (critical for booking double-allocations and credit balance deductions), and absolute simplicity in deployments.

---

## 2. Architectural Style: Modular Monolith

### Overview

South Rally uses a **modular monolith** style — a single codebase deployable as a single unit but partitioned internally into strict, isolated domain modules.

Each module manages:
*   Its own services (business logic)
*   Its own repositories (database operations)
*   Its own types and schemas (Zod and TypeScript)
*   Its own test coverage

Modules communicate strictly via public interfaces (`index.ts`) and must never access the internals (like raw repositories or schemas) of another domain.

### Domain Modules

The platform is divided into the following isolated domain modules:

```
src/modules/
├── courts/          # Court management (names, types, facilities)
├── bookings/        # Court scheduling and calendar reservations
├── openplay/        # Open Play session controls and check-in scanner backend
├── paddlestack/     # Paddle stacking queues (Novice, Intermediate, Advanced queues)
├── members/         # User profiles, DUPR levels, membership plans, QR codes
├── credits/         # Billing ledgers, transaction records, point top-ups
├── events/          # Tournaments, social matches, clinics
└── notifications/   # Queue alerts, reservation confirmations
```

---

## 3. Request Lifecycle

```
Browser / Client
      │
      ▼
Next.js App Router
      │
      ├── Server Components (read-only views, calendar schedules, overview)
      │         │
      │         ▼
      │   Module Service Layer
      │         │
      │         ▼
      │   Prisma (PostgreSQL)
      │
      └── Route Handlers (API mutations, QR scans, booking actions)
                │
                ▼
          Zod Validation
                │
                ▼
          Module Service Layer
                │
                ├── Prisma (PostgreSQL)
                └── Real-time Push (Pusher / WebSockets)
```

**Key Architectural Constraint:** React Server Components (RSC) and Route Handlers contain no business logic. Components focus solely on rendering and UI state. Route Handlers validate parameters and direct traffic. The services own all core rules (e.g., check-in credit checks, stacking validation).

---

## 4. Domain Module Structure

Each module implements this rigid layout:

```
src/modules/<domain>/
├── index.ts            # Public API exports (only files imported by other modules)
├── service.ts          # Business logic (rules, checks, orchestrations)
├── repository.ts       # Database interface layer (direct Prisma calls)
├── schemas.ts          # Zod input validation schemas
├── types.ts            # Types derived from Zod schemas or DB models
├── errors.ts           # Domain-specific errors
└── __tests__/          # Domain-level unit & integration tests
```

### Module Boundary Enforcement

> A module must **never import** from another module's internal directories.
>
> ✅ Allowed: `import { deductCredits } from '@/modules/credits'`
>
> ❌ Forbidden: `import { creditRepository } from '@/modules/credits/repository'`

---

## 5. Data Flow & Transaction Integrity

### Server-Side Data Fetching
*   Server Components execute data queries directly via module services.
*   We bypass HTTP client fetches inside Server Components to prevent network overhead.

### Real-Time Live Sync
*   **Paddle Stack** and **My Bookings Calendar** require real-time updates.
*   We use a Pub/Sub integration (e.g., Pusher / WebSockets) triggered directly from the service layer upon mutation completion (e.g., when a player is moved to a court in the stack, an event `court-update` is published).

### Financial/Credit Integrity
*   Booking courts and joining Open Play require checking and deducting member credits.
*   These operations must run in strict SQL database transactions (Prisma `$transaction`) within the `credits` and `bookings` services to avoid double-charging or race conditions.
