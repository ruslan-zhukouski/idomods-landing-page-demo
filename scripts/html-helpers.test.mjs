import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHtmlHelpers } from './html-helpers.mjs';
import { minifyCss } from './build-styles.mjs';

const manifest = { assets: [{ path: 'assets/images/example-480.jpg', width: 480, height: 270, sourceNodeIds: ['1:1'] }] };
const { img, link, picture } = createHtmlHelpers(manifest, new Map([['store', 'https://example.com/?a=1&b=2']]));

test('new-window links are isolated and attribute values are escaped', () => {
  const html = link('store', 'Store', '', { target: '_blank', accessibleLabel: 'Store "home"' });
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /href="https:\/\/example.com\/\?a=1&amp;b=2"/);
  assert.match(html, /aria-label="Store &quot;home&quot;"/);
  assert.doesNotMatch(link('store', 'Store'), /target=|rel=/);
});

test('image defaults reserve space and defer optional assets; critical images stay eager', () => {
  assert.match(img('assets/images/example-480.jpg'), /alt="" loading="lazy"/);
  const hero = picture('example', '100vw', { eager: true, alt: 'Lamp' });
  assert.match(hero, /width="480" height="270"/);
  assert.match(hero, /loading="eager" fetchpriority="high"/);
  assert.match(hero, /type="image\/webp"/);
  assert.throws(() => img('missing.png'), /Missing asset/);
});

test('CSS compaction preserves strings, URLs and required calc whitespace', () => {
  const result = minifyCss('/* note */ .x { content: "text ;}  text"; width: calc(100% - 2px); background: url("data:image/svg+xml;a  b"); }');
  assert.match(result, /"text ;}  text"/);
  assert.match(result, /calc\(100% - 2px\)/);
  assert.match(result, /"data:image\/svg\+xml;a  b"/);
  assert.doesNotMatch(result, /note/);
});
