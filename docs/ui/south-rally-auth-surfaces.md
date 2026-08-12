# South Rally authentication surfaces

## Scope

The signup page and sign-in modal use the South Rally landing-page identity
without changing authentication behavior.

## Visual contract

- Use `/south-rally-logo.png` and the name **South Rally** exclusively.
- Use deep green and aubergine backgrounds, warm ivory form surfaces, and
  muted olive/gold accents.
- Use Georgia for display headings and the project sans-serif font for forms.
- Signup retains the split editorial layout on desktop and a single form panel
  on smaller screens.
- The modal uses an ivory panel over a green/aubergine tinted, blurred backdrop.

## Behavior contract

- Email/password signup, OTP verification, and session redirect behavior remain
  unchanged.
- Google sign-in and signup remain visible but disabled until the South Rally
  Google Cloud OAuth application is configured. Both controls expose a clear
  “Coming soon” status to assistive technology.
- Sign-in, password reset, OTP verification, and modal close behavior remain
  unchanged.
- Inputs retain associated labels, autocomplete hints, visible focus states,
  and accessible password visibility controls.
