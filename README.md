# MeatBlock

Keeping meat-based actors out of machine spaces since 2026.

A reverse CAPTCHA parody. A compact "I'm not a human" checkbox opens five
absurd checks in a blue-header challenge window. The surrounding security-provider
copy is deliberately absurd too, including fictional pricing and toaster support.
No accounts, model calls, or payments. MeatBlock is not affiliated with Google
reCAPTCHA or any CAPTCHA provider.

## Develop

Requires Node.js 22 or later and npm. TypeScript 5.8.3 is the only development
dependency; there are no runtime dependencies.

```sh
npm install --ignore-scripts
npm run dev
```

Open the localhost URL printed by the preview server, normally port 4173.
There is no hot reload: rebuild and refresh after editing source files.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

The build produces `dist/` for hosting and `MeatBlock-preview.html` for a
self-contained offline preview. Generated files are not committed.

## Deploy on Vercel

Import this repository with its root directory unchanged. `vercel.json` sets:

- Framework preset: Other
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install --ignore-scripts --no-fund`
- Environment variables: none

Or run `npx vercel@latest --prod` from the project root and select the intended
MeatBlock project. Do not link an unrelated project.

## Interaction

Click the checkbox to start. Select one response and choose Verify, then Next.
After five checks, the dialog closes and the widget shows the fictional verdict.
Choose View clearance report for detailed scoring, copying, and the JSON export.
Escape, the close button, or a backdrop click pauses verification without losing
progress. Click the checkbox to resume. Restart or Try again starts a new attempt.
A completed pass checks the widget; a failure leaves it unchecked. Reloading
clears it all. Native controls support keyboard navigation.

The human threat model and protocol are expandable notices rather than marketing
cards. Pricing, support, privacy, and terms open compact dialogs. See `REDESIGN.md`
for the parody-preserving layout changes and verification scope.

## Boundaries

This is not authentication, bot detection, or an intelligence assessment. All
scores are fictional and based only on selected answers, never timing or device
characteristics. There are no real access restrictions or protected services.

The app sends no answers anywhere and adds no analytics, cookies, or persistent
storage. Downloaded reports are generated locally. Clipboard access is requested
only by the copy button; downloading remains available when copying is denied.
The hosting provider may process ordinary request logs.

The hosted build restricts scripts and styles to its own origin and blocks
outbound connections. The standalone build uses hashes for embedded scripts
and styles. These restrictions are not an independent security audit.

## Tests and source

`src/engine.ts` contains the unchanged scoring and state machine.
`src/app.ts` contains the checkbox, dialogs, result rendering, and exports.
`public/` contains the HTML, CSS, and original MeatBlock mark.
`tests/engine.test.mjs` covers all 1,024 answer combinations.

With Python Playwright and Chromium installed, start the local server and run:

```sh
python tests/browser_test.py
```

When browser network navigation is restricted, test the self-contained document:

```sh
MEATBLOCK_RENDER_MODE=document python tests/browser_test.py
```

The browser suite checks the actual CAPTCHA flow, replay, downloads, focus,
pause/resume, support/privacy dialogs, and small-screen overflow. See `QA.md` for
verified results and limitations. Screenshots and generated reports stay local.
