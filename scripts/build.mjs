import { readFile, writeFile, cp, mkdir, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await rm(resolve(root, 'dist'), { recursive: true, force: true });
await mkdir(resolve(root, 'dist'), { recursive: true });
await cp(resolve(root, 'public'), resolve(root, 'dist'), { recursive: true });

// Also create a portable, offline version. This is outside dist because the
// hosted version intentionally permits only external, same-origin scripts.
const [html, css, js, icon] = await Promise.all(
  ['index.html', 'styles.css', 'app.js', 'icon.svg'].map(file => readFile(resolve(root, 'public', file), 'utf8'))
);
const safeJS = js.replace(/<\/script/gi, '<\\/script');
const safeCSS = css.replace(/<\/style/gi, '<\\/style');
const hash = content => createHash('sha256').update(content).digest('base64');
const csp = `default-src 'none'; script-src 'sha256-${hash(safeJS)}'; style-src 'sha256-${hash(safeCSS)}'; img-src data:; connect-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'`;
const standalone = html
  .replace('<meta charset="UTF-8">', `<meta charset="UTF-8">\n<meta http-equiv="Content-Security-Policy" content="${csp}">`)
  .replace('<link rel="stylesheet" href="./styles.css">', `<style>${safeCSS}</style>`)
  .replace('<script src="./app.js" defer></script>', '')
  .replace('href="./icon.svg"', `href="data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}"`)
  .replace('</body>', `<script>${safeJS}</script>\n</body>`);
await writeFile(resolve(root, 'MeatBlock-preview.html'), standalone);
console.log('Built dist/ and MeatBlock-preview.html. No runtime dependencies or remote assets.');
