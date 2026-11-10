// Capture a pre-refactor baseline with QA_BASELINE=1, then compare the same states.
// Screenshots stay in TEMP; only the compact results are committed.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createBrowserSession } from './browser-session.mjs';

const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const baseline = process.env.QA_BASELINE === '1';
const directory = process.env.QA_SNAPSHOT_DIR || path.join(os.tmpdir(), 'idomods-refactor-snapshots');
const browser = await createBrowserSession();
const { send, run, waitFor } = browser;
const checks = [];
const check = (name, passed, details) => {
  checks.push({ name, passed, ...(details === undefined ? {} : { details }) });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) process.exitCode = 1;
};

await mkdir(directory, { recursive: true });
try {
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  for (const enabled of (process.env.QA_NO_JS_ONLY === '1' ? [false] : [true, false])) {
    await send('Emulation.setScriptExecutionDisabled', { value: !enabled });
    for (const [width, height] of [[320, 812], [375, 812], [600, 900], [768, 900], [844, 390], [900, 900], [1114, 900], [1440, 1080], [1600, 1080], [1920, 1080]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await send('Page.navigate', { url: origin });
      await waitFor(`document.readyState === 'complete' ${enabled ? "&& !!document.querySelector('.carousel-ready')" : ''}`);
      if (!baseline && width === 375) {
        const content = await run(`(() => {
          const meta = name => document.querySelector('meta[name="' + name + '"], meta[property="' + name + '"]')?.content;
          const levels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(heading => Number(heading.tagName[1]));
          return {
            headings: document.querySelectorAll('h1').length === 1 && levels.every((level, i) => i === 0 || level <= levels[i - 1] + 1),
            landmarks: document.querySelectorAll('main').length === 1 && !!document.querySelector('footer nav[aria-label]'),
            metadata: !!document.title && ['description', 'robots', 'og:title', 'og:description', 'og:image', 'og:type'].every(name => !!meta(name)),
            namedSocials: [...document.querySelectorAll('.social-link')].every(link => !!link.getAttribute('aria-label')),
            safeWindows: [...document.querySelectorAll('a[target="_blank"]')].every(link => /(?:noopener|noreferrer)/.test(link.rel)),
            reservedImages: [...document.images].every(image => image.hasAttribute('alt') && image.hasAttribute('width') && image.hasAttribute('height')),
            lazyBelowFold: [...document.querySelectorAll('.showcase img, .site-footer img')].every(image => image.loading === 'lazy'),
            criticalImage: document.querySelector('.hero-slide img').loading === 'eager' && document.querySelector('.hero-slide img').fetchPriority === 'high',
            oneStylesheet: document.querySelectorAll('link[rel="stylesheet"]').length === 1,
            crawlableHeading: getComputedStyle(document.querySelector('#showcase-title')).display !== 'none' && document.querySelector('#showcase-title').classList.contains('visually-hidden'),
          };
        })()`);
        check(`${enabled ? 'JS' : 'static'}: semantics, SEO, image priorities and link labels`, Object.values(content).every(Boolean), content);
      }
      await run(`(async () => {
        for (const image of document.images) image.loading = 'eager';
        await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
        await document.fonts.ready;
        ${enabled ? 'await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));' : ''}
      })()`);
      if (enabled) {
        await run("document.querySelector('.light-section').scrollIntoView()");
        await waitFor("document.querySelector('.light-section').dataset.shaderState !== 'deferred'");
        await run('window.scrollTo(0, 0)');
      }
      const key = `${enabled ? 'js' : 'static'}-${width}`;
      const layout = await run(`(() => {
        const selectors = ['.site-header', '.brand', '.primary-nav', '.search-form', '.header-actions', '.hero', '.hero-content', '.hero-controls', '.review-badge', '.showcase', '.benefits', '.promo-card', '.card-copy', '.card-media', '.light-section', '.light-content', '.site-footer', '.footer-top', '.footer-links', '.footer-bottom', '.footer-caption'];
        return { overflow: document.documentElement.scrollWidth > innerWidth, boxes: selectors.flatMap(selector => [...document.querySelectorAll(selector)].map(element => ({ selector, ...element.getBoundingClientRect().toJSON() }))) };
      })()`);
      const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      if (baseline) {
        await writeFile(path.join(directory, `${key}.json`), JSON.stringify(layout));
        await writeFile(path.join(directory, `${key}.png`), Buffer.from(capture.data, 'base64'));
        console.log(`Captured ${key}`);
        continue;
      }
      const previous = JSON.parse(await readFile(path.join(directory, `${key}.json`), 'utf8'));
      check(`${key}: unchanged layout without horizontal overflow`, !layout.overflow && JSON.stringify(layout.boxes) === JSON.stringify(previous.boxes));
      const before = (await readFile(path.join(directory, `${key}.png`))).toString('base64');
      // Decode screenshots in Chrome to compare pixels, independent of PNG encoding.
      const pixels = await run(`(async () => {
        const images = await Promise.all(${JSON.stringify([before, capture.data])}.map(async data => {
          const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode(); return image;
        }));
        if (images[0].width !== images[1].width || images[0].height !== images[1].height) return { sameSize: false };
        const canvas = document.createElement('canvas'); canvas.width = images[0].width; canvas.height = images[0].height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        const frames = images.map(image => { context.drawImage(image, 0, 0); return context.getImageData(0, 0, canvas.width, canvas.height).data; });
        let different = 0, maximum = 0, sum = 0;
        const bands = {};
        for (let i = 0; i < frames[0].length; i++) {
          const difference = Math.abs(frames[0][i] - frames[1][i]);
          if (difference) { different++; const band = Math.floor(i / 4 / canvas.width / 100) * 100; bands[band] = (bands[band] || 0) + 1; }
          sum += difference; maximum = Math.max(maximum, difference);
        }
        return { sameSize: true, differentChannels: different, maximumDifference: maximum, meanDifference: sum / frames[0].length, bands };
      })()`);
      // Source RGBA equality is recorded in optimized-assets.json. Chrome's
      // scaled PNG/WebP sampling differs at sparse lamp edges. Keep the page's
      // average error below 0.01 of one 8-bit channel value, with bounded peaks.
      check(`${key}: equivalent rasterization`, pixels.sameSize && pixels.meanDifference <= 0.01 && pixels.maximumDifference <= 32, pixels);
      await writeFile(path.join(directory, `${key}-after.png`), Buffer.from(capture.data, 'base64'));
    }
  }
  if (!baseline) await writeFile(new URL('../docs/refactor-browser-report.json', import.meta.url), JSON.stringify({
    originalCommit: '09f2f42', cache: 'disabled', motion: 'reduced',
    rasterTolerance: { maximumMeanChannelError: 0.01, maximumChannelError: 32 }, checks,
  }, null, 2) + '\n');
} finally { browser.close(); }
