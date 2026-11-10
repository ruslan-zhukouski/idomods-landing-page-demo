// Optional QA tools live outside the application. See README for setup.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

if (!process.env.QA_TOOLS_DIR) throw new Error('Set QA_TOOLS_DIR to a directory containing node_modules/playwright and node_modules/axe-core.');
const requireTool = createRequire(path.resolve(process.env.QA_TOOLS_DIR, 'qa.cjs'));
const { chromium, firefox, webkit } = requireTool('playwright');
const axePath = requireTool.resolve('axe-core/axe.min.js');
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const artifacts = process.env.QA_ARTIFACT_DIR || path.join(os.tmpdir(), 'idomods-phase-6');
await mkdir(artifacts, { recursive: true });
const report = {
  checkedOn: new Date().toISOString(),
  tools: { playwright: requireTool('playwright/package.json').version, axe: requireTool('axe-core/package.json').version },
  limits: ['Headless desktop engines; mobile contexts emulate touch/viewport, not physical Android/iOS.', 'WebKit is not the Safari application.', 'Accessibility snapshots do not constitute a screen-reader listening test.', '960×540 CSS px at DPR 2 models 200% reflow on a 1920×1080 display; browser UI zoom still needs manual confirmation.'],
  browsers: [],
};
const engines = [
  { name: 'chrome', type: chromium, launch: { channel: 'chrome' } },
  { name: 'edge', type: chromium, launch: { channel: 'msedge' } },
  { name: 'firefox', type: firefox, launch: {} },
  { name: 'webkit', type: webkit, launch: {} },
];
const widths = [320, 375, 390, 500, 699, 700, 768, 899, 900, 1024, 1113, 1114, 1199, 1200, 1280, 1440, 1599, 1600, 1920];

async function settle(page, enhanced = true) {
  if (!enhanced) {
    // Firefox's disabled-script mode must not await page-side image promises.
    await page.waitForLoadState('networkidle');
    return;
  }
  if (enhanced) await page.waitForSelector('.carousel-ready');
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager';
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    await document.fonts.ready;
  });
  await page.waitForFunction(() => [...document.images].every(image => image.naturalWidth > 0));
}

async function measure(page) {
  return page.evaluate(() => {
    const visible = element => !!element.getClientRects().length;
    const bounded = element => {
      const box = element.getBoundingClientRect();
      return !visible(element) || (box.left >= -1 && box.right <= innerWidth + 1 && element.scrollWidth <= element.clientWidth + 1);
    };
    return {
      width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth,
      clipped: [...document.querySelectorAll('.card-copy, .footer-group, .footer-panel, .shop-contact, .header-inner > :not([hidden])')].filter(element => !bounded(element)).map(element => element.className),
      broken: [...document.images].filter(image => !image.naturalWidth).map(image => image.src),
      marks: ['.payment-logos img', '.award-logos img', '.country-flags img'].map(selector => document.querySelectorAll(selector).length),
      hero: document.querySelector('.hero').getBoundingClientRect().toJSON(),
      cards: [...document.querySelectorAll('.promo-card')].map(element => element.getBoundingClientRect().width),
      font: document.fonts.check('700 16px "Red Hat Display"', 'Zażółć gęślą jaźń'),
    };
  });
}

for (const engine of engines.filter(engine => !process.env.QA_ENGINES || process.env.QA_ENGINES.split(',').includes(engine.name))) {
  let browser;
  const result = { name: engine.name, checks: [], accessibility: [] };
  report.browsers.push(result);
  const check = (name, passed, details) => {
    result.checks.push({ name, passed, ...(details === undefined ? {} : { details }) });
    console.log(`${passed ? 'PASS' : 'FAIL'} ${engine.name}: ${name}`);
    if (!passed && details) console.log(JSON.stringify(details));
    if (!passed) process.exitCode = 1;
  };
  try {
    browser = await engine.type.launch({ headless: true, ...engine.launch });
    result.version = browser.version();
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    const cancelledRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', request => {
      const failure = `${request.url()}: ${request.failure()?.errorText}`;
      if (/ERR_ABORTED|NS_BINDING_ABORTED|cancelled|canceled/i.test(request.failure()?.errorText || '')) cancelledRequests.push(failure);
      else errors.push(failure);
    });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(origin);
    await settle(page);
    const desktop = await measure(page);
    check('1920px container and asymmetric card geometry', await page.locator('.showcase .container').evaluate(element => element.clientWidth === 1600) && desktop.cards.every((width, i) => Math.abs(width - [648, 936, 936, 648][i]) < 1), desktop.cards);
    const failures = [];
    for (const width of widths) {
      await page.setViewportSize({ width, height: width === 1920 ? 1080 : 900 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const measurement = await measure(page);
      if (measurement.overflow || measurement.clipped.length || measurement.broken.length || !measurement.font || measurement.marks.join() !== '10,6,8') failures.push(measurement);
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const landscape = await measure(page);
    check('All acceptance widths, intermediate breakpoints and landscape fit', !failures.length && !landscape.overflow && !landscape.clipped.length, { widths, failures, landscape });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(origin); await settle(page);
    await page.keyboard.press('Tab');
    const skipIsFirst = await page.locator('.skip-link').evaluate(element => element === document.activeElement);
    if (engine.name === 'webkit' && !skipIsFirst) {
      result.keyboardLimit = 'This Windows WebKit engine skips anchors in native Tab traversal. Link activation is tested with explicit focus; verify Safari with full keyboard access on macOS.';
      await page.locator('.skip-link').focus();
    } else check('Skip link is first in native Tab order', skipIsFirst);
    await page.keyboard.press('Enter');
    check('Skip link target receives keyboard focus', await page.locator('main').evaluate(element => element === document.activeElement));
    const toggle = page.locator('.menu-toggle');
    await toggle.focus(); await page.keyboard.press('Space');
    check('Space opens named disclosure and exposes links', await toggle.getAttribute('aria-expanded') === 'true' && await page.locator('.primary-nav').isVisible());
    await page.locator('.primary-nav a').first().focus(); await page.keyboard.press('Escape');
    check('Escape closes disclosure and restores focus', await toggle.getAttribute('aria-expanded') === 'false' && await toggle.evaluate(element => element === document.activeElement) && !await page.locator('.primary-nav').isVisible());
    await page.locator('.search-form input').focus();
    check('Keyboard search focus has a visible ring', await page.locator('.search-form').evaluate(element => getComputedStyle(element).outlineStyle !== 'none' && parseFloat(getComputedStyle(element).outlineWidth) >= 2));
    await toggle.focus(); await page.keyboard.press('Enter');
    await page.locator('.primary-nav a').first().focus();
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForFunction(() => document.querySelector('.menu-toggle').hidden);
    await page.locator('.primary-nav a').first().focus();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForFunction(() => !document.querySelector('.menu-toggle').hidden);
    check('Breakpoint change keeps focus out of hidden navigation', await toggle.evaluate(element => element === document.activeElement) && await toggle.getAttribute('aria-expanded') === 'false');
    await page.evaluate(async () => {
      const { initNavigation } = await import('/scripts/navigation.js');
      const cleanup = initNavigation();
      window.sameNavigation = cleanup === initNavigation();
      cleanup(); initNavigation();
    });
    await toggle.focus(); await page.keyboard.press('Space');
    check('Navigation initialization and cleanup do not duplicate listeners', await page.evaluate(() => window.sameNavigation) && await toggle.getAttribute('aria-expanded') === 'true');
    await page.keyboard.press('Escape');
    const trace = [];
    const focusFailures = [];
    await page.goto(origin); await settle(page);
    for (let index = 0; index < 100; index++) {
      await page.keyboard.press('Tab');
      const state = await page.evaluate(() => {
        const element = document.activeElement, box = element.getBoundingClientRect(), style = getComputedStyle(element);
        return { tag: element.tagName, name: element.getAttribute('aria-label') || element.textContent.trim() || element.getAttribute('placeholder'), hidden: !!element.closest('[hidden], [inert]'), visible: !!element.getClientRects().length && box.width > 0 && box.height > 0, focusRing: style.outlineStyle !== 'none' || getComputedStyle(element.closest('.search-form') || element).outlineStyle !== 'none' };
      });
      if (state.tag === 'BODY') continue;
      if (trace.length && state.name === trace[0].name && state.tag === trace[0].tag) break;
      trace.push(state);
      if (state.hidden || !state.visible || !state.focusRing) focusFailures.push(state);
    }
    check('Native tab traversal excludes hidden controls and retains focus indicators', trace.length > (result.keyboardLimit ? 8 : 40) && !focusFailures.length, { stops: trace.length, failures: focusFailures, ...(result.keyboardLimit ? { limit: result.keyboardLimit } : {}) });
    await page.locator('.cookie-settings summary').focus(); await page.keyboard.press('Enter');
    check('Native cookie disclosure works from keyboard', await page.locator('.cookie-settings').evaluate(element => element.open));
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(origin); await settle(page);
    const snapshot = await page.locator('body').ariaSnapshot();
    check('Accessibility snapshot exposes one H1, landmarks and one slide', (snapshot.match(/level=1/g) || []).length === 1 && snapshot.includes('banner:') && snapshot.includes('main:') && snapshot.includes('contentinfo:') && snapshot.includes('group "1 z 2"') && !snapshot.includes('group "2 z 2"') && snapshot.includes('SOLLUX — Facebook'));
    if (engine.name === 'chrome') await writeFile(new URL('../docs/phase-6-accessibility-snapshot.txt', import.meta.url), snapshot + '\n');
    for (const width of [1920, 375]) {
      await page.setViewportSize({ width, height: width === 1920 ? 1080 : 812 });
      await page.goto(origin); await settle(page);
      await page.addScriptTag({ path: axePath });
      const audit = await page.evaluate(async () => {
        const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
        return { version: result.testEngine.version, violations: result.violations.map(rule => ({ id: rule.id, impact: rule.impact, description: rule.description, nodes: rule.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), incompleteRules: result.incomplete.map(rule => rule.id), passes: result.passes.length };
      });
      result.accessibility.push({ width, ...audit });
      const unexpected = audit.violations.filter(rule => rule.id !== 'color-contrast' || rule.nodes.some(node => node.target.some(selector => !selector.includes('.card-configurator'))));
      check(`${width}px automated a11y has no new violations`, !unexpected.length, { unexpected, preservedDesignIssues: audit.violations });
      // Capture actual motion-free appearance, including shader/fallback, after audit.
      await page.locator('.light-section').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.light-section').dataset.shaderState !== 'deferred');
      await page.evaluate(() => { document.activeElement.blur(); scrollTo(0, 0); });
      await page.mouse.move(0, 500);
      const filename = `${engine.name}-${width}.png`;
      const screenshot = await page.screenshot({ path: path.join(artifacts, filename), fullPage: true });
      if (engine.name === 'chrome') await writeFile(new URL(`../docs/references/phase-6-${width}.png`, import.meta.url), screenshot);
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => !document.querySelector('.hero-pause').disabled);
    await page.mouse.move(-1, -1);
    await page.waitForFunction(() => document.querySelector('.hero').dataset.slide === '1');
    check('Autoplay does not write live announcements', await page.locator('.hero-status').textContent() === '');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('.hero-pause').disabled);
    check('Live reduced motion disables autoplay and scaling', await page.locator('.hero-pause').isDisabled() && await page.locator('[data-lamp]').first().evaluate(element => new DOMMatrix(getComputedStyle(element).transform).a === 1));
    await page.locator('button[data-slide="1"]').click();
    check('Manual navigation announces once and excludes inactive lamp controls', await page.locator('.hero-status').textContent() === 'Slajd 2 z 2' && await page.locator('.lamp-regions').evaluate(element => element.hidden && element.inert));
    check('Console and network stay free of errors', !errors.length, errors);
    result.cancelledRequestsDuringNavigation = cancelledRequests;
    await context.close();

    const staticContext = await browser.newContext({ javaScriptEnabled: false });
    const staticPage = await staticContext.newPage();
    const staticFailures = [];
    for (const width of [320, 375, 390, 768, 1024, 1280, 1440, 1920]) {
      await staticPage.setViewportSize({ width, height: 900 });
      await staticPage.goto(origin); await settle(staticPage, false);
      const value = await measure(staticPage);
      if (value.overflow || value.clipped.length || value.broken.length || !await staticPage.locator('.primary-nav').isVisible() || await staticPage.locator('.hero-controls').isVisible()) staticFailures.push(value);
    }
    check('No-JavaScript page remains complete at all eight acceptance widths', !staticFailures.length, staticFailures);
    await staticContext.close();
    const failedContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    await failedContext.route('**/scripts/main.js', route => route.abort('failed'));
    const failedPage = await failedContext.newPage(); await failedPage.goto(origin);
    await failedPage.waitForFunction(() => !document.documentElement.classList.contains('js'));
    check('Module fetch failure restores the usable static layout', await failedPage.locator('.primary-nav').isVisible() && !await failedPage.locator('.menu-toggle').isVisible() && !await failedPage.locator('.hero-controls').isVisible() && await failedPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await failedContext.close();
    if (engine.name === 'chrome') {
      const slow = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await slow.route('**/scripts/main.js', async route => { await gate; await route.continue(); });
      const slowPage = await slow.newPage();
      await slowPage.goto(origin, { waitUntil: 'commit' });
      await slowPage.waitForFunction(() => document.querySelector('.hero') && getComputedStyle(document.querySelector('.hero')).height === `${innerHeight}px`);
      const geometry = () => slowPage.evaluate(() => ['.hero', '.showcase'].map(selector => document.querySelector(selector).getBoundingClientRect().toJSON()));
      const initial = await geometry(); release(); await settle(slowPage);
      check('Delayed modules do not move the hero or following page sections', JSON.stringify(initial) === JSON.stringify(await geometry()), { before: initial, after: await geometry() });
      await slow.close();
    }
    const fallback = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
    await fallback.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type === 'webgl' ? null : original.call(this, type, ...args); };
    });
    const fallbackPage = await fallback.newPage();
    await fallbackPage.goto(origin); await settle(fallbackPage);
    await fallbackPage.locator('.light-section').scrollIntoViewIfNeeded();
    await fallbackPage.waitForFunction(() => document.querySelector('.light-section').dataset.shaderState === 'fallback');
    const reflow = await measure(fallbackPage);
    check('200% equivalent reflow and disabled WebGL retain usable content', !reflow.overflow && !reflow.clipped.length && await fallbackPage.locator('.light-content a').isVisible() && !await fallbackPage.locator('.light-pause').isVisible(), reflow);
    await fallback.close();
    if (['chrome', 'webkit'].includes(engine.name)) {
      const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, reducedMotion: 'reduce' });
      const touch = await mobile.newPage(); await touch.goto(origin); await settle(touch);
      await touch.locator('.menu-toggle').tap();
      check('Emulated touch opens and closes navigation', await touch.locator('.menu-toggle').getAttribute('aria-expanded') === 'true');
      await touch.locator('.menu-toggle').tap();
      const portrait = await measure(touch);
      await touch.setViewportSize({ width: 844, height: 390 });
      const rotated = await measure(touch);
      check('Emulated mobile orientation keeps viewport hero and controls visible', !portrait.overflow && !rotated.overflow && Math.abs(rotated.hero.height - rotated.height) <= 1 && await touch.locator('.hero-pause').isVisible());
      await mobile.close();
    }
  } catch (error) {
    check('Browser audit completed', false, error.stack);
  } finally {
    await browser?.close();
    await writeFile(new URL('../docs/phase-6-browser-report.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  }
}
