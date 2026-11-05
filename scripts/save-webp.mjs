import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../',import.meta.url));
const html = await readFile(path.join(root,'docs/references/.webp-output.html'),'utf8');
const payload = JSON.parse(html.match(/<pre id="results">([^<]+)<\/pre>/)?.[1] || '{}');
if (payload.error || !payload.results?.length) throw new Error(payload.error || 'Missing browser-encoded WebP output');
for (const result of payload.results) {
  if (!/^assets\/images\/(hero-bestsellers|hero-interior|thoro)-\d+\.webp$/.test(result.path)) throw new Error('Unexpected output path');
  const bytes = Buffer.from(result.data,'base64');
  if (bytes.subarray(0,4).toString() !== 'RIFF' || bytes.subarray(8,12).toString() !== 'WEBP') throw new Error('Invalid WebP output');
  await writeFile(path.join(root,result.path),bytes);
}
console.log(`Saved ${payload.results.length} WebP variants.`);
