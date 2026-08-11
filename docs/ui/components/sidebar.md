# Sidebar Component

> **Document Owner:** Design & Front-End Team
> **Last Updated:** 2026-07-16
> **Status:** Active — Source of Truth

---

## 1. Purpose

The sidebar is the primary navigation control for all authenticated member and staff dashboard pages. It resides persistently on the left side of the screen on desktop displays. It is designed to be clean, structurally sound, and secondary in focus relative to the central dashboard content.

---

## 2. Visual Specification

```
┌──────────────────────┐
│  [P] South Rally      │  ← Logo area: 56px height, hairline divider
│  ────────────────    │
│                      │
│  [icon] Dashboard    │  ← Active state: `--color-primary` text + Volt accent bar
│  [icon] Open Play    │  ← Interactive items: 36px height
│  [icon] Paddle Stack │
│  [icon] My Bookings  │
│  [icon] Events       │
│  [icon] Transactions │
│                      │
│  ────────────────    │  ← Section divider
│  [icon] Profile      │
│  [icon] Logout       │
│                      │
│  ┌────────────────┐  │  ← Club Status Widget (bottom footer)
│  │ 🟢 Club Active  │  │
│  │ 12/14 Courts    │  │
│  │ 34 Stacking     │  │
│  └────────────────┘  │
└──────────────────────┘

Width:          220px (`--sidebar-width`)
Background:     `--color-surface` (#F1F5F9)
Border-right:   1px solid `--color-border` (#E2E8F0)
Position:       fixed, full height (left: 0)
Z-index:        `--z-sidebar` (200)
```

---

## 3. Logo Area

```
Height:         56px (`--header-height`)
Padding:        0 16px (`--spacing-sidebar-x`)
Content:        Club logo icon (Volt Lime circle with Navy 'P') + "South Rally" wordmark
Font:           --font-size-h3, --font-weight-bold
Color:          --color-text-primary (#0F172A)
Alignment:      flex, align-items: center, gap: 8px
Border-bottom:  1px solid --color-border
```

---

## 4. Navigation Item Specification

```
┌──────────────────────────────────────┐
│ ┃ [Icon 16px]   Label text           │
└──────────────────────────────────────┘
  ↑ Volt Lime vertical active indicator (3px width)
```

```
Height:         36px (`--height-sidebar-item`)
Padding:        0 16px
Border-radius:  8px (`--radius-md`)
Margin-bottom:  4px (`--spacing-sidebar-gap`)
Font:           --font-size-sm (14px), --font-weight-medium (500)
Icon Size:      16px (`--icon-md`), stroke width: 1.5px
Icon Gap:       10px

States:
  Default:
    Background: transparent
    Text:       --color-text-secondary (#475569)
    Icon:       --color-text-secondary
  
  Hover:
    Background: --color-accent-subtle (#ECFCCB) with opacity 0.5
    Text:       --color-text-primary (#0F172A)
    Icon:       --color-primary (#091E3A)
    Transition: --duration-fast (150ms), --ease-out

  Active (Current page):
    Background: --color-primary-subtle (#F0F4FA)
    Text:       --color-primary (#091E3A)
    Icon:       --color-primary
    Font-weight: --font-weight-semibold (600)
    Left border: 3px solid --color-accent (#8AE234) [Volt vertical indicator bar]
```

---

## 5. Club Status Widget (Footer)

Mounted at the bottom of the sidebar, right above the lower profile link:

```
┌────────────────────────┐
│ 🟢 Club Active         │  ← Volt green status dot + Bold text
│ 12/14 Courts In Use    │  ← Subtext: court allocation count
│ 34 Players Stacking    │  ← Subtext: queue volume
└────────────────────────┘

Background:     --color-card (#FFFFFF)
Border:         1px solid --color-border (#E2E8F0)
Radius:         12px (--radius-lg)
Padding:        12px
Margin:         8px
Box-shadow:     --shadow-xs

Status Dot:     8px circle, filled --color-success (#10B981)
Title Font:     --font-size-sm, --font-weight-semibold, --color-text-primary
Content Font:   --font-size-xs, --color-text-secondary
```

---

## 6. Navigation Order

1.  **Dashboard** (Overview metrics)
2.  **Open Play** (QR scan and daily passes)
3.  **Paddle Stack** (Real-time live queue board)
4.  **My Bookings** (Court scheduler calendar)
5.  **Events** (Clinics and tournaments)
6.  **Transactions** (Account credit ledger)
7.  *── Section Divider (1px solid border) ──*
8.  **Profile** (Membership details, DUPR ID)
9.  **Logout**
10. *── Club Status Widget ──*

---

## 7. Responsive Behavior

| Screen Width | Breakpoint | Sidebar Mode |
|---|---|---|
| Desktop | $\ge 1024\text{px}$ | Fixed, persistent left drawer (`220px` width) |
| Tablet | $768\text{px}$ to $1023\text{px}$ | Hidden, drawer overlay opens on top-header hamburger press |
| Mobile | $< 768\text{px}$ | Full-screen drawer overlay |

---

## 8. Accessibility Requirements

*   Sidebar navigation container uses `<nav aria-label="Club member navigation">`.
*   The active navigation link is marked with `aria-current="page"`.
*   All navigation targets must support standard keyboard tab focuses.
*   Focus traps automatically active when the sidebar drawer is open on mobile overlay modes.
