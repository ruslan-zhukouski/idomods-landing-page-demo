// Installed Firefox via native WebDriver BiDi, independent of Playwright's build.
// Protocol reference: https://developer.mozilla.org/en-US/docs/Web/WebDriver/How_to/Create_BiDi_connection
import { mkdtemp, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const profile = await mkdtemp(path.join(os.tmpdir(), 'idomods-firefox-qa-'));
const executable = process.env.FIREFOX_PATH || path.join(process.env.ProgramFiles, 'Mozilla Firefox/firefox.exe');
const browser = spawn(executable, ['--headless', '--no-remote', '--profile', profile, '--remote-debugging-port', '0'], {
  windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let socket;
const report = { checkedOn: new Date().toISOString(), browser: 'Installed Firefox / native WebDriver BiDi', checks: [] };
const check = (name, passed, details) => {
  report.checks.push({ name, passed, ...(details === undefined ? {} : { details }) });
  console.log(`${passed ? 'PASS' : 'FAIL'} Firefox: ${name}`);
  if (!passed) process.exitCode = 1;
};
try {
  const endpoint = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Firefox BiDi endpoint did not start')), 20000);
    browser.once('error', reject);
    const read = chunk => {
      const match = chunk.toString().match(/WebDriver BiDi listening on (ws:\/\/127\.0\.0\.1:\d+)/);
      if (match) { clearTimeout(timeout); resolve(`${match[1]}/session`); }
    };
    browser.stdout.on('data', read); browser.stderr.on('data', read);
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let nextId = 0;
  const pending = new Map(), logs = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id) { if (message.method === 'log.entryAdded') logs.push(message.params); return; }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id); clearTimeout(request.timeout);
    if (message.type === 'error') request.reject(new Error(`${request.method}: ${message.error}: ${message.message}`));
    else request.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Firefox timed out: ${method}`)); }, 20000);
    pending.set(id, { resolve, reject, timeout, method }); socket.send(JSON.stringify({ id, method, params }));
  });
  const session = await send('session.new', { capabilities: {} });
  report.version = session.capabilities.browserVersion;
  const context = (await send('browsingContext.create', { type: 'tab' })).context;
  await send('session.subscribe', { events: ['log.entryAdded'] });
  const run = async expression => {
    const result = await send('script.evaluate', { expression: `JSON.stringify(${expression})`, target: { context }, awaitPromise: true });
    if (result.type !== 'success') throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.type === 'undefined' ? undefined : JSON.parse(result.result.value);
  };
  const waitFor = async expression => {
    for (let index = 0; index < 150; index++) { if (await run(expression)) return; await sleep(100); }
    throw new Error(`Firefox readiness: ${expression}`);
  };
  const key = value => send('input.performActions', { context, actions: [{ type: 'key', id: 'keyboard', actions: [{ type: 'keyDown', value }, { type: 'keyUp', value }] }] });
  const size = (width, height = 900) => send('browsingContext.setViewport', { context, viewport: { width, height }, devicePixelRatio: 1 });
  await size(1920, 1080);
  await send('browsingContext.navigate', { context, url: process.env.PREVIEW_URL || 'http://127.0.0.1:4173', wait: 'complete' });
  await waitFor("!!document.querySelector('.carousel-ready')");
  await run(`(() => { for (const image of document.images) image.loading = 'eager'; if (!document.querySelector('.hero-pause').disabled) document.querySelector('.hero-pause').click(); return true; })()`);
  await waitFor('[...document.images].every(image => image.naturalWidth > 0)');
  const layouts = [];
  for (const width of [320, 375, 390, 500, 699, 700, 768, 899, 900, 1024, 1113, 1114, 1199, 1200, 1280, 1440, 1599, 1600, 1920]) {
    await size(width); await sleep(60);
    layouts.push(await run(`({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, heroHeight: document.querySelector('.hero').getBoundingClientRect().height, controlsBottom: document.querySelector('.hero-controls').getBoundingClientRect().bottom, viewportHeight: innerHeight })`));
  }
  check('Acceptance and intermediate widths retain viewport hero without overflow', layouts.every(layout => layout.documentWidth <= layout.width && Math.abs(layout.heroHeight - layout.viewportHeight) <= 1 && layout.controlsBottom <= layout.viewportHeight + 1), layouts);
  await size(844, 390); await sleep(100);
  check('Landscape keeps progress and pause visible', await run("document.documentElement.scrollWidth <= innerWidth && document.querySelector('.hero-pause').getBoundingClientRect().bottom <= innerHeight"));
  await size(375, 812); await sleep(100);
  await key('\uE004');
  check('Native Tab reaches the skip link first', await run("document.activeElement.matches('.skip-link')"));
  await key('\uE007');
  check('Native Enter follows the skip link and focuses main', await run("document.activeElement.matches('main')"));
  await run("document.querySelector('.menu-toggle').focus()"); await key(' ');
  check('Native Space opens the disclosure', await run("document.querySelector('.menu-toggle').getAttribute('aria-expanded') === 'true' && !document.querySelector('.primary-nav').hidden"));
  await run("document.querySelector('.primary-nav a').focus()"); await key('\uE00C');
  check('Native Escape closes and restores focus', await run("document.activeElement.matches('.menu-toggle') && document.querySelector('.primary-nav').hidden"));
  await size(1920, 1080); await sleep(100);
  await run("document.querySelector('[data-lamp=beige]').focus()"); await key(' ');
  check('Native keyboard toggles lamp light', await run("document.querySelector('[data-lamp=beige]').getAttribute('aria-pressed') === 'true'"));
  await run("document.querySelector('.hero-arrow-right').focus()"); await key(' '); await sleep(900);
  check('Native slide navigation excludes inactive lamps', await run("document.querySelector('.hero').dataset.slide === '1' && document.querySelector('.lamp-regions').hidden && document.querySelector('.lamp-regions').inert"));
  await run("document.querySelector('.light-section').scrollIntoView()");
  await waitFor("document.querySelector('.light-section').dataset.shaderState !== 'deferred'");
  report.shaderState = await run("document.querySelector('.light-section').dataset.shaderState");
  check('Native shader or intentional fallback retains CTA', await run("!!document.querySelector('.light-content a').href && document.querySelector('.light-content').getBoundingClientRect().width > 0"));
  const errors = logs.filter(entry => entry.level === 'error');
  check('No console errors or uncaught exceptions', !errors.length, errors);
} catch (error) {
  check('Installed Firefox audit completed', false, error.stack);
} finally {
  socket?.close(); browser.kill();
  await writeFile(new URL('../docs/phase-6-firefox-report.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
}
