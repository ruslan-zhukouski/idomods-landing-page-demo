// Exercise actual HTTP compression/revalidation, rather than mocking zlib.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
for (const file of ['index.html', 'styles/site.min.css', 'scripts/main.js']) {
  const expected = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  for (const encoding of ['br', 'gzip']) {
    const headers = { 'Accept-Encoding': encoding };
    const response = await fetch(`${origin}/${file}`, { headers });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-encoding'), encoding);
    assert.equal(await response.text(), expected);
    const cached = await fetch(`${origin}/${file}`, { headers: { ...headers, 'If-None-Match': response.headers.get('etag') } });
    assert.equal(cached.status, 304);
    const head = await fetch(`${origin}/${file}`, { method: 'HEAD', headers });
    assert.equal(head.headers.get('content-length'), response.headers.get('content-length'));
    assert.equal(await head.text(), '');
  }
}
const identity = await fetch(origin, { headers: { 'Accept-Encoding': 'br;q=0, gzip;q=0' } });
assert.equal(identity.headers.get('content-encoding'), null);
assert.equal((await fetch(`${origin}/site.config.mjs`)).status, 404);
assert.equal((await fetch(`${origin}/docs/asset-manifest.json`)).status, 404);
assert.equal((await fetch(origin, { method: 'POST' })).status, 405);
console.log('PASS HTTP compression, decoded contents, ETags, HEAD, encoding quality and route boundaries');
