# South Rally Player Dashboard Theme

## User contract

Authenticated players see the South Rally crest, name, forest green, warm cream,
purple, and laurel-gold visual language across every `/dashboard` player route.
Navigation behavior, booking flows, QR membership, balances, forms, and data remain
unchanged. Administrative routes retain their existing high-density interface.

## Architecture decision

Two options were evaluated:

1. Restyle every player page independently. This permits bespoke compositions but
   duplicates tokens and creates visual drift across ten routes.
2. Apply a player-only class at the shared dashboard shell and inherit scoped
   tokens into existing components. This keeps behavior stable, updates all routes
   consistently, and prevents the redesign from leaking into admin routes.

Option 2 is selected. Shared sidebar/header branding is updated to South Rally;
the player theme is activated only when the pathname is outside
`/dashboard/admin`. Existing route interfaces and database schemas do not change.

## Responsive and accessibility requirements

- Sidebar remains an off-canvas drawer on small screens.
- Navigation retains semantic links and `aria-current` state.
- Menu and profile controls remain keyboard accessible with visible focus states.
- Text and interactive controls maintain WCAG AA contrast.
- Layout remains usable from 320px through 2560px widths.

## Verification

- All player routes inherit the player theme class.
- Admin routes receive the admin theme class instead.
- No legacy client logo or product name remains in the shared player shell.
- Existing authentication and route destinations remain unchanged.
