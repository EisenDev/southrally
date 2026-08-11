# South Rally landing page

## Purpose

The public landing page presents South Rally as a premium, community-led
pickleball club. It must preserve the existing authentication behavior and
route users into the current booking, open-play, events, signup, and dashboard
flows.

## Page contract

The page renders these sections in order:

1. Header and hero: South Rally logo/name, navigation, session-aware actions,
   primary booking CTA, open-play CTA, and a compact court finder.
2. Experience: four benefit cards for booking, matching, check-in, and rewards.
3. Court booking: availability summary and a booking CTA.
4. Open play: skill-based matching summary and an open-play CTA.
5. Membership and rewards: member pass, progress, and reward examples.
6. Events and community: three event cards and an events CTA.
7. Final CTA and footer: booking/signup actions, club navigation, and a compact
   “Crafted and built by Novaryn” maker credit.

## Behavior

- Authenticated visitors see only **Go to Dashboard** in the header.
- Guests see **Sign In** and **Book a Court**; Sign In opens the existing modal.
- Every public landing-page CTA uses `/signup`; it never deep-links to client or
  admin pages.
- `/dashboard` appears only once as the authenticated header destination.
- The mobile menu retains the same session-aware header action and closes after
  link selection.
- OAuth errors continue to open the existing sign-in modal with the error.
- The footer’s **Novaryn** credit opens `https://novaryn.tech/` in a new tab
  without granting the destination access to the South Rally browser context.

## Visual system

- Brand colors: deep green, aubergine, warm ivory, and muted olive/gold.
- Display headings use a classic serif stack; controls and body copy use the
  project sans-serif stack.
- The supplied `/south-rally-logo.png` is the sole brand logo.
- Layouts adapt without horizontal overflow from 320px through 2560px.

## Accessibility

- Every section uses semantic headings and labelled landmarks.
- The brand image has descriptive alternative text; decorative imagery has an
  empty alternative.
- Mobile navigation exposes `aria-expanded` and `aria-controls`.
- Buttons and links have visible hover, active, and focus-visible states.
- Text contrast targets WCAG AA, and reduced-motion preferences are respected.

## Failure behavior

- A failed session request leaves the visitor in the guest state and does not
  block rendering.
- Missing optional decorative imagery must not hide text or navigation.
- OAuth account-linking errors are shown in the existing sign-in modal.
