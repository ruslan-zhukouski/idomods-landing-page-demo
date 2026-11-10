import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { promisify } from 'node:util';
import { brotliCompress, gzip } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
const runtimeScripts = new Set([
  'main', 'navigation', 'hero-geometry', 'header-motion', 'hero-slider',
  'hero-lights', 'carousel-clock', 'shader-section', 'shader-renderer',
].map(name => `scripts/${name}.js`));
const compressors = { br: promisify(brotliCompress), gzip: promisify(gzip) };
const compressed = new Map();
const accepts = header => (header || '').split(',').map(part => {
  const [name, quality = 'q=1'] = part.trim().split(';');
  return { name: name.toLowerCase(), quality: Number(quality.trim().replace('q=', '')) };
}).filter(entry => Object.hasOwn(compressors, entry.name) && entry.quality > 0)
  .sort((a, b) => b.quality - a.quality)[0]?.name;

const server = http.createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const allowed = relative === 'index.html' || relative.startsWith('styles/')
      || relative.startsWith('assets/') || runtimeScripts.has(relative);
    if (!allowed) { response.writeHead(404).end('Not found'); return; }
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root) || pathname.includes('\0') || pathname.includes('\\')) { response.writeHead(403).end('Forbidden'); return; }
    const info = await stat(filename);
    if (!info.isFile()) { response.writeHead(404).end('Not found'); return; }
    const extension = path.extname(filename);
    const encoding = ['.html', '.css', '.js', '.svg', '.txt'].includes(extension)
      ? accepts(request.headers['accept-encoding']) : undefined;
    const etag = `"${info.mtimeMs}-${info.size}-${encoding || 'identity'}"`;
    const headers = {
      'Content-Type': types[extension] || 'application/octet-stream',
      'Cache-Control': 'no-cache', // Revalidate edits in this local development server.
      'X-Content-Type-Options': 'nosniff', Vary: 'Accept-Encoding', ETag: etag,
    };
    if (request.headers['if-none-match'] === etag) {
      response.writeHead(304, headers).end();
      return;
    }
    let bytes;
    if (encoding) {
      const key = `${filename}:${encoding}`;
      const cached = compressed.get(key);
      bytes = cached?.etag === etag ? cached.bytes : await compressors[encoding](await readFile(filename));
      compressed.set(key, { etag, bytes });
      headers['Content-Encoding'] = encoding;
    }
    headers['Content-Length'] = bytes?.length ?? info.size;
    response.writeHead(200, headers);
    if (request.method === 'HEAD') response.end();
    else if (bytes) response.end(bytes);
    else createReadStream(filename).on('error', () => response.destroy()).pipe(response);
  } catch { response.writeHead(404).end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
