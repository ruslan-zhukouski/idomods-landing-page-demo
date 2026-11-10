// Real native WebGL integration checks; Chrome CDP, without test dependencies.
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const chrome = process.env.CHROME_PATH || path.join(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe');
const profile = await mkdtemp(path.join(os.tmpdir(), 'idomods-shader-qa-'));
// SwiftShader makes GPU pixel comparisons repeatable in headless CI. Production
// uses the browser's native hardware WebGL implementation with no special flags.
const browser = spawn(chrome, ['--headless', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const checks = [], events = [];
let socket;
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch { await sleep(100); }
  }
  if (!port) throw Error('Chrome did not start');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let id = 0; const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const p = pending.get(message.id); pending.delete(message.id);
      if (message.error) p.reject(Error(message.error.message)); else p.resolve(message.result);
    } else events.push(message);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params })); });
  const run = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const check = (name, passed, details) => { checks.push({ name, passed, ...(details === undefined ? {} : { details }) }); console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`); if (!passed) process.exitCode = 1; };
  const size = (width, height = 900, deviceScaleFactor = 1) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile: false });
  const waitFor = async expression => {
    for (let i = 0; i < 100; i++) { if (await run(expression)) return; await sleep(100); }
    throw Error(`Timed out: ${expression}`);
  };
  const load = async () => {
    await send('Page.navigate', { url: origin });
    await waitFor(`document.readyState==='complete' && !!document.querySelector('.light-section')?.dataset.shaderState`);
    await run('document.fonts.ready');
  };
  const show = async () => { await run(`document.querySelector('.light-section').scrollIntoView({block:'start'})`); await sleep(200); };
  const draws = () => run('shaderQA.draws.length');
  const phase = () => run('shaderQA.draws.at(-1)?.phase');
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    (()=>{
    window.shaderQA={draws:[],deleted:{buffer:0,program:0,shader:0}};
    const names=new WeakMap(), proto=WebGLRenderingContext.prototype;
    const location=proto.getUniformLocation, uniform=proto.uniform2f, draw=proto.drawArrays;
    proto.getUniformLocation=function(program,name){const value=location.call(this,program,name);if(value)names.set(value,name);return value};
    proto.uniform2f=function(location,x,y){if(names.get(location)==='u_phase')this.qaPhase=[x,y];return uniform.call(this,location,x,y)};
    proto.drawArrays=function(...args){if(this.canvas.classList.contains('light-canvas'))shaderQA.draws.push({time:performance.now(),phase:this.qaPhase});return draw.apply(this,args)};
    for(const [method,key]of [['deleteBuffer','buffer'],['deleteProgram','program'],['deleteShader','shader']]){const original=proto[method];proto[method]=function(...args){shaderQA.deleted[key]++;return original.apply(this,args)}};
    })();
  ` });
  await size(1920); await load(); await sleep(300);
  const initial = await draws(); await sleep(300);
  check('Offscreen shader draws a stable initial frame and suspends', initial === await draws() && await run(`document.querySelector('.light-section').dataset.shaderState==='suspended'`));
  await show();
  check('Real WebGL canvas initializes; HTML heading and CTA remain unique', await run(`(()=>{const s=document.querySelector('.light-section'),c=s.querySelector('canvas');return s.classList.contains('shader-ready') && s.dataset.shaderState==='running' && c.getAttribute('aria-hidden')==='true' && c.tabIndex===-1 && getComputedStyle(c).pointerEvents==='none' && s.querySelectorAll('h2').length===1 && s.querySelectorAll('a').length===1 && !s.querySelector('button').hidden})()`));
  // Test the actual compiled shader at exact boundary phases, including velocity.
  const pixels = await run(`(async()=>{
    const {createLightRenderer}=await import('/scripts/shader-renderer.js');
    const canvas=document.createElement('canvas'),renderer=createLightRenderer(canvas),gl=canvas.getContext('webgl');renderer.resize(192,100,1);
    function sample(t){renderer.draw(t);const bytes=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes}
    const frames=[0,25000,50000,24900,100,49900,50100,6250,12500,18750].map(sample);
    const diff=(a,b)=>a.reduce((sum,n,i)=>sum+Math.abs(n-b[i]),0)/a.length;
    let velocity=0;for(let i=0;i<frames[0].length;i++)velocity+=Math.abs((frames[0][i]-frames[3][i])-(frames[4][i]-frames[0][i]));
    const result={boundary1:diff(frames[0],frames[1]),boundary2:diff(frames[0],frames[2]),beforeRepeat:diff(frames[3],frames[5]),afterRepeat:diff(frames[4],frames[6]),boundaryVelocityError:velocity/frames[0].length,quarterChanges:frames.slice(7).map(f=>diff(frames[0],f)),glError:gl.getError()};
    renderer.destroy();return result;
  })()`);
  check('GPU pixels repeat exactly at 0/25/50s with continuous boundary motion', pixels.boundary1 === 0 && pixels.boundary2 === 0 && pixels.beforeRepeat === 0 && pixels.afterRepeat === 0 && pixels.boundaryVelocityError < 0.25 && pixels.quarterChanges.every(d => d > 0.2) && pixels.glError === 0, pixels);
  await run(`window.stationary=JSON.stringify([...document.querySelectorAll('.light-content h2,.light-content a,.light-content p')].map(e=>e.getBoundingClientRect().toJSON()));shaderQA.draws=[]`);
  console.log('Observing two uninterrupted 25-second cycles...');
  // Two real cycles, not accelerated timers. Each wait stays below 60 seconds.
  await sleep(26000); console.log('First complete cycle observed; checking the second...'); await sleep(26000);
  const cycle = await run(`(()=>{const d=shaderQA.draws;let travel=0,maxStep=0;for(let i=1;i<d.length;i++){const a=Math.atan2(d[i-1].phase[1],d[i-1].phase[0]),b=Math.atan2(d[i].phase[1],d[i].phase[0]);const delta=(b-a+Math.PI*3)%(Math.PI*2)-Math.PI;travel+=delta;maxStep=Math.max(maxStep,Math.abs(delta))}return {frames:d.length,duration:d.at(-1).time-d[0].time,cycles:travel/(Math.PI*2),maxPhaseStep:maxStep,stationary:stationary===JSON.stringify([...document.querySelectorAll('.light-content h2,.light-content a,.light-content p')].map(e=>e.getBoundingClientRect().toJSON()))}})()`);
  check('Two real 25s cycles run without phase jumps or HTML movement', cycle.cycles >= 2 && cycle.cycles < 2.2 && cycle.maxPhaseStep < 0.12 && cycle.stationary && cycle.frames / (cycle.duration / 1000) < 32, cycle);
  await run(`document.querySelector('.light-pause').focus()`);
  const space = async () => { await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 }); await sleep(100); };
  await space(); const paused = await draws(), pausePhase = await phase(); await sleep(400);
  check('Space pauses rendering with a focused, correctly labeled resume button', paused === await draws() && await run(`document.activeElement.matches('.light-pause') && document.activeElement.textContent==='Wznów animację tła' && getComputedStyle(document.activeElement).outlineStyle!=='none'`));
  await space(); await sleep(200);
  check('Space resumes from the preserved phase while focus remains', await draws() > paused && distance(pausePhase, await phase()) < 0.15);
  await run('window.scrollTo(0,0)'); await sleep(200); const offscreen = await draws(), offPhase = await phase(); await sleep(400);
  check('Scrolling offscreen cancels drawing', offscreen === await draws());
  await show();
  check('Returning onscreen resumes without catching up', await draws() > offscreen && distance(offPhase, await phase()) < 0.12);
  await run(`Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))`);
  const hidden = await draws(), hiddenPhase = await phase(); await sleep(400);
  check('Hidden document cancels drawing', hidden === await draws());
  await run(`delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))`); await sleep(200);
  check('Visibility return preserves active phase', await draws() > hidden && distance(hiddenPhase, await phase()) < 0.12);
  await run(`document.querySelector('.light-pause').click()`);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await sleep(150);
  const reduced = await draws(); await sleep(300);
  check('Live reduced motion freezes canvas and disables motion control', reduced === await draws() && await run(`document.querySelector('.light-pause').disabled && document.querySelector('.light-section').dataset.shaderState==='reduced'`));
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }); await sleep(200);
  check('Explicit user pause persists across preference changes', reduced === await draws() && await run(`document.querySelector('.light-section').dataset.shaderState==='paused'`));
  const lossSupported = await run(`window.loss=document.querySelector('.light-canvas').getContext('webgl').getExtension('WEBGL_lose_context');if(loss)loss.loseContext();!!loss`);
  if (!lossSupported) throw Error('WEBGL_lose_context unavailable for required recovery check');
  await waitFor(`document.querySelector('.light-section').dataset.shaderState==='fallback'`);
  check('Actual context loss reveals fallback and leaves CTA reachable', await run(`(()=>{const s=document.querySelector('.light-section'),a=s.querySelector('a'),r=a.getBoundingClientRect();return !s.classList.contains('shader-ready') && s.querySelector('button').hidden && a.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()`));
  await run('loss.restoreContext()'); await waitFor(`document.querySelector('.light-section').classList.contains('shader-ready')`);
  const restored = await draws(); await sleep(200);
  check('Context restoration rebuilds resources and preserves user pause', restored === await draws() && await run(`document.querySelector('.light-section').dataset.shaderState==='paused' && document.querySelector('.light-pause').textContent==='Wznów animację tła'`));
  await run(`document.querySelector('.light-pause').click()`); await sleep(150);
  check('Restored shader resumes successfully', await draws() > restored);
  const layouts = [];
  for (const [width, height, dpr] of [[1920,900,1],[1280,800,2],[768,1024,2],[375,812,3],[320,568,3],[844,390,2],[2560,1440,2]]) {
    await size(width, height, dpr); await show();
    layouts.push(await run(`(()=>{const s=document.querySelector('.light-section'),r=s.getBoundingClientRect(),c=s.querySelector('canvas'),b=c.getBoundingClientRect(),content=s.querySelector('.light-content').getBoundingClientRect(),p=s.querySelector('button').getBoundingClientRect();return {width:innerWidth,dpr:devicePixelRatio,cssWidth:b.width,cssHeight:b.height,bufferWidth:c.width,bufferHeight:c.height,sectionWidth:r.width,sectionHeight:r.height,overflow:document.documentElement.scrollWidth>innerWidth,contentFits:content.left>=0 && content.right<=innerWidth && content.top>=r.top && content.bottom<p.top,buttonFits:p.left>=0&&p.right<=innerWidth&&p.height>=44}})()`));
    if ([1920,375].includes(width)) {
      await run(`document.querySelector('.light-pause').click();document.activeElement.blur()`);
      const clip = await run(`(()=>{const r=document.querySelector('.light-section').getBoundingClientRect();return {x:0,y:r.top+scrollY,width:r.width,height:r.height,scale:1}})()`);
      const capture = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
      await writeFile(new URL(`../docs/references/phase-5-${width}.png`, import.meta.url), Buffer.from(capture.data, 'base64'));
      await run(`document.querySelector('.light-pause').click()`);
    }
  }
  check('Desktop/mobile resize keeps full canvas, readable content and bounded DPR/pixels', layouts.every(r => !r.overflow && r.contentFits && r.buttonFits && Math.abs(r.cssWidth - r.sectionWidth) < 1 && Math.abs(r.cssHeight - r.sectionHeight) < 1 && r.bufferWidth <= Math.round(r.cssWidth * 1.5) && r.bufferHeight <= Math.round(r.cssHeight * 1.5) && r.bufferWidth * r.bufferHeight < 1603000), layouts);
  await size(1920); await show();
  const cleanup = await run(`(async()=>{const {initShaderSection}=await import('/scripts/shader-section.js');const a=initShaderSection(),b=initShaderSection();a();return {same:a===b,deleted:shaderQA.deleted,state:document.querySelector('.light-section').dataset.shaderState,hidden:document.querySelector('.light-pause').hidden}})()`);
  const cleaned = await draws(); await sleep(300); await size(1280); await sleep(150);
  check('Idempotent initialization and cleanup release resources/listeners/RAF', cleanup.same && cleanup.deleted.buffer >= 2 && cleanup.deleted.program >= 2 && cleanup.deleted.shader >= 4 && !cleanup.state && cleanup.hidden && cleaned === await draws(), cleanup);
  await run(`import('/scripts/shader-section.js').then(m=>m.initShaderSection())`); await sleep(200);
  check('Shader can initialize again after cleanup', await draws() > cleaned);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await load(); await show(); const initialReduced = await draws(); await sleep(300);
  check('Reduced motion before load produces one stable composition', initialReduced === await draws() && await run(`document.querySelector('.light-section').classList.contains('shader-ready') && document.querySelector('.light-pause').disabled`));
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  for (const failure of ['unavailable', 'compile']) {
    const source = failure === 'unavailable' ? `const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:get.call(this,type,...args)}` : `const get=WebGLRenderingContext.prototype.getShaderParameter;WebGLRenderingContext.prototype.getShaderParameter=function(shader,p){return p===this.COMPILE_STATUS?false:get.call(this,shader,p)}`;
    const injection = await send('Page.addScriptToEvaluateOnNewDocument', { source });
    await load(); await show();
    check(`${failure} WebGL retains CSS background, content and CTA`, await run(`(()=>{const s=document.querySelector('.light-section');return s.dataset.shaderState==='fallback' && !s.classList.contains('shader-ready') && s.querySelector('button').hidden && getComputedStyle(s.querySelector('.light-background')).backgroundImage!=='none' && !!s.querySelector('a').href && s.querySelector('h2').textContent.includes('wyjątkowe światło')})()`));
    if (failure === 'compile') check('Compilation failure releases partially allocated GPU resources', await run('shaderQA.deleted.program===1 && shaderQA.deleted.shader===1'));
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injection.identifier });
  }
  await send('Emulation.setScriptExecutionDisabled', { value: true });
  await send('Page.navigate', { url: origin }); await sleep(700);
  check('No-JavaScript fallback keeps semantic content and hides motion control', await run(`document.querySelector('.light-pause').hidden && getComputedStyle(document.querySelector('.light-canvas')).display==='none' && document.querySelector('.light-content a').textContent==='Kup teraz'`));
  const errors = events.filter(e => e.method === 'Runtime.exceptionThrown').map(e => e.params.exceptionDetails);
  const http = events.filter(e => e.method === 'Network.responseReceived' && e.params.response.status >= 400).map(e => e.params.response.url);
  check('No runtime exceptions or failed HTTP responses', !errors.length && !http.length, { errors, http });
  await writeFile(new URL('../docs/phase-5-browser-report.json', import.meta.url), JSON.stringify({ renderer: 'Chrome headless / SwiftShader (software WebGL)', checks }, null, 2) + '\n');
} finally { if (socket?.readyState === 1) socket.close(); browser.kill(); }
