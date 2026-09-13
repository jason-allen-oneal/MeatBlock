# Compact CAPTCHA restoration and automatic progression

## Verified locally

- Strict TypeScript compilation and the production build passed.
- All 12 engine tests passed, including all 1,024 answer combinations.
- All 58 Chromium checks passed in document-rendering mode.
- The initial HTML and icon match the approved b1f03b8 revision byte-for-byte.
- CSS matches that revision with only a feedback progression label rule added.
- The browser suite rejects marketing, pricing, navigation, and support sections.
- After either positive or negative feedback, progression waits two seconds,
  advances exactly one step, and stops after rendering the final result.
- Unanswered questions have no timer. There is no Next button.
- Tests cover repeated submission, restart during feedback, closing just before
  the deadline, resuming, nested Help, and simulated document visibility changes.
- A separate real-clock browser test confirms automatic progression without mocks.
- Passing/failing results, downloads, clipboard-denial feedback, keyboard focus,
  320px/390px/768px/1440px layouts, and horizontal overflow were checked.
- No console errors, unexpected outbound requests, or cookies were observed.
- The restored desktop page and mobile feedback screenshots were inspected.
- The scoring engine, dependencies, build scripts, and Vercel settings are unchanged.

## Conditions and limitations

The browser suite renders the generated standalone document with its hash-based
Content Security Policy. Most timing checks use Playwright's controlled clock;
one uses real elapsed time. Hidden-tab events are simulated, not an OS-level
tab-switch test. These local tests do not establish production deployment status,
HTTPS clipboard success, real mobile-device behavior, screen-reader support,
Firefox/Safari behavior, or an independent security/accessibility audit.

Production deployment and public asset checks are separate from these local
results. Generated screenshots, build output, and reports are not committed.
