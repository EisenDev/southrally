# Color System

> **Document Owner:** Design & Front-End Team
> **Last Updated:** 2026-07-16
> **Status:** Active — Source of Truth

---

## 1. Design Philosophy

South Rally's color palette transitions from the basic flat colors of the legacy PickleBook site into a **premium athletic aesthetic**. The tone is directly inspired by the sport's high energy and premium facilities:

*   **Court Navy (`#091E3A`)** anchors the application. It represents structure, professional club management, and provides heavy contrast.
*   **Volt Lime (`#8AE234`)** represents the vibrant color of a pickleball/tennis ball. It is the energetic spark of the UI, utilized for active states, indicators, and primary CTAs.
*   **Forest Teal (`#1E4D4D`)** represents court surfaces, steel net frames, and outdoor environments. It adds a sophisticated layer of secondary branding.
*   **Cool Slate Neutrals** replace Avenor's warm bones and terracottas, establishing a clean, crisp, and fresh environment that feels lightweight and modern.

---

## 2. Color Scales — Exact Values

### Neutral Environment Layer

These construct the background and spatial foundations of the interface.

```
bg-primary      #F8FAFC   ← Page background — clean, bright Slate 50
surface         #F1F5F9   ← Sidebar, section bg — slightly deeper Slate 100
card            #FFFFFF   ← Pure white cards float above the page background
border          #E2E8F0   ← Hairline dividers and border contours — Slate 200
muted           #F8FAFC   ← Fills, disabled forms, skeleton loaders
```

**Visual Hierarchy of the Neutral Layer:**
```
#F8FAFC  Page bg
  └── #F1F5F9  Sidebar / Section bg (slightly darker for structural contrast)
        └── #FFFFFF  Dashboard Cards (float on top)
              └── #E2E8F0  Card borders (clean bounding lines)
```

### Text Layer

```
text-primary    #0F172A   ← Slate 900: Near-black for crisp, legible headings
text-secondary  #475569   ← Slate 600: Muted metadata, descriptions, table labels
text-disabled   #94A3B8   ← Slate 400: Disabled input fields and inactive states
text-inverse    #FFFFFF   ← Clean white text on Navy or Volt backgrounds
```

### Brand & Semantic Layer

```
primary         #091E3A   ← Court Navy: Primary buttons, active sidebar icons, brand mark
primary-hover   #051121   ← Muted navy hover (lightness offset)
primary-active  #030A14   ← Deep navy active clicked state
primary-subtle  #F0F4FA   ← Light blue-gray highlight fill
primary-muted   #D0DDEE   ← Decorative navy borders

secondary       #1E4D4D   ← Forest Teal: Secondary actions, greeting headers, tags
secondary-hover #153636   ← Forest Teal hover
secondary-subtle #EBF5F5  ← Forest Teal light background fill

accent          #8AE234   ← Volt Lime: Live status, badge checkmarks, highlight borders
accent-hover    #76D11B   ← Volt Lime hover
accent-subtle   #ECFCCB   ← Volt Lime light background fill

success         #10B981   ← Paid reservations, validated QR scans, active timers
success-subtle  #ECFDF5   ← Paid/Validated backgrounds

warning         #F59E0B   ← Upcoming court alerts, low credit warnings
warning-subtle  #FEF3C7   ← Low credit backdrop warning

danger          #EF4444   ← Failed QR scans, booking cancellations, expired credits
danger-subtle   #FEF2F2   ← Error alert backgrounds

info            #3B82F6   ← Clinics, tournaments, system announcements
info-subtle     #EFF6FF   ← Event informational backdrops
```

---

## 3. Semantic & Queue Color Mappings

The dashboard features live player queue tracks (Novice, Intermediate, Advanced) and court play cards. We map these statuses to specific tokens:

| Status / Queue | Primary Color | Token | CSS Variable |
|---|---|---|---|
| **Novice Queue** | `#10B981` | `--color-success` | Success Emerald |
| **Intermediate Queue** | `#F59E0B` | `--color-warning` | Warning Amber |
| **Advanced Queue** | `#3B82F6` | `--color-info` | Info Blue |
| **Waiting List (General)** | `#64748B` | `--color-text-secondary` | Slate Gray |
| **Court Status: Active Play** | `#091E3A` | `--color-primary` | Deep Court Navy |
| **Court Status: Warmup** | `#1E4D4D` | `--color-secondary` | Forest Teal |
| **Court Status: Empty** | `#94A3B8` | `--color-text-disabled` | Muted Gray |

---

## 4. Brand Accent Integration (Volt Lime `#8AE234`)

Because Volt Lime is a highly saturated neon-lime color, it must be used with **discipline** to avoid creating a chaotic interface.

**Used for:**
*   Active sidebar navigation item indicator stripe (vertical left border).
*   Active player markers in lists.
*   Success checkmarks in forms.
*   The "Join Open Play" primary floating button (large high-priority action).
*   Underline highlights for core action headers.

**Never used for:**
*   Body text (fails accessibility requirements completely).
*   Large container backgrounds (causes extreme eye strain).
*   Default borders or dividers.

---

## 5. Contrast & Accessibility Checks (WCAG 2.1 AA)

All text-to-background styling must pass the WCAG 2.1 AA requirements:

| Text | Background | Ratio | Check | Usage Rationale |
|---|---|---|---|---|
| `#0F172A` (Text Primary) | `#FFFFFF` (Card) | 16.5:1 | ✅ AAA | Standard reading |
| `#475569` (Text Secondary) | `#FFFFFF` (Card) | 9.9:1 | ✅ AAA | Metadata, table items |
| `#FFFFFF` (Text Inverse) | `#091E3A` (Court Navy) | 15.8:1 | ✅ AAA | Primary Button text |
| `#0F172A` (Text Primary) | `#8AE234` (Volt Lime) | 5.2:1 | ✅ AA | Volt buttons or tags with dark text |
| `#8AE234` (Volt Lime) | `#FFFFFF` (Card) | 1.8:1 | ❌ FAIL | **Never use Volt Lime text on white** |
| `#10B981` (Success) | `#FFFFFF` (Card) | 3.1:1 | ❌ FAIL | **Use dark text over `--color-success-subtle`** |
| `#0F172A` | `#ECFDF5` (Success Subtle) | 14.2:1 | ✅ AAA | Validated session indicators |
