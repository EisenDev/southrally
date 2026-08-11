# Design Tokens — Master Registry

> **Document Owner:** Design & Front-End Team
> **Last Updated:** 2026-07-16
> **Status:** Active — Source of Truth

This is the single source of truth for every design token used in South Rally. All tokens are defined here as CSS custom properties and referenced in Tailwind CSS configs.

---

## 1. Color Tokens

### Neutral Layer

| Token Name | Value | Description |
|---|---|---|
| `--color-bg-primary` | `#F8FAFC` | Main application page canvas |
| `--color-surface` | `#F1F5F9` | Sidebar and section backgrounds |
| `--color-card` | `#FFFFFF` | Dashboard card containers |
| `--color-border` | `#E2E8F0` | Structural hairlines and borders |
| `--color-muted` | `#F8FAFC` | Skeleton loading frames, disabled backgrounds |
| `--color-text-primary` | `#0F172A` | Primary text and headers |
| `--color-text-secondary` | `#475569` | Secondary descriptors and tables |
| `--color-text-disabled` | `#94A3B8` | Text on disabled buttons/inputs |
| `--color-text-inverse` | `#FFFFFF` | Text on Navy/Volt buttons |

### Brand / Accent Layer

| Token Name | Value | Description |
|---|---|---|
| `--color-primary` | `#091E3A` | Court Navy: CTA buttons, active sidebar icon |
| `--color-primary-hover` | `#051121` | Court Navy hover state |
| `--color-primary-subtle` | `#F0F4FA` | Court Navy background tint |
| `--color-secondary` | `#1E4D4D` | Forest Teal: Secondary items, headers, widgets |
| `--color-secondary-hover` | `#153636` | Forest Teal hover state |
| `--color-secondary-subtle` | `#EBF5F5` | Forest Teal background tint |
| `--color-accent` | `#8AE234` | Volt Lime: Highlights, status lines, markers |
| `--color-accent-hover` | `#76D11B` | Volt Lime hover state |
| `--color-accent-subtle` | `#ECFCCB` | Volt Lime background tint |

### Semantic Layer

| Token Name | Value | Description |
|---|---|---|
| `--color-success` | `#10B981` | Emerald: Paid, validated, check-in success |
| `--color-success-subtle` | `#ECFDF5` | Emerald tint |
| `--color-warning` | `#F59E0B` | Amber: Low credits, booking pending |
| `--color-warning-subtle` | `#FEF3C7` | Amber tint |
| `--color-danger` | `#EF4444` | Red: Expired, failed check-in, error |
| `--color-danger-subtle` | `#FEF2F2` | Red tint |
| `--color-info` | `#3B82F6` | Blue: Events, clinics, tournament info |
| `--color-info-subtle` | `#EFF6FF` | Blue tint |

---

## 2. Typography Tokens

| Token Name | Value | Description |
|---|---|---|
| `--font-family-sans` | `'Plus Jakarta Sans', 'Inter', system-ui, sans-serif` | UI structural font |
| `--font-family-mono` | `'JetBrains Mono', 'Fira Code', monospace` | Court timers, DUPR IDs, pricing lists |
| `--font-size-display` | `3rem` / `48px` | Marketing hero display headings |
| `--font-size-h1` | `1.875rem` / `30px` | Page title headings |
| `--font-size-h2` | `1.5rem` / `24px` | Section titles |
| `--font-size-h3` | `1.25rem` / `20px` | Subheading / Card titles |
| `--font-size-h4` | `1rem` / `16px` | Inline headings, important labels |
| `--font-size-body` | `0.9375rem` / `15px` | Primary UI text |
| `--font-size-sm` | `0.875rem` / `14px` | Small body / descriptive text |
| `--font-size-xs` | `0.75rem` / `12px` | Badges, court labels, caption text |
| `--font-weight-regular` | `400` | Regular body copy |
| `--font-weight-medium` | `500` | Sidebar navigation, form inputs |
| `--font-weight-semibold` | `600` | Section subtitles, active lists |
| `--font-weight-bold` | `700` | H1 headings, primary button copy |

---

## 3. Spacing Tokens (4px Grid Base)

| Token Name | Value | Pixel Equivalent | Context |
|---|---|---|---|
| `--spacing-1` | `0.25rem` | `4px` | Icon to text gap, tight inline margins |
| `--spacing-2` | `0.5rem` | `8px` | Badge padding, small gap items |
| `--spacing-3` | `0.75rem` | `12px` | Intermediate details, tag spacing |
| `--spacing-4` | `1rem` | `16px` | Standard button-padding, input spacing |
| `--spacing-6` | `1.5rem` | `24px` | Card interior paddings, margins |
| `--spacing-8` | `2rem` | `32px` | Section gaps, grid separations |
| `--spacing-12` | `3rem` | `48px` | Main dashboard outer paddings |
| `--spacing-16` | `4rem` | `64px` | Page block separators |

### Semantic Layout Spacing

| Token Name | Value | Context |
|---|---|---|
| `--spacing-page-x` | `32px` | Dashboard horizontal margin |
| `--spacing-page-y` | `32px` | Dashboard vertical margin |
| `--spacing-card-inner` | `24px` | Internal padding inside cards |
| `--spacing-card-gap` | `16px` | Grid gap between dashboard cards |
| `--spacing-form-gap` | `20px` | Vertical separation of inputs |

---

## 4. Border Radius Tokens

| Token Name | Value | Usage |
|---|---|---|
| `--radius-xs` | `4px` | Mini tags, tiny badges, indicators |
| `--radius-sm` | `6px` | Checkbox borders, small inputs |
| `--radius-md` | `8px` | Buttons, small utility widgets |
| `--radius-lg` | `12px` | Main form inputs, buttons, list rows |
| `--radius-xl` | `16px` | Standard dashboard and court cards |
| `--radius-2xl` | `20px` | Modals, QR overlay cards |
| `--radius-full` | `9999px` | Avatars, pills, search inputs, player status dots |

---

## 5. Shadow Elevations

| Token Name | Value | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(0, 0, 0, 0.04)` | Flat surface buttons, text fields |
| `--shadow-sm` | `0 2px 4px rgba(0, 0, 0, 0.05)` | Default structural cards |
| `--shadow-md` | `0 4px 12px rgba(0, 0, 0, 0.06)` | Court status popups, active cards |
| `--shadow-lg` | `0 8px 24px rgba(0, 0, 0, 0.08)` | Dropdown selections |
| `--shadow-xl` | `0 16px 48px rgba(0, 0, 0, 0.12)` | Centered QR check-in overlay, modals |
| `--shadow-hover` | `0 4px 16px rgba(9, 30, 58, 0.08)` | Hovering over interactive card grids |

---

## 6. Motion & Transitions

| Token Name | Value | Usage |
|---|---|---|
| `--duration-instant` | `80ms` | Instant hover colors |
| `--duration-fast` | `150ms` | Buttons, active selection tabs |
| `--duration-normal` | `220ms` | Court card timer counts, modal slide-ins |
| `--duration-slow` | `350ms` | Full drawer slide-out operations |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Card entries |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Stacking animations |
