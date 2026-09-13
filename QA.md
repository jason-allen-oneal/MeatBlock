# CAPTCHA redesign verification

## Local checks completed

- TypeScript 5.8.3 strict compilation and production build passed.
- All 12 Node tests passed, including all 1,024 answer combinations.
- All 47 Chromium document-mode checks passed.
- Desktop, 320px, 390px, and 768px layouts completed all five checks.
- Perfect-score and zero-score runs produced the expected results.
- A pass checks the original widget; failure leaves it unchecked.
- Escape closes the challenge and returns focus to the checkbox.
- Reopening preserves the selected answer or feedback step without extra points.
- Restart clears the prior attempt. Reload clears the entire session.
- Native keyboard launch, arrow-key radio selection, submission, and focus work.
- Nested Help and the Privacy/Terms dialogs close and restore focus.
- The downloaded JSON matches the score, five answers, and satire label.
- Clipboard-denial behavior exposes the working download alternative.
- No horizontal overflow was observed in the page or challenge dialog.
- No unexpected outbound requests, cookies, or JavaScript/console errors occurred.
- Desktop checkbox, desktop challenge, mobile challenge, and result screenshots
  were captured; desktop and mobile layouts were visually inspected.
- A separate local HTTP request returned 200 with the configured security headers.

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
