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
  const size=(width,height=1080)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
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
  const clickPause=async()=>{
    const point=await run(`(()=>{const r=document.querySelector('.hero-pause').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
  };
  const space=async()=>{
    await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
    await sleep(50);
  };
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
  await clickPause(); await leave();
  const paused=await progress(); await sleep(400);
  check('Explicit pause persists after hover and focus clear',paused===await progress() && await run(`document.querySelector('.hero-pause').textContent==='Wznów animację'`));
  await clickPause();
  await sleep(200);
  check('Explicit resume works while pointer and focus remain on the button',paused!==await progress() && await run(`document.activeElement.matches('.hero-pause') && document.querySelector('.hero-pause').matches(':hover') && document.querySelector('.hero-pause').textContent==='Wstrzymaj animację'`));
  const changesBefore=await run('changes.length'); await sleep(3100);
  check('Resumed autoplay changes slides without moving pointer or focus',await run(`changes.length>${changesBefore} && document.activeElement.matches('.hero-pause') && document.querySelector('.hero-pause').matches(':hover')`));
  await leave();
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:500,y:500});
  await sleep(80); const reentered=await progress(); await sleep(250);
  check('A fresh pointer entry pauses again after explicit resume',reentered===await progress());
  await leave();
  await run(`document.querySelector('.hero-pause').focus()`);
  await space(); const keyboardPaused=await progress(); await sleep(250);
  check('Space pauses and exposes the resume label',keyboardPaused===await progress() && await run(`document.querySelector('.hero-pause').textContent==='Wznów animację'`));
  await space(); await sleep(200);
  check('Space resumes while keyboard focus stays on the button',keyboardPaused!==await progress() && await run(`document.activeElement.matches('.hero-pause') && document.querySelector('.hero-pause').textContent==='Wstrzymaj animację'`));
  await run(`document.querySelector('.hero-content a').focus()`);
  await sleep(80); const refocused=await progress(); await sleep(250);
  check('Moving focus to another hero control pauses again',refocused===await progress());
  await leave();
  await run(`document.querySelector('.showcase').scrollIntoView()`); await sleep(150);
  await run(`document.querySelector('.hero-pause').click();document.querySelector('.hero-pause').click()`);
  const offscreen=await progress(); await sleep(400);
  check('Explicit resume respects the offscreen pause',offscreen===await progress());
  await leave();
  // Synthetic visibility event exercises the actual handler; headless Chrome
  // does not reproduce an operating-system tab switch consistently.
  await run(`Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))`);
  await run(`document.querySelector('.hero-pause').click();document.querySelector('.hero-pause').click()`);
  const hidden=await progress(); await sleep(350);
  check('Explicit resume respects the hidden-document pause',hidden===await progress());
  await run(`delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))`);
  await run(`if(document.querySelector('.hero-pause').textContent==='Wstrzymaj animację')document.querySelector('.hero-pause').click()`);
  await run(`for(let i=0;i<21;i++)document.querySelector('.hero-arrow-right').click()`);
  await run(`Promise.all(document.querySelector('.hero').getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})))`);
  check('Rapid navigation settles to exactly one visible image',await run(`(()=>{const slides=[...document.querySelectorAll('.hero-slide')];return slides.filter(s=>getComputedStyle(s).opacity==='1').length===1 && slides.filter(s=>getComputedStyle(s).opacity==='0').length===1 && document.querySelector('.hero').getAnimations({subtree:true}).length===0})()`));
  await run(`document.querySelector('[data-slide="0"]').click()`); await sleep(850);
  for(let i=0;i<30 && await run(`document.querySelector('.lamp-regions').hidden`);i++) await sleep(100);
  await run(`document.querySelector('[data-lamp="beige"]').focus()`);
  await sleep(80);
  await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
  await sleep(700);
  const lampState=await run(`(()=>{const b=document.querySelector('[data-lamp="beige"]');return {pressed:b.getAttribute('aria-pressed'),opacity:getComputedStyle(b,'::before').opacity,focused:document.activeElement===b,hidden:b.parentElement.hidden}})()`);
  check('Native keyboard lamp activation reveals warm glow',lampState.pressed==='true' && lampState.opacity==='1',lampState);
  await run(`if(document.querySelector('.hero-pause').textContent==='Wstrzymaj animację')document.querySelector('.hero-pause').click()`);
  await leave(); await sleep(550);
  for (const lamp of ['beige','green','terracotta']) {
    await run(`document.querySelector('[data-lamp="${lamp}"]').setAttribute('aria-pressed','true')`);
    await sleep(700);
    const measure=()=>run(`(()=>{const b=document.querySelector('[data-lamp="${lamp}"]'),r=b.getBoundingClientRect(),i=b.querySelector('img').getBoundingClientRect(),g=getComputedStyle(b,'::before');return {width:r.width,height:r.height,x:r.x+r.width/2,y:r.y+r.height/2,decoded:b.classList.contains('lamp-ready'),imageWidth:i.width,imageHeight:i.height,glow:[g.left,g.top,g.transform],opacity:g.opacity,others:[...document.querySelectorAll('[data-lamp]')].filter(e=>e!==b).map(e=>new DOMMatrix(getComputedStyle(e).transform).a)}})()`);
    const original=await measure();
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:original.x,y:original.y});
    await sleep(120); const entering=await measure();
    await sleep(450); const enlarged=await measure();
    check(`${lamp} cutout smoothly grows 10% alone and carries its lit glow`,original.decoded && entering.width>original.width && entering.width<original.width*1.1 && Math.abs(enlarged.width/original.width-1.1)<.001 && Math.abs(enlarged.height/original.height-1.1)<.001 && Math.abs(enlarged.imageWidth-enlarged.width)<.1 && Math.abs(enlarged.imageHeight-enlarged.height)<.1 && enlarged.opacity==='1' && JSON.stringify(enlarged.glow)===JSON.stringify(original.glow) && enlarged.others.every(s=>s===1),{original,entering,enlarged});
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:-1,y:-1});
    await sleep(120); const leaving=await measure();
    await sleep(450); const restored=await measure();
    check(`${lamp} smoothly returns to its original size with light retained`,leaving.width>original.width && leaving.width<enlarged.width && Math.abs(restored.width-original.width)<.1 && restored.opacity==='1',{leaving,restored});
  }
  await run(`document.querySelector('[data-slide="1"]').click()`); await sleep(850);
  check('Inactive lamps are hidden, inert and reset',await run(`document.querySelector('.lamp-regions').hidden && document.querySelector('.lamp-regions').inert && [...document.querySelectorAll('[data-lamp]')].every(b=>b.getAttribute('aria-pressed')==='false')`));
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await sleep(100); await leave(); const reducedProgress=await progress(); await sleep(350);
  check('Live reduced-motion change stops autoplay and disables resume',reducedProgress===await progress() && await run(`document.querySelector('.hero-pause').disabled`));
  await run(`document.querySelector('[data-slide="0"]').click()`);
  check('Reduced-motion manual changes are instant and retain lamps',await run(`document.querySelector('.hero').dataset.slide==='0' && !document.querySelector('.lamp-regions').hidden && document.querySelector('.hero').getAnimations({subtree:true}).length===0`));
  await run(`document.querySelector('[data-lamp="beige"]').focus()`);
  check('Reduced motion keeps the focused lamp and glow at their original size',await run(`getComputedStyle(document.querySelector('[data-lamp="beige"]')).transform==='none'`));
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
  await run(`document.activeElement.blur();document.querySelector('.promo-card a').focus();Promise.all(document.querySelector('.promo-card').getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})))`);
  check('Only focused card media scales; gray button layer is visible',await run(`(()=>{const cards=[...document.querySelectorAll('.promo-card')];return getComputedStyle(cards[0].querySelector('.card-media > *')).transform==='matrix(1.1, 0, 0, 1.1, 0, 0)' && getComputedStyle(cards[1].querySelector('.card-media > *')).transform==='none' && getComputedStyle(cards[0].querySelector('.button'),'::before').opacity==='1'})()`));
  const audit=await run(`(()=>{const result=[];for(const e of document.querySelectorAll('*'))for(const pseudo of [null,'::before','::after']){const s=getComputedStyle(e,pseudo);if(s.transitionDuration.split(',').some(t=>parseFloat(t)>0))result.push({element:e.className,pseudo,property:s.transitionProperty,duration:s.transitionDuration})}return result})()`);
  check('DOM transition audit permits only opacity and transform',audit.every(rule=>rule.property.split(',').every(p=>['opacity','transform'].includes(p.trim()))),audit);
  const layout=[];
  for (const width of [1920,1600,1599,1440,1280,1200,1115,1114,1113,1024,900,899,768,700,699,600,599,390,375,320]) {
    await size(width); await load();
    await run(`document.querySelector('[data-slide="0"]').click();document.querySelector('.hero-pause').focus()`); await sleep(850);
    const result=await run(`(()=>{const h=document.querySelector('header');return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,lamps:[...document.querySelectorAll('[data-lamp]')].map(b=>{const r=b.getBoundingClientRect(),left=Math.max(0,r.left),right=Math.min(innerWidth,r.right),top=Math.max(0,r.top),bottom=Math.min(innerHeight,r.bottom);let reachable=false;for(const x of [.25,.5,.75])for(const y of [.15,.325,.5,.675,.85])if(b.contains(document.elementFromPoint(left+(right-left)*x,top+(bottom-top)*y)))reachable=true;return {hidden:b.hidden,width:right-left,height:bottom-top,reachable}}),closedHeader:getComputedStyle(h,'::before').opacity,duplicateIds:[...document.querySelectorAll('[id]')].map(e=>e.id).filter((id,i,ids)=>ids.indexOf(id)!==i)}})()`);
    if(width<1600) {
      await run(`document.querySelector('.menu-toggle').click();Promise.all(document.querySelector('header').getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})))`);
      result.openWhite=await run(`getComputedStyle(document.querySelector('header'),'::before').opacity==='1'`);
      await run(`document.querySelector('.menu-toggle').click();document.activeElement.blur();Promise.all(document.querySelector('header').getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})))`);
    }
    layout.push(result);
    if(process.env.QA_CAPTURE!=='0' && (width===1920||width===375)) {
      await run(`(async()=>{document.querySelector('.hero-pause').click();document.activeElement.blur();for(const image of document.images)image.loading='eager';await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))})()`);
      const capture=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
      await writeFile(new URL(`../docs/references/phase-4-${width}.png`,import.meta.url),Buffer.from(capture.data,'base64'));
    }
  }
  check('20 responsive widths, crop-aware lamp targets and compact header states',layout.every(r=>!r.overflow && !r.duplicateIds.length && r.lamps.every(l=>l.hidden || (l.width>=44 && l.height>=44 && l.reachable)) && (r.width>=1600 || (r.closedHeader==='0' && r.openWhite))),layout);
  const viewports=[];
  for(const [width,height] of [[2560,1440],[1920,900],[1920,720],[1440,900],[1366,768],[1280,720],[1115,768],[1114,768],[1113,768],[1024,768],[900,600],[768,1024],[600,800],[390,844],[375,667],[320,568],[320,480],[844,390],[667,375],[568,320]]) {
    await size(width,height); await load();
    await run('window.scrollTo(0,0)');
    const result=await run(`(()=>{const hero=document.querySelector('.hero'),r=hero.getBoundingClientRect();const controls=[...document.querySelectorAll('.hero-progress button,.hero-pause,.hero-arrow,.hero-content a,.review-badge')].map(e=>{const b=e.getBoundingClientRect();return {element:e.className||e.dataset.slide,top:b.top,bottom:b.bottom,left:b.left,right:b.right,visible:b.width>0&&b.height>0&&b.top>=0&&b.bottom<=innerHeight+.5&&b.left>=0&&b.right<=innerWidth+.5,reachable:e.matches('button,a')?e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)):true}});const imagesFillHero=[...hero.querySelectorAll('.hero-slide')].every(e=>{const b=e.getBoundingClientRect();return Math.abs(b.width-r.width)<1&&Math.abs(b.height-r.height)<1&&b.top===r.top&&b.left===r.left&&getComputedStyle(e.querySelector('img')).objectFit==='cover'});return {width:innerWidth,height:innerHeight,heroTop:r.top,heroHeight:r.height,imagesFillHero,heroOverflow:hero.scrollHeight>hero.clientHeight+1,scrollY,controls}})()`);
    viewports.push(result);
    if(process.env.QA_CAPTURE!=='0' && [[1920,900],[375,667],[844,390]].some(([w,h])=>w===width&&h===height)) {
      const capture=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      await writeFile(new URL(`../docs/references/hero-viewport-${width}x${height}.png`,import.meta.url),Buffer.from(capture.data,'base64'));
    }
  }
  for(const height of [667,844,568]) {
    await size(375,height);
    await run('window.scrollTo(0,0);new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    viewports.push(await run(`(()=>{const hero=document.querySelector('.hero'),r=hero.getBoundingClientRect();return {width:innerWidth,height:innerHeight,resizedWithoutReload:true,heroTop:r.top,heroHeight:r.height,imagesFillHero:[...hero.querySelectorAll('.hero-slide')].every(e=>{const b=e.getBoundingClientRect();return Math.abs(b.width-r.width)<1&&Math.abs(b.height-r.height)<1}),heroOverflow:hero.scrollHeight>hero.clientHeight+1,scrollY,controls:[...document.querySelectorAll('.hero-progress button,.hero-pause,.hero-arrow')].map(e=>{const b=e.getBoundingClientRect();return {element:e.className||e.dataset.slide,visible:b.width>0&&b.height>0&&b.top>=0&&b.bottom<=innerHeight+.5,reachable:e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))}})}})()`));
  }
  check('Both carousel images fill the viewport with reachable controls at every size',viewports.every(r=>r.heroTop===0&&Math.abs(r.heroHeight-r.height)<1&&r.imagesFillHero&&!r.heroOverflow&&r.scrollY===0&&r.controls.every(c=>c.visible&&c.reachable)),viewports);
  await size(375); await load();
  await run(`document.querySelector('.hero-pause').click();document.activeElement.blur()`);
  const point=lamp=>run(`(()=>{const b=document.querySelector('[data-lamp="${lamp}"]'),r=b.getBoundingClientRect(),left=Math.max(0,r.left),right=Math.min(innerWidth,r.right),top=Math.max(0,r.top),bottom=Math.min(innerHeight,r.bottom);for(const x of [.25,.5,.75])for(const y of [.15,.325,.5,.675,.85]){const p={x:left+(right-left)*x,y:top+(bottom-top)*y};if(b.contains(document.elementFromPoint(p.x,p.y)))return p}throw Error('Lamp has no reachable point: ${lamp}')})()`);
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
  await send('Network.setBlockedURLs',{urls:['*lamp-beige.png']}); await load(); await sleep(200);
  await run(`document.querySelector('[data-lamp="beige"]').click();document.querySelector('[data-lamp="beige"]').focus()`); await sleep(700);
  check('Failed cutout retains the photographed lamp and working glow without zoom',await run(`(()=>{const b=document.querySelector('[data-lamp="beige"]');return !b.classList.contains('lamp-ready') && b.getAttribute('aria-pressed')==='true' && new DOMMatrix(getComputedStyle(b).transform).a===1 && getComputedStyle(b,'::before').opacity==='1' && document.querySelector('.hero-slide img').naturalWidth>0})()`));
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
