import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const config = JSON.parse(await readFile(resolve(root, 'vercel.json'), 'utf8'));
const securityHeaders = Object.fromEntries(config.headers[0].headers.map(h => [h.key, h.value]));
const port = Number(process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { ...securityHeaders, Allow: 'GET, HEAD' });
      return response.end('Method not allowed');
    }
    const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const file = resolve(dist, `.${path === '/' ? '/index.html' : path}`);
    const rel = relative(dist, file);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      response.writeHead(403, securityHeaders);
      return response.end('Forbidden');
    }
    const body = await readFile(file);
    response.writeHead(200, { ...securityHeaders, 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    const status = error instanceof URIError ? 400 : 404;
    response.writeHead(status, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(status === 400 ? 'Invalid request path' : 'Not found. Run npm run build before previewing.');
  }
});
server.on('error', error => { console.error(`Preview server failed: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`MeatBlock preview: http://127.0.0.1:${port}`));
