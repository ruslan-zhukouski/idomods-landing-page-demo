// Local mobile CPU/render trace; not a hardware GPU or field CWV measurement.
import { writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createBrowserSession, sleep } from './browser-session.mjs';
const browser = await createBrowserSession({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const { send, run, waitFor, onEvent } = browser;
const report = { checkedOn: new Date().toISOString(), viewport: { width: 375, height: 812 }, cpuSlowdown: 4, renderer: 'Headless Chrome, software WebGL; warmed local assets', scenarios: [] };
const trace = [];
let complete;
const finished = new Promise(resolve => { complete = resolve; });
onEvent(event => {
  if (event.method === 'Tracing.dataCollected') trace.push(...event.params.value);
  if (event.method === 'Tracing.tracingComplete') complete();
});
try {
  report.browser = (await send('Browser.getVersion')).product;
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: process.env.PREVIEW_URL || 'http://127.0.0.1:4173' });
  await waitFor("!!document.querySelector('.carousel-ready')");
  await run(`(async () => { for (const image of document.images) image.loading = 'eager'; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); await document.fonts.ready; })()`);
  await send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await send('Performance.enable');
  await send('Tracing.start', { categories: 'toplevel,devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
  for (const scenario of ['hero', 'shader']) {
    await run(`document.querySelector('${scenario === 'hero' ? '.hero' : '.light-section'}').scrollIntoView()`);
    if (scenario === 'shader') await waitFor("document.querySelector('.light-section').dataset.shaderState === 'running'");
    await sleep(400);
    const before = await send('Performance.getMetrics');
    const start = await run('performance.timeOrigin + performance.now()');
    await run(`window.frameTimes = []; window.recordFrames = true; requestAnimationFrame(function record(time) { frameTimes.push(time); if (recordFrames) requestAnimationFrame(record); });`);
    await sleep(3500);
    const frames = await run(`recordFrames = false; frameTimes`);
    const after = await send('Performance.getMetrics');
    const delta = name => {
      const metric = list => list.metrics.find(metric => metric.name === name).value;
      return metric(after) - metric(before);
    };
    const intervals = frames.slice(1).map((time, index) => time - frames[index]).sort((a, b) => a - b);
    report.scenarios.push({ scenario, start, sampleMilliseconds: 3500, animationFrames: frames.length,
      medianFrameIntervalMs: intervals[Math.floor(intervals.length / 2)], p95FrameIntervalMs: intervals[Math.floor(intervals.length * .95)],
      intervalsOver50ms: intervals.filter(interval => interval > 50).length,
      layoutCount: delta('LayoutCount'), layoutMilliseconds: delta('LayoutDuration') * 1000,
      styleRecalculations: delta('RecalcStyleCount'), scriptMilliseconds: delta('ScriptDuration') * 1000, taskMilliseconds: delta('TaskDuration') * 1000,
      shaderState: await run("document.querySelector('.light-section').dataset.shaderState"),
    });
  }
  await send('Tracing.end'); await finished;
  const tracePath = path.join(os.tmpdir(), 'idomods-phase-6-trace.json');
  await writeFile(tracePath, JSON.stringify({ traceEvents: trace }));
  const tasks = trace.filter(event => /RunTask$/.test(event.name) && event.ph === 'X');
  const mainThreads = trace.filter(event => event.name === 'thread_name' && event.args.name === 'CrRendererMain');
  const isRendererMain = event => mainThreads.some(thread => thread.pid === event.pid && thread.tid === event.tid);
  report.trace = { file: 'System temporary directory: idomods-phase-6-trace.json', events: trace.length,
    rendererMainTasksOver50ms: tasks.filter(task => task.dur > 50000 && isRendererMain(task)).map(task => ({ durationMs: task.dur / 1000, process: task.pid, thread: task.tid })),
    otherThreadTaskCountOver50ms: tasks.filter(task => task.dur > 50000 && !isRendererMain(task)).length,
    layoutEvents: trace.filter(event => event.name === 'Layout').length,
  };
  await writeFile(new URL('../docs/phase-6-performance-report.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { browser.close(); }
