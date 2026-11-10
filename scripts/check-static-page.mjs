// Browser QA through Chrome's native debugging protocol; no browser-test dependency.
import { readFile, writeFile, mkdtemp, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const phase3 = process.env.QA_PHASE === '3';
const enabled = phase3 && process.env.QA_NO_JS !== '1';
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const chromePath = process.env.CHROME_PATH || path.join(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe');
const html = await readFile(path.join(root,'index.html'),'utf8');
const localReferences = new Set([...html.matchAll(/(?:src|href)="((?:assets|styles)\/[^" ]+)"/g)].map(m=>m[1]));
for (const file of localReferences) await access(path.join(root,file));
if (/figma\.com\/api\/mcp\/asset|docs\/references\//.test(html)) throw new Error('Unexpected temporary URL or reference screenshot');
if ((await fetch(origin)).status !== 200) throw new Error('Preview server unavailable');
const profile = await mkdtemp(path.join(os.tmpdir(),'idomods-static-qa-'));
const browser = spawn(chromePath,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`],{windowsHide:true,stdio:'ignore'});
const sleep = ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;
try {
  let port;
  for (let attempt=0;attempt<100;attempt++) {
    try { port=Number((await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]); break; } catch { await sleep(100); }
  }
  if (!port) throw new Error('Chrome debugging endpoint did not start');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targets.find(target=>target.type==='page');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
  let id=0;const pending=new Map();const events=[];
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const promise=pending.get(message.id);pending.delete(message.id);if(message.error)promise?.reject(new Error(message.error.message));else promise?.resolve(message.result)}else events.push(message)});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const messageId=++id;pending.set(messageId,{resolve,reject});socket.send(JSON.stringify({id:messageId,method,params}))});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value};
  await send('Page.enable');await send('Network.enable');await send('Runtime.enable');
  await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  await send('Emulation.setScriptExecutionDisabled',{value:!enabled});
  const checks=[];
  for(const width of (phase3 ? [1920,1600,1599,1440,1280,1200,1024,900,899,768,700,699,600,599,390,375,320] : [1920,1600,1280,768,375,320])) {
    events.length=0;
    await send('Emulation.setDeviceMetricsOverride',{width,height:1080,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:origin});
    for(let attempt=0;attempt<100;attempt++){if(await evaluate('document.readyState === "complete"'))break;await sleep(100)}
    await evaluate(`(async()=>{for(const image of document.images)image.loading='eager';await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));await document.fonts.ready;return true})()`);
    const result=await evaluate(`(()=>{
      const rect=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
      const images=[...document.images].map(image=>({file:image.currentSrc.replace(location.origin+'/',''),source:image.dataset.figmaNode||null,alt:image.getAttribute('alt'),naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,...rect(image)}));
      const form=document.querySelector('form[role=search]');
      const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
      return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,language:document.documentElement.lang,title:document.title,h1:[...document.querySelectorAll('h1')].map(h=>h.textContent.trim()),main:document.querySelectorAll('main').length,header:rect(document.querySelector('header')),hero:rect(document.querySelector('.hero')),showcase:rect(document.querySelector('.showcase')),cards:[...document.querySelectorAll('.promo-card')].map(element=>({id:element.dataset.figmaNode,...rect(element)})),shaderFallback:rect(document.querySelector('.light-section')),footer:rect(document.querySelector('footer')),images,broken:images.filter(image=>!image.naturalWidth||image.alt===null),duplicateIds:ids.filter((id,index)=>ids.indexOf(id)!==index),nestedActions:document.querySelectorAll('a a, a button, button a').length,deadLinks:[...document.querySelectorAll('a')].filter(a=>!a.getAttribute('href')||a.getAttribute('href')==='#').length,unresolvedLabels:[...document.querySelectorAll('[data-unresolved-destination]')].map(e=>e.dataset.unresolvedDestination),cookieDisclosure:!!document.querySelector('.cookie-settings summary'),search:{action:form.action,method:form.method,parameter:form.querySelector('input').name},payments:document.querySelectorAll('.payment-logos img').length,awards:document.querySelectorAll('.award-logos img').length,flags:document.querySelectorAll('.country-flags img').length,font:document.fonts.check('700 16px "Red Hat Display"','Za\u017c\u00f3\u0142\u0107 g\u0119\u015bl\u0105 ja\u017a\u0144')};
    })()`);
    result.networkFailures=events.filter(event=>event.method==='Network.loadingFailed').map(event=>event.params.errorText);
    result.httpErrors=events.filter(event=>event.method==='Network.responseReceived'&&event.params.response.status>=400).map(event=>({url:event.params.response.url,status:event.params.response.status}));
    const failures=[];
    if(result.documentWidth>width)failures.push('Horizontal overflow');
    if(result.h1.length!==1||result.main!==1||result.language!=='pl')failures.push('Invalid document landmarks/language');
    if(result.broken.length||result.deadLinks)failures.push('Broken images/links');
    if(result.duplicateIds.length||result.nestedActions)failures.push('Duplicate IDs or nested actions');
    if(result.payments!==10||result.awards!==6||result.flags!==8)failures.push('Missing footer marks');
    if(!result.font||!result.cookieDisclosure)failures.push('Font or native cookie disclosure missing');
    if(events.some(event=>event.method==='Runtime.exceptionThrown'))failures.push('Runtime exception');
    if(result.networkFailures.length||result.httpErrors.length)failures.push('Network errors');
    result.failures=failures;checks.push(result);
    if(process.env.QA_CAPTURE!=='0'&&(width===1920||width===375)){const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true});await writeFile(path.join(root,`docs/references/phase-${phase3 ? 3 : 2}-${width}.png`),Buffer.from(screenshot.data,'base64'))}
    if(width===375){
      await send('Page.bringToFront');
      await evaluate('document.querySelector(".cookie-settings summary").focus()');
      result.cookieSummaryFocused=await evaluate('document.activeElement.matches(".cookie-settings summary")');
      await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
      await sleep(100);
      result.cookieOpenedWithKeyboard=await evaluate('document.querySelector(".cookie-settings").open');
      if(!result.cookieOpenedWithKeyboard)result.failures.push('Cookie disclosure keyboard activation failed');
      result.searchSerialization=await evaluate('(()=>{const form=document.querySelector("form[role=search]");form.querySelector("input").value="lampy";return new URLSearchParams(new FormData(form)).toString()})()');
      if(result.searchSerialization!=='text=lampy')result.failures.push('Search form parameter failed');
    }
    console.log(JSON.stringify({width,height:result.height,images:result.images.length,failures,cards:result.cards.map(c=>Math.round(c.width))}));
  }
  const interactions = [];
  const assert = (name, passed) => { interactions.push({name,passed}); if(!passed) process.exitCode=1; };
  if(enabled) {
    await send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
    await send('Page.navigate',{url:origin});
    for(let attempt=0;attempt<100;attempt++){if(await evaluate('document.readyState === "complete" && innerWidth===375 && document.querySelector(".navigation-enhanced")!==null'))break;await sleep(100)}
    await send('Page.bringToFront');
    assert('Compact menu initially closed and links excluded', await evaluate('document.querySelector(".primary-nav").hidden && document.querySelector(".menu-toggle").getAttribute("aria-expanded")==="false" && document.querySelector(".primary-nav a").getClientRects().length===0'));
    assert('Closed header is transparent over the hero', await evaluate('(()=>{const header=document.querySelector("header"),hero=document.querySelector(".hero");return getComputedStyle(header).backgroundColor==="rgba(0, 0, 0, 0)" && header.getBoundingClientRect().top===hero.getBoundingClientRect().top && getComputedStyle(header).position==="absolute"})()'));
    await evaluate('document.querySelector(".menu-toggle").focus()');
    await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
    await sleep(100);
    assert('Space opens disclosure',await evaluate('!document.querySelector(".primary-nav").hidden && document.querySelector(".menu-toggle").getAttribute("aria-expanded")==="true"'));
    assert('Open menu has an opaque white header', await evaluate('getComputedStyle(document.querySelector("header")).backgroundColor==="rgb(255, 255, 255)"'));
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await sleep(100);
    assert('Tab reaches first category',await evaluate('document.activeElement.matches(".primary-nav a")'));
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await sleep(100);
    assert('Escape closes and restores trigger focus',await evaluate('document.querySelector(".primary-nav").hidden && document.activeElement.matches(".menu-toggle")'));
    assert('Closing restores header transparency', await evaluate('getComputedStyle(document.querySelector("header")).backgroundColor==="rgba(0, 0, 0, 0)"'));
    await evaluate('document.querySelector(".menu-toggle").click(); document.querySelector(".primary-nav a").focus()');
    await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
    await sleep(100);
    assert('Desktop resize exposes all navigation',await evaluate('!document.querySelector(".primary-nav").hidden && document.querySelector(".menu-toggle").hidden'));
    await send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
    await sleep(100);
    assert('Compact resize closes and rescues hidden focus',await evaluate('document.querySelector(".primary-nav").hidden && document.activeElement.matches(".menu-toggle")'));
    await evaluate('document.querySelector(".menu-toggle").click()');
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:5,y:500,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:5,y:500,button:'left',clickCount:1});
    assert('Outside pointer closes menu',await evaluate('document.querySelector(".primary-nav").hidden'));
    await evaluate('document.querySelector(".menu-toggle").click(); document.querySelector(".header-actions a:last-child").focus()');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert('Tab can leave nonmodal header and closes menu',await evaluate('!document.querySelector("header").contains(document.activeElement) && document.querySelector(".primary-nav").hidden'));
    const resizeFailures=[];
    for(let width=320;width<=1920;width+=16) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
      await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      await evaluate('(()=>{const t=document.querySelector(".menu-toggle");if(!t.hidden && t.getAttribute("aria-expanded")==="false")t.click()})()');
      const issues=await evaluate(`(()=>{
        const issues=[];const box=e=>e.getBoundingClientRect();
        if(document.documentElement.scrollWidth>innerWidth)issues.push('page overflow');
        if(innerWidth<1600 && getComputedStyle(document.querySelector('header')).backgroundColor!=='rgb(255, 255, 255)')issues.push('open header background');
        const top=[...document.querySelectorAll('.brand,.menu-toggle:not([hidden]),.header-actions,.search-form')].map(box);
        for(let i=0;i<top.length;i++)for(let j=i+1;j<top.length;j++)if(Math.min(top[i].right,top[j].right)-Math.max(top[i].left,top[j].left)>1 && Math.min(top[i].bottom,top[j].bottom)-Math.max(top[i].top,top[j].top)>1)issues.push('header control overlap');
        for(const e of document.querySelectorAll('.header-inner > :not([hidden]), .primary-nav:not([hidden]) a, .card-copy, .footer-group, .footer-panel, .shop-contact')) {
          const r=box(e);if(r.width && (r.left<-.5 || r.right>innerWidth+.5 || e.scrollWidth>e.clientWidth+1)) issues.push(e.className||e.tagName);
        }
        for(const card of document.querySelectorAll('.promo-card:not(.card-thoro)')) {
          const media=box(card.querySelector('.card-media')),copy=box(card.querySelector('.card-copy'));
          if(innerWidth<1200 && media.bottom>copy.top+1) issues.push('card media/copy overlap');
        }
        const image=box(document.querySelector('.hero-image img'));
        for(const lamp of document.querySelectorAll('[data-lamp]')) {
          const r=box(lamp);if(!r.width||!r.height||r.right<image.left||r.left>image.right||r.bottom<image.top||r.top>image.bottom)issues.push('lamp geometry');
        }
        return issues;
      })()`);
      if(issues.length)resizeFailures.push({width,issues});
    }
    assert('Continuous resize 320–1920 in 16px steps',resizeFailures.length===0);
    interactions.push({name:'resize failures',details:resizeFailures});
    console.log(JSON.stringify(interactions));
  }
  await writeFile(path.join(root,phase3 ? `docs/phase-3-${enabled?'browser':'no-js'}-report.json` : 'docs/phase-2-browser-report.json'),JSON.stringify({javascriptEnabled:enabled,preview:origin,checks,interactions},null,2)+'\n');
  if(checks.some(check=>check.failures.length))process.exitCode=1;
} finally { if(socket?.readyState===1)socket.close();browser.kill(); }
