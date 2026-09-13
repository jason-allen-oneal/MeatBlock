# CAPTCHA-centered redesign

The parody remains. The presentation is now a restrained, light security checkpoint
rather than a full SaaS landing page. The MeatBlock identity, original tagline,
five challenges, deterministic scoring, JSON reports, fictional pricing, and
toaster support remain. The scoring engine and dependencies are unchanged.

## Interaction

Click the checkbox to open the challenge dialog. Select one answer and choose
Verify, then Next. After five checkpoints the dialog closes and the widget shows
the actual pass/fail outcome. Detailed scores and exports are available through
View clearance report. There are no random passes or timing-based scores.

Escape, the close button, and a backdrop click pause the quiz. Reopening retains
selected answers and feedback. Restart and Try again deliberately reset it.
Refreshing the page clears everything. No persistent browser storage is added.

The human threat model and protocol are expandable text sections. Pricing,
support, privacy, and terms use small dialogs instead of full-page marketing
sections. There are no account fields, telemetry panels, or external assets.

## Verification on September 13, 2026

- TypeScript 5.8.3 type checking and the production build passed.
- All 12 existing engine tests passed, including all 1,024 answer combinations.
- The updated Chromium suite passed 72 checks in document-rendering mode.
- Checked 320, 390, 660, 768, 1024, and 1440px widths and 568x320 landscape.
- Exercised passing and failing runs, pause/resume, restart, keyboard controls,
  background focus isolation, report downloads, clipboard-denial feedback,
  disclosure links, and all memo dialogs.
- No JavaScript errors or unexpected outbound requests appeared in those checks.
- Local HTTP serving returned 200 with the configured Content Security Policy.

The browser in the build environment blocks network navigation. Browser checks
therefore render the generated standalone document with its hash-based CSP.
They do not prove a successful Vercel deployment, HTTPS clipboard success,
Safari/Firefox behavior, or screen-reader compatibility. A hosted check remains
separate from these local results.

## Reproduce

```sh
npm run typecheck
npm test
# With Python Playwright and Chromium installed:
MEATBLOCK_RENDER_MODE=document python tests/browser_test.py
# To test the HTTP version, first run npm run preview in another terminal:
python tests/browser_test.py
```

Generated screenshots and reports go to screenshots/ and are not committed.
