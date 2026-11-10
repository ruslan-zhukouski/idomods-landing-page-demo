import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.txt':'text/plain; charset=utf-8' };
const server = http.createServer(async (request, response) => {
  try {
    if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405, {Allow:'GET, HEAD'}).end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    if (relative !== 'index.html' && !relative.startsWith('styles/') && !relative.startsWith('assets/') && !['main.js','navigation.js','hero-geometry.js','header-motion.js','hero-slider.js','hero-lights.js','carousel-clock.js','shader-section.js','shader-renderer.js'].map(file => `scripts/${file}`).includes(relative)) { response.writeHead(404).end('Not found'); return; }
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root) || pathname.includes('\0') || pathname.includes('\\')) { response.writeHead(403).end('Forbidden'); return; }
    const info = await stat(filename);
    if (!info.isFile()) { response.writeHead(404).end('Not found'); return; }
    response.writeHead(200, {'Content-Type':types[path.extname(filename)] || 'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache'});
    if (request.method === 'HEAD') response.end(); else createReadStream(filename).pipe(response);
  } catch { response.writeHead(404).end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
