# Verification record

This records the initial local build, not a hosted deployment.

## Completed

- TypeScript strict compilation and production build succeeded.
- All 12 Node test cases passed.
- The logic suite checked all 1,024 combinations of the five four-option tests.
- All 45 local Chromium checks passed.
- Perfect-score and zero-score browser runs produced the expected verdicts.
- Replay cleared the previous answers and score.
- The JSON download contained the displayed score, answers, and satire notice.
- Clipboard-denial behavior displayed the download fallback.
- Support, pricing, sales, and privacy dialogs opened, closed with Escape, and
  restored focus to their trigger buttons.
- Keyboard start, radio selection, answer submission, and focus handoffs worked.
- Horizontal-overflow checks passed at 320, 390, 768, 1024, and 1440 pixels.
- A full quiz completed at the 390-pixel mobile viewport.
- The standalone document completed under its hash-based Content Security Policy.
- No unexpected outbound requests or JavaScript/console errors were observed in
  the browser test runs.
- Desktop landing-page, mobile landing-page, empty-grid challenge, and result
  screenshots were captured. Desktop and mobile result layouts were inspected.
- A separate local HTTP request returned 200 and the configured security headers.

## Test conditions and limitations

Chromium's managed environment blocked navigation to the local HTTP server.
The browser suite therefore ran in document mode: Playwright loaded the complete
standalone HTML into an empty document with `set_content`. Browser policies were
not changed. The same app markup, CSS, script, and Content Security Policy were
exercised without a network navigation.

The clipboard success path on an HTTPS origin and opening the downloaded file
through a user's file browser were not verified here. The fallback path was
verified. A hosted deployment, Vercel build logs, production URL, other browser
engines, real mobile devices, and an independent accessibility or security audit
were not tested.

No Vercel deployment was created during the initial local build. The repository
contains the configuration and source needed to deploy through Vercel.

## Repository publication checks

Before publication, strict type checking, the production build, and all 12 Node
tests were run again and passed. The browser suite was not rerun in this step.
