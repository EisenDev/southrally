# South Rally Transactional Email Design

South Rally authentication emails use one shared, responsive HTML template so login OTP, signup OTP, and password-reset messages remain visually consistent.

## Brand contract

- Header: South Rally crest served from the production application, the `SOUTH RALLY` wordmark, and a gold divider.
- Palette: deep green (`#063F32`), royal purple (`#2D183F`), warm cream (`#F8F3E8`), and muted gold (`#B49A48`).
- Typography: Georgia for display headings with Arial-compatible body copy.
- Layout: table-based email markup with inline styles for broad email-client compatibility.
- Accessibility: meaningful logo alternative text, readable contrast, text labels for every action, and no information conveyed by color alone.

## Message variants

- Login OTP: displays a six-digit code and a 15-minute expiration notice.
- Signup OTP: welcomes the recipient, displays a six-digit code, and includes a 15-minute expiration notice.
- Password reset: provides a labeled reset button, the raw fallback URL, and a one-hour expiration notice.

All links and image URLs must use the configured public application origin. User-controlled values must be HTML-escaped before interpolation.
