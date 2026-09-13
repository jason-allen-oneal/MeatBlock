# CAPTCHA redesign verification

## Current local results

The parody-preserving layout passed TypeScript 5.8.3 strict checking, the
production build, all 12 existing engine tests, and 72 Chromium document-mode
checks on September 13, 2026. The engine suite includes all 1,024 possible
answer combinations. The scoring engine and runtime dependencies are unchanged.

Browser coverage includes passing and failing sessions; checkbox launch;
selection and feedback preservation on pause/resume; explicit restart; completion
back to the widget; optional clearance reports; JSON downloads; clipboard-denial
feedback inside the dialog; keyboard controls and background focus isolation;
all five memo types; and disclosure navigation.

The page and challenge were checked at 320, 390, 660, 768, 1024, and 1440px widths.
Complete runs also passed at 320px, 390px, and 568x320 landscape. No JavaScript
errors, unexpected outbound requests, or horizontal overflow appeared in these
checks. The app added no cookies. Local HTTP serving separately returned 200
with the configured Content Security Policy.

## Conditions and limitations

Testing used Node.js 22.16.0, TypeScript 5.8.3, and local Chromium. The browser's
managed environment blocked navigation to the local HTTP server with
ERR_BLOCKED_BY_ADMINISTRATOR. No browser policy was changed. Playwright instead
rendered the built standalone document with its hash-based Content Security
Policy, the real UI code, and the same CSS using set_content.

These tests do not verify the production origin, hosted clipboard success,
Firefox, Safari, real mobile hardware, or an independent accessibility/security
audit. Deployment status must be checked separately in Vercel. Browser artifacts
are generated locally by tests/browser_test.py and are not committed.

See REDESIGN.md for interaction details and reproduction commands. These results
supersede the 47-check record for the earlier stripped-down CAPTCHA layout.
