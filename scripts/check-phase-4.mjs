// Focused integration checks using Chrome's native protocol and real animations.
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const chrome = process.env.CHROME_PATH || path.join(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe');
const profile = await mkdtemp(path.join(os.tmpdir(), 'idomods-motion-qa-'));
const browser = spawn(chrome, ['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`], {windowsHide:true,stdio:'ignore'});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const checks = [], events = [];
let socket;
try {
  let port;
  for (let i=0; i<100; i++) {
    try { port = Number((await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]); break; } catch { await sleep(100); }
  }
  if (!port) throw Error('Chrome did not start');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, {once:true}));
  let id=0; const pending=new Map();
  socket.addEventListener('message', event => {
    const message=JSON.parse(event.data);
    if (message.id) {
      const p=pending.get(message.id); pending.delete(message.id);
      if (message.error) p.reject(Error(message.error.message)); else p.resolve(message.result);
    } else events.push(message);
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params}))});
  const run=async expression=>{
    const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const check=(name,passed,details)=>{checks.push({name,passed,...(details===undefined?{}:{details})});console.log(`${passed?'PASS':'FAIL'} ${name}`);if(!passed)process.exitCode=1;};
  const size=width=>send('Emulation.setDeviceMetricsOverride',{width,height:1080,deviceScaleFactor:1,mobile:false});
  const load=async (ready=true)=>{
    await send('Page.navigate',{url:origin});
    for(let i=0;i<100;i++){
      if(await run(`document.readyState==='complete' ${ready?"&& !!document.querySelector('.carousel-ready')":''}`))break;
      await sleep(100);
    }
    await run('document.fonts.ready');
  };
  const leave=async()=>{
    await run('document.activeElement.blur(); window.scrollTo(0,0)');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:-1,y:-1});
    await sleep(80);
  };
  const progress=()=>run(`document.querySelector('[aria-current] span').style.transform`);
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  await size(1920); await load(); await leave();
  check('Two decoded slides, one heading and one hero CTA',await run(`document.querySelectorAll('.hero-slide').length===2 && document.querySelectorAll('.hero h1').length===1 && document.querySelectorAll('.hero-content a').length===1 && [...document.querySelectorAll('.hero-slide img')].every(i=>i.naturalWidth>0)`));
  await run(`window.changes=[];new MutationObserver(()=>changes.push(performance.now())).observe(document.querySelector('.hero'),{attributes:true,attributeFilter:['data-slide']})`);
  await sleep(6600);
  const times=await run('changes');
  check('Autoplay transition starts are 3000ms apart',times.length>=2 && Math.abs(times[1]-times[0]-3000)<100,times);
  await run(`document.querySelector('.hero-arrow-right').click()`);
  const motion=await run(`document.querySelector('.hero').getAnimations({subtree:true}).map(a=>({duration:a.effect.getTiming().duration,properties:Object.keys(a.effect.getKeyframes()[0])}))`);
  check('600ms opacity fades and 800ms image scale',motion.filter(a=>a.duration===600).length===2 && motion.some(a=>a.duration===800),motion);
  await sleep(850);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:500,y:500});
  await sleep(80); const hovered=await progress(); await sleep(400);
  check('Hover pauses the shared progress clock',hovered===await progress());
  await leave();
  await run(`document.querySelector('.hero-content a').focus()`);
  await sleep(80); const focused=await progress(); await sleep(400);
  check('Keyboard focus pauses autoplay',focused===await progress());
  await run(`document.querySelector('.hero-pause').click()`); await leave();
  const paused=await progress(); await sleep(400);
  check('Explicit pause persists after hover and focus clear',paused===await progress());
  await run(`document.querySelector('.hero-pause').click()`); await leave();
  await sleep(150); check('Explicit resume restarts progress',paused!==await progress());
  await run(`document.querySelector('.showcase').scrollIntoView()`); await sleep(150);
  const offscreen=await progress(); await sleep(400);
  check('Offscreen hero pauses without a catch-up transition',offscreen===await progress());
  await leave();
  // Synthetic visibility event exercises the actual handler; headless Chrome
  // does not reproduce an operating-system tab switch consistently.
  await run(`Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))`);
  const hidden=await progress(); await sleep(350);
  check('Hidden-document handler freezes progress',hidden===await progress());
  await run(`delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))`);
  await run(`for(let i=0;i<21;i++)document.querySelector('.hero-arrow-right').click()`);
  await sleep(900);
  check('Rapid navigation settles to exactly one visible image',await run(`(()=>{const slides=[...document.querySelectorAll('.hero-slide')];return slides.filter(s=>getComputedStyle(s).opacity==='1').length===1 && slides.filter(s=>getComputedStyle(s).opacity==='0').length===1 && document.querySelector('.hero').getAnimations({subtree:true}).length===0})()`));
  await run(`document.querySelector('[data-slide="0"]').click()`); await sleep(850);
  await run(`document.querySelector('[data-lamp="beige"]').focus()`);
  await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
  await sleep(700);
  const lampState=await run(`(()=>{const b=document.querySelector('[data-lamp="beige"]');return {pressed:b.getAttribute('aria-pressed'),opacity:getComputedStyle(b,'::before').opacity,focused:document.activeElement===b,hidden:b.parentElement.hidden}})()`);
  check('Native keyboard lamp activation reveals warm glow',lampState.pressed==='true' && lampState.opacity==='1',lampState);
  await run(`document.querySelector('[data-slide="1"]').click()`); await sleep(850);
  check('Inactive lamps are hidden, inert and reset',await run(`document.querySelector('.lamp-regions').hidden && document.querySelector('.lamp-regions').inert && [...document.querySelectorAll('[data-lamp]')].every(b=>b.getAttribute('aria-pressed')==='false')`));
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await sleep(100); await leave(); const reducedProgress=await progress(); await sleep(350);
  check('Live reduced-motion change stops autoplay',reducedProgress===await progress());
  await run(`document.querySelector('[data-slide="0"]').click()`);
  check('Reduced-motion manual changes are instant and retain lamps',await run(`document.querySelector('.hero').dataset.slide==='0' && !document.querySelector('.lamp-regions').hidden && document.querySelector('.hero').getAnimations({subtree:true}).length===0`));
  await load(); await leave();
  const loadedReduced=await progress(); await sleep(350);
  check('Reduced motion is respected before load',loadedReduced===await progress());
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  // Desktop header opacity layers and isolated card interactions.
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:800,y:40}); await sleep(300);
  check('Desktop hover crossfades header to opaque white/dark',await run(`(()=>{const h=document.querySelector('header');return getComputedStyle(h,'::before').opacity==='1' && getComputedStyle(h.querySelector('.header-face-dark')).opacity==='1' && getComputedStyle(h.querySelector('.header-face-light')).opacity==='0'})()`));
  await leave(); await sleep(300);
  check('Desktop pointer leave restores transparent/white header',await run(`getComputedStyle(document.querySelector('header'),'::before').opacity==='0'`));
  await run(`document.querySelector('.brand').focus()`); await sleep(300);
  check('Desktop keyboard focus also crossfades header',await run(`getComputedStyle(document.querySelector('header'),'::before').opacity==='1'`));
  await run(`document.activeElement.blur();document.querySelector('.promo-card a').focus()`); await sleep(550);
  check('Only focused card media scales; gray button layer is visible',await run(`(()=>{const cards=[...document.querySelectorAll('.promo-card')];return getComputedStyle(cards[0].querySelector('.card-media > *')).transform==='matrix(1.1, 0, 0, 1.1, 0, 0)' && getComputedStyle(cards[1].querySelector('.card-media > *')).transform==='none' && getComputedStyle(cards[0].querySelector('.button'),'::before').opacity==='1'})()`));
  const audit=await run(`(()=>{const result=[];for(const e of document.querySelectorAll('*'))for(const pseudo of [null,'::before','::after']){const s=getComputedStyle(e,pseudo);if(s.transitionDuration.split(',').some(t=>parseFloat(t)>0))result.push({element:e.className,pseudo,property:s.transitionProperty,duration:s.transitionDuration})}return result})()`);
  check('DOM transition audit permits only opacity and transform',audit.every(rule=>rule.property.split(',').every(p=>['opacity','transform'].includes(p.trim()))),audit);
  const layout=[];
  for (const width of [1920,1600,1599,1440,1280,1200,1024,900,899,768,700,699,600,599,390,375,320]) {
    await size(width); await load();
    await run(`document.querySelector('[data-slide="0"]').click();document.querySelector('.hero-pause').focus()`); await sleep(850);
    const result=await run(`(()=>{const h=document.querySelector('header');return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,lamps:[...document.querySelectorAll('[data-lamp]')].map(b=>{const r=b.getBoundingClientRect();return {width:r.width,height:r.height,reachable:b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}}),closedHeader:getComputedStyle(h,'::before').opacity,duplicateIds:[...document.querySelectorAll('[id]')].map(e=>e.id).filter((id,i,ids)=>ids.indexOf(id)!==i)}})()`);
    if(width<1600) {
      await run(`document.querySelector('.menu-toggle').click()`); await sleep(300);
      result.openWhite=await run(`getComputedStyle(document.querySelector('header'),'::before').opacity==='1'`);
      await run(`document.querySelector('.menu-toggle').click();document.activeElement.blur()`); await sleep(300);
    }
    layout.push(result);
    if(width===1920||width===375) {
      await run(`(async()=>{document.querySelector('.hero-pause').click();document.activeElement.blur();for(const image of document.images)image.loading='eager';await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))})()`);
      const capture=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
      await writeFile(new URL(`../docs/references/phase-4-${width}.png`,import.meta.url),Buffer.from(capture.data,'base64'));
    }
  }
  check('17 responsive widths, reachable lamp targets and compact header states',layout.every(r=>!r.overflow && !r.duplicateIds.length && r.lamps.every(l=>l.width>=44 && l.height>=44 && l.reachable) && (r.width>=1600 || (r.closedHeader==='0' && r.openWhite))),layout);
  await size(375); await load();
  await run(`document.querySelector('.hero-pause').click();document.activeElement.blur()`);
  const point=lamp=>run(`(()=>{const r=document.querySelector('[data-lamp="${lamp}"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  for (const lamp of ['beige','green']) {
    const p=await point(lamp);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
    check(`Mobile ${lamp} lamp is operable by pointer`,await run(`document.querySelector('[data-lamp="${lamp}"]').getAttribute('aria-pressed')==='true'`));
  }
  await send('Emulation.setTouchEmulationEnabled',{enabled:true});
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[await point('terracotta')]});
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await sleep(100);
  check('Mobile terracotta lamp is operable by touch',await run(`document.querySelector('[data-lamp="terracotta"]').getAttribute('aria-pressed')==='true'`));
  await send('Emulation.setTouchEmulationEnabled',{enabled:false});
  await run(`document.querySelector('.menu-toggle').focus()`);
  await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  check('Compact disclosure still opens by keyboard',await run(`!document.querySelector('.primary-nav').hidden`));
  await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  check('Escape closes disclosure and restores toggle focus',await run(`document.querySelector('.primary-nav').hidden && document.activeElement.matches('.menu-toggle')`));
  await send('Network.setBlockedURLs',{urls:['*hero-interior*']}); await load(false); await sleep(200);
  check('Slide-two failure retains first image and hides unavailable navigation',await run(`document.querySelector('.hero').dataset.carouselError==='image' && document.querySelector('.hero-controls').hidden && document.querySelector('.hero-arrow').hidden && document.querySelector('.hero-slide img').naturalWidth>0 && !document.querySelector('.lamp-regions').hidden`));
  await send('Network.setBlockedURLs',{urls:[]});
  await send('Emulation.setScriptExecutionDisabled',{value:true});
  await load(false);
  check('No-JavaScript fallback retains content and expanded navigation',await run(`document.querySelectorAll('h1').length===1 && !document.querySelector('.primary-nav').hidden && document.querySelector('.hero-controls').hidden && document.querySelector('.lamp-regions').hidden && document.querySelector('.hero-slide img').naturalWidth>0`));
  const errors=events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails);
  check('No browser runtime exceptions',errors.length===0,errors);
  const failedHttp=events.filter(e=>e.method==='Network.responseReceived' && e.params.response.status>=400).map(e=>e.params.response.url);
  check('No unexpected HTTP errors',failedHttp.length===0,failedHttp);
  await writeFile(new URL('../docs/phase-4-browser-report.json',import.meta.url),JSON.stringify({checks},null,2)+'\n');
} finally { if(socket?.readyState===1)socket.close();browser.kill(); }
