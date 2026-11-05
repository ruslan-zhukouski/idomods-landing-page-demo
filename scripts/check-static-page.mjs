// Browser QA through Chrome's native debugging protocol; no browser-test dependency.
import { readFile, writeFile, mkdtemp, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const chromePath = process.env.CHROME_PATH || path.join(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe');
const html = await readFile(path.join(root,'index.html'),'utf8');
const localReferences = new Set([...html.matchAll(/(?:src|href)="((?:assets|styles)\/[^" ]+)"/g)].map(m=>m[1]));
for (const file of localReferences) await access(path.join(root,file));
if (/<script\b|figma\.com\/api\/mcp\/asset|docs\/references\//.test(html)) throw new Error('Unexpected runtime script, temporary URL, or reference screenshot');
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
  await send('Emulation.setScriptExecutionDisabled',{value:true});
  const checks=[];
  for(const width of [1920,1600,1280,768,375,320]) {
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
      return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,language:document.documentElement.lang,title:document.title,h1:[...document.querySelectorAll('h1')].map(h=>h.textContent.trim()),main:document.querySelectorAll('main').length,header:rect(document.querySelector('header')),hero:rect(document.querySelector('.hero')),showcase:rect(document.querySelector('.showcase')),cards:[...document.querySelectorAll('.promo-card')].map(element=>({id:element.dataset.figmaNode,...rect(element)})),shaderFallback:rect(document.querySelector('.light-section')),footer:rect(document.querySelector('footer')),images,broken:images.filter(image=>!image.naturalWidth||image.alt===null),duplicateIds:ids.filter((id,index)=>ids.indexOf(id)!==index),nestedActions:document.querySelectorAll('a a, a button, button a').length,deadLinks:[...document.querySelectorAll('a')].filter(a=>!a.getAttribute('href')||a.getAttribute('href')==='#').length,unresolvedLabels:[...document.querySelectorAll('[data-unresolved-destination]')].map(e=>e.dataset.unresolvedDestination),cookieDisclosure:!!document.querySelector('.cookie-settings summary'),search:{action:form.action,method:form.method,parameter:form.querySelector('input').name},payments:document.querySelectorAll('.payment-logos img').length,awards:document.querySelectorAll('.award-logos img').length,flags:document.querySelectorAll('.country-flags img').length,font:document.fonts.check('700 16px "Red Hat Display"','Zażółć gęślą jaźń')};
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
    if(result.networkFailures.length||result.httpErrors.length)failures.push('Network errors');
    result.failures=failures;checks.push(result);
    if(process.env.QA_CAPTURE!=='0'&&(width===1920||width===375)){const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true});await writeFile(path.join(root,`docs/references/phase-2-${width}.png`),Buffer.from(screenshot.data,'base64'))}
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
  await writeFile(path.join(root,'docs/phase-2-browser-report.json'),JSON.stringify({javascriptEnabled:false,preview:origin,checks},null,2)+'\n');
  if(checks.some(check=>check.failures.length))process.exitCode=1;
} finally { if(socket?.readyState===1)socket.close();browser.kill(); }
