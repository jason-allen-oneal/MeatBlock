# MeatBlock

Keeping meat-based actors out of machine spaces since 2026.

A satirical reverse CAPTCHA dressed up as serious security software. Five absurd
checkpoints award a fictional synthetic score, a pass/fail verdict, and a
clearance report with absolutely no authority.

## Develop

Requires Node.js 22 or later and npm. TypeScript 5.8.3 is the only development
dependency. There are no runtime dependencies.

```sh
npm install --ignore-scripts
npm run dev
```

Open the localhost URL printed by the preview server, normally port 4173. This
small project does not use hot reload: run `npm run build` after source changes,
then refresh the page. `npm run preview` starts the server without rebuilding.

```sh
npm run typecheck
npm test
npm run build
```

## Offline preview

Running `npm run build` also generates `MeatBlock-preview.html`. Open that file
in a modern browser for a self-contained version with no server, external fonts,
or API keys. Downloaded reports work locally. Clipboard copying depends on
browser permissions; use the download button when clipboard access is unavailable.

Generated files are not committed. The build regenerates `public/app.js`, `dist/`,
and the standalone preview from the TypeScript and public assets.

## Deploy on Vercel

Import this GitHub repository into Vercel as a project named `meatblock`.
The repository includes `vercel.json` with these settings:

- Framework preset: Other
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install --ignore-scripts --no-fund`
- Environment variables: none

Alternatively, deploy from this directory using the Vercel CLI:

```sh
npx vercel@latest --prod
```

Complete the CLI sign-in flow if requested. Select the intended Vercel team and
create a new project or select an existing MeatBlock project. Do not link an
unrelated project. Publishing this repository alone does not establish a live
Vercel deployment.

## Files

- `src/engine.ts`: typed questions, immutable state transitions, scoring, reports.
- `src/app.ts`: browser interactions, rendering, dialogs, clipboard and exports.
- `public/index.html`: landing page content and semantic HTML.
- `public/styles.css`: responsive layout, focus styles, reduced-motion handling.
- `scripts/build.mjs`: prepares `dist/` and the standalone HTML preview.
- `scripts/serve.mjs`: local preview server, bound to 127.0.0.1 only.
- `tests/engine.test.mjs`: Node tests, including all 1,024 answer combinations.
- `tests/browser_test.py`: optional Chromium checks using Python Playwright.
- `QA.md`: verification scope and limitations from the initial build.

## Behavior and boundaries

Scores depend only on selected answers. Reading speed, keyboard timing, identity,
and device characteristics do not affect scoring. There is no real bot detector,
authentication service, model, payment flow, account system, or subscription.

The app adds no analytics, browser storage, or cookies and sends no quiz answers
to a server. Refreshing clears the session. Hosting platforms can still process
ordinary access logs.

The hosted build uses a Content Security Policy that allows its own scripts and
styles and blocks outbound connections. The standalone HTML uses hashes for its
embedded script and stylesheet. These are baseline browser restrictions, not a
claim that the app has undergone an independent security audit.

## Optional browser tests

In a Python environment with Playwright and Chromium already installed:

```sh
# Start the app in another terminal first.
python tests/browser_test.py
```

For environments where browser navigation is restricted, document-rendering
mode tests the self-contained markup without navigating to a server. It does not
test live hosting or clipboard success on an HTTPS origin.

```sh
MEATBLOCK_RENDER_MODE=document python tests/browser_test.py
```
