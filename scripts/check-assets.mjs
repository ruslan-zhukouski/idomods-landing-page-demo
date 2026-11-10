// Verify source provenance and every delivery URL without external dependencies.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const json = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const manifest = await json('docs/asset-manifest.json');
const optimized = await json('docs/optimized-assets.json');
const destinations = await json('docs/destinations.json');
const decisions = await json('docs/phase-2-content-decisions.json');
const errors = [], references = new Set();
for (const asset of [...manifest.assets, ...optimized.records.map(record => ({ path: record.output, sha256: record.outputSha256, bytes: record.outputBytes }))]) {
  const data = await readFile(path.join(root, asset.path));
  if (!data.length || data.length !== asset.bytes || createHash('sha256').update(data).digest('hex') !== asset.sha256) errors.push(`Integrity: ${asset.path}`);
  if (asset.sourceNodeIds && !asset.sourceNodeIds.length) errors.push(`Missing source mapping: ${asset.path}`);
}
for (const file of ['index.html', 'styles/site.min.css']) {
  const content = await readFile(path.join(root, file), 'utf8');
  if (/figma\.com\/api\/mcp\/asset|docs\/references\//.test(content)) errors.push(`Reference-only artwork used in ${file}`);
  const urls = file.endsWith('.css')
    ? [...content.matchAll(/url\(["']?([^\)"']+)/g)].map(match => path.posix.join('styles', match[1]))
    : [...content.matchAll(/(?:assets|styles)\/[a-zA-Z0-9_./-]+/g)].map(match => match[0]);
  for (const url of urls) references.add(url);
}
for (const file of references) {
  try { if (!(await readFile(path.join(root, file))).length) errors.push(`Empty runtime file: ${file}`); }
  catch { errors.push(`Missing runtime file: ${file}`); }
}
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const routes = new Map(destinations.entries.map(entry => [entry.id, entry.href]));
for (const [id, decision] of Object.entries(decisions.decisions)) routes.set(id, decision.href);
const links = [...html.matchAll(/<a\b[^>]*>/g)].map(([tag]) => ({
  id: tag.match(/data-destination="([^"]+)"/)?.[1] || null,
  href: tag.match(/href="([^"]+)"/)?.[1].replaceAll('&amp;', '&'),
}));
for (const link of links) {
  if (!link.href || link.href === '#' || (link.id ? routes.get(link.id) !== link.href : !['#main', routes.get('home')].includes(link.href))) errors.push(`Unreviewed link: ${JSON.stringify(link)}`);
}
await writeFile(path.join(root, 'docs/phase-6-destinations-report.json'), JSON.stringify({
  checkedOn: new Date().toISOString(), scope: 'Effective generated anchors compared with the captured official route inventory and explicit content decisions; no authenticated actions or live downstream health checks.',
  sourceCapturedOn: destinations.capturedOn, links, plainLabels: decisions.unresolvedAsPlainText,
  tiktok: decisions.decisions.tiktok, search: destinations.search,
}, null, 2) + '\n');
const result = { checkedOn: new Date().toISOString(), sourceAssets: manifest.assets.length, deliveryCopies: optimized.records.length, runtimeReferences: references.size, errors };
await writeFile(path.join(root, 'docs/phase-6-assets-report.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
