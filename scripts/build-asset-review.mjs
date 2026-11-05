import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = async name => JSON.parse((await readFile(path.join(root, name), 'utf8')).replace(/^\uFEFF/, ''));
const capture = await readJson('docs/asset-sources.json');
const inspection = await readJson('docs/asset-inspection.json');
const known = new Map(capture.sources.map(row => [row.path, row]));
const fontSource = 'https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@500;700&display=swap';
const assets = inspection.map(row => {
  let source = known.get(row.path);
  if (!source && /-(\d+)\.(jpg|webp)$/.test(row.path)) {
    const original = row.path.replace(/-\d+\.(jpg|webp)$/, '.png');
    source = { ...known.get(original), path: row.path, derivedFrom: original, sourceType: row.path.endsWith('.webp')?'responsive-webp':'responsive-jpeg', encoding: row.path.endsWith('.webp')?'Browser WebP quality 0.86; proportional resize; no upscale':'JPEG quality 86; proportional resize; no upscale' };
  }
  if (!source && row.path.startsWith('assets/fonts/')) source = {
    path: row.path, sourceType: row.path.endsWith('OFL.txt') ? 'license' : 'google-fonts',
    sourceUrl: row.path.endsWith('OFL.txt') ? 'https://raw.githubusercontent.com/google/fonts/main/ofl/redhatdisplay/OFL.txt' : fontSource,
    sourceNodeIds: ['1:510', '1:511'], usageSlot: 'Red Hat Display 500 and 700, Latin and Latin Extended', license: 'SIL Open Font License 1.1',
  };
  if (!source) throw new Error(`Unmapped asset: ${row.path}`);
  return { ...source, ...row };
});
const manifest = {
  schemaVersion: 1, capturedOn: capture.capturedOn, source: { fileKey: capture.fileKey, pageNodeId: capture.pageNodeId, layoutNodeId: capture.layoutNodeId },
  status: 'acquired; original fragments preserved; media compositions assembled in review page',
  assets, referenceOnly: capture.referenceOnly,
  compositions: [
    { id: 'configurator', sourceNodeIds: ['1:640','1:641','1:642','1:643','1:661','1:662'], designWidth: 936, designHeight: 518, reviewSelector: '#composition-configurator', notes: 'Original laptop, palette, color circles and source fade placement; copy/button remain HTML in Phase 2.' },
    { id: 'catalogue', sourceNodeIds: ['1:670','1:671','1:672','1:673'], designWidth: 936, designHeight: 518, reviewSelector: '#composition-catalogue', notes: 'Original tablet crop and cream fade.' },
    { id: 'smart', sourceNodeIds: ['1:680','1:681','1:691'], designWidth: 648, designHeight: 518, reviewSelector: '#composition-smart', notes: 'Both original devices, screen images, masks, mirroring, clipping and neutral fades.' },
    { id: 'idosell', sourceNodeIds: ['1:967'], designWidth: 66, designHeight: 36, reviewSelector: '#composition-idosell', notes: 'All original SVG fragments retained at source percentage insets; no redrawing.' },
  ],
  hero: {
    designWidth: 1920, designHeight: 1080, fit: 'cover', position: '50% 50%',
    firstImage: { intrinsicWidth: 2752, intrinsicHeight: 1536, renderedWidth: 1935, renderedHeight: 1080, cropLeft: 7.5, cropRight: 7.5 },
    mobileProposal: { fit: 'contain in a separate 16:9 artwork area above copy, rather than a tall cover crop that hides lamps', status: 'implementation choice; no mobile artboard supplied' },
    lampRegionsIn1920x1080Reference: [
      { name: 'beige', sourceNodeId: '1:1004', x: 760, y: 85, width: 372, height: 419 },
      { name: 'green', sourceNodeId: '1:1003', x: 1076, y: 332, width: 470, height: 428, silhouette: 'use vector-masked export; rectangular region is only a positioning reference' },
      { name: 'terracotta', sourceNodeId: '1:1002', x: 418, y: 434, width: 423, height: 393 },
    ],
    caveat: 'Cutout positioning was derived from a separate 1920x1080 source. Calibrate hotspots against the final cover crop; no clean background exists for independent lamp movement.',
  },
  limitations: ['Further Figma calls were blocked by the Starter-plan MCP quota after initial source capture. Existing node contexts supplied the second hero and exact green vector export.', 'No independent full-node export of each device group/partner mark was available; use the supplied fragment composition instead of treating any fragment as the complete artwork.'],
};
await writeFile(path.join(root, 'docs/asset-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const esc = value => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const image = (name, style = '', extra = '') => `<img src="../${name}" alt="" style="${style}" ${extra}>`;
const positioned = (style, content) => `<div style="position:absolute;${style}">${content}</div>`;
const fillImage = name => image(name, 'display:block;width:100%;height:100%;object-fit:fill');
const stage = (id, width, height, color, content) => `<div class="stage" style="aspect-ratio:${width}/${height}"><div id="composition-${id}" class="scaled" data-width="${width}" style="width:${width}px;height:${height}px;background:${color}">${content}</div></div>`;
const paletteColors = ['#f5f5dc','#56663e','#3f4f8b','#beada3','#708238','#837060','#0e2a94'];
const paletteCenters = [[134.99,132.23],[190.68,159.06],[204.44,219.33],[165.9,267.66],[104.08,267.66],[65.53,219.33],[79.3,159.06]];
const palette = positioned('left:33.621px;top:102.151px;width:202.638px;height:202.638px', fillImage('assets/icons/configurator-palette.svg')) + paletteCenters.map(([x,y], index) => positioned(`left:${x-18.86}px;top:${y-18.86}px;width:37.72px;height:37.72px;border-radius:50%;background:${paletteColors[index]}`, '')).join('');
const laptop = positioned('left:-76.995px;top:-30.002px;width:700.91px;height:524.704px', fillImage('assets/images/configurator-laptop.png'));
const config = stage('configurator',936,518,'#72a3f3',positioned('left:413px;top:10px;width:488px;height:464px',palette+laptop+positioned('left:24px;top:305px;width:464px;height:159px;background:linear-gradient(to bottom,rgba(114,163,243,.01),#72a3f3)','')));
const catalogue = stage('catalogue',936,518,'#fdf8eb',positioned('left:424px;top:54px;width:488px;height:464px;overflow:hidden', positioned('left:-108px;top:-48px;width:727.568px;height:545.175px',fillImage('assets/images/catalogue-tablet.png'))+positioned('left:24px;top:124px;width:464px;height:340px;background:linear-gradient(to bottom,rgba(253,248,235,.01),#fdf8eb)','')));
const mirroredImage = name => `<div style="width:100%;height:100%;transform:scaleX(-1)">${fillImage(name)}</div>`;
const backPhone = positioned('left:79px;top:72px;width:230px;height:231px;overflow:hidden',
  positioned('inset:2.6% 0 -25.14% 3.04%',mirroredImage('assets/images/smart-phone-frame.png'))+
  positioned('inset:4.59% 2.49% -19.05% 7.98%',mirroredImage('assets/icons/smart-back-device.svg'))+
  positioned('inset:4.11% .14% -19.84% 5.76%',`<div style="width:100%;height:100%;transform:scaleX(-1);mask-image:url(../assets/icons/smart-back-screen-mask.svg);mask-mode:luminance;mask-repeat:no-repeat;mask-position:5.09px 1.109px;mask-size:205.928px 264.39px">${fillImage('assets/images/smart-screen-back.png')}</div>`)+
  positioned('left:0;top:92px;width:230px;height:139px;background:linear-gradient(to bottom,rgba(232,228,223,.01),#e8e4df)',''));
const frontPhone = positioned('left:220px;top:97px;width:419px;height:421px;overflow:hidden',
  positioned('inset:9.03% 4.27% -21.22% 6.92%',fillImage('assets/images/smart-phone-frame.png'))+
  positioned('inset:10.85% 8.79% -15.64% 9.2%',fillImage('assets/icons/smart-front-device.svg'))+
  positioned('inset:10.41% 6.76% -16.37% 7.05%;mask-image:url(../assets/icons/smart-front-screen-mask.svg);mask-mode:luminance;mask-repeat:no-repeat;mask-position:9.026px 1.85px;mask-size:343.613px 441.165px',fillImage('assets/images/smart-screen-front.png'))+
  positioned('left:15px;top:96px;width:386px;height:325px;background:linear-gradient(to bottom,rgba(232,228,223,.01),#e8e4df)',''));
const smart = stage('smart',648,518,'#e8e4df',backPhone+frontPhone);
const idosellInsets = ['0 -0.28% 0 0.4%','19.76% 81.37% 64.58% 12.55%','22.8% 73.68% 64.38% 19.28%','23.01% 63.26% 64.58% 26.66%','22.8% 56.12% 64.38% 37.08%','22.8% 51.48% 64.58% 45.03%','22.8% 44.09% 64.38% 49.11%','18.75% 36.33% 64.38% 56.58%','18.75% 24.63% 64.38% 68.29%','23.01% 17.26% 58.75% 75.71%'];
const idosell = `<div id="composition-idosell" style="position:relative;width:66px;height:36px;overflow:hidden">${idosellInsets.map((inset,i)=>positioned(`inset:${inset}`,fillImage(`assets/icons/partner-idosell-part-${String(i+1).padStart(2,'0')}.svg`))).join('')}${positioned('inset:48.75% 11.58% 18.74% 12.55%;mask-image:url(../assets/icons/partner-idosell-wordmark-mask.svg);mask-repeat:no-repeat;mask-position:0 -.002px;mask-size:50.073px 11.7px',fillImage('assets/icons/partner-idosell-wordmark.svg'))}</div>`;
const figure = (title,body,note='') => `<figure${/^(account|angle-down|arrow-left|arrow-right|configurator|cart-artwork|sollux-light)\.svg$/.test(title)?' class="on-dark"':''}>${body}<figcaption>${esc(title)}${note?`<small>${esc(note)}</small>`:''}</figcaption></figure>`;
const group = (title,body) => `<section><h2>${title}</h2><div class="grid">${body}</div></section>`;
const thumbs = list => list.map(asset=>figure(asset.path.split('/').pop(),image(asset.path, '',`width="${asset.width}" height="${asset.height}"`),`${asset.width} × ${asset.height}; ${asset.sourceNodeIds?.join(', ')}`)).join('');
const gallery = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phase 1 — asset review</title><link rel="stylesheet" href="../assets/fonts/red-hat-display.css"><style>.icons figure.on-dark{background:#444}
*{box-sizing:border-box}body{font-family:'Red Hat Display',sans-serif;background:#f4f5f6;color:#1e1e1e;margin:0;padding:24px}h1{margin:0}p{max-width:90ch}h2{font-size:20px;margin:22px 0 12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}figure{background:white;border:1px solid #ddd;border-radius:8px;margin:0;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:0}figure>img{max-width:100%;max-height:135px;width:auto;height:auto;object-fit:contain;margin:auto;padding:12px}.heroes{grid-template-columns:1fr 1fr}.heroes img{padding:0;max-height:none;width:100%;aspect-ratio:16/9;object-fit:cover}.lamps figure{background:repeating-conic-gradient(#eee 0% 25%,#fff 0% 50%) 0/20px 20px}.lamps img{max-height:180px}.icons .grid{grid-template-columns:repeat(auto-fit,minmax(130px,1fr))}.icons figure>img{max-height:70px;min-height:45px}.icons figure:nth-child(-n+10){background-color:#ddd}figcaption{padding:8px;background:#fff;width:100%;font-size:12px;text-align:center;overflow-wrap:anywhere}small{display:block;color:#555;font-size:10px}.stage{width:100%;overflow:hidden;position:relative}.scaled{position:absolute;left:0;top:0;transform-origin:top left}.scaled img{padding:0;margin:0;max-width:none;max-height:none}output{display:block;padding:12px;border:1px solid #aaa;background:#fff}.reference a{color:#333}.proof{padding:12px;background:white}.proof strong{font-weight:700}.proof span{font-weight:500}
</style><h1>Phase 1: original Figma assets</h1><p>Local asset review only. Card artwork is assembled from original fragments; marketing copy/buttons belong to Phase 2. The live shader is a later phase.</p><output id="review-status">Checking local images and fonts…</output><div class="proof"><span>Medium 500 — Zażółć gęślą jaźń. SOLLUX</span><br><strong>Bold 700 — Zażółć gęślą jaźń. SOLLUX</strong></div>
<section><h2>Both hero images / source cover crop</h2><div class="grid heroes">${thumbs(assets.filter(a=>/^assets\/images\/hero-(bestsellers|interior)\.png$/.test(a.path)))}</div></section>
<section class="lamps"><h2>Exact lamp crops and vector silhouette</h2><div class="grid">${thumbs(assets.filter(a=>/lamp-(beige|green|terracotta)\.png$/.test(a.path)))}</div></section>
${group('Promotional media without baked copy',figure('THORO',image('assets/images/thoro-960.jpg','width:100%;height:auto;max-height:none;padding:0;aspect-ratio:648/518;object-fit:cover'))+figure('Configurator · 936 × 518',config)+figure('Catalogue · 936 × 518',catalogue)+figure('SOLLUX SMART · 648 × 518',smart))}
<section class="icons"><h2>Header, benefits, social and partner originals</h2><div class="grid">${thumbs(assets.filter(a=>a.path.startsWith('assets/icons/')&&!a.path.includes('/flags/')&&!a.path.includes('partner-idosell-part-')&&!a.path.includes('smart-')&&!a.path.includes('-mask')&&!a.path.includes('wordmark')&&!a.path.includes('configurator-palette')))}${figure('IdoSell complete original fragments',idosell,'1:967 · 66 × 36')}</div></section>
<section class="icons"><h2>All 10 payment / delivery logos</h2><div class="grid">${thumbs(assets.filter(a=>a.path.includes('/payments/')))}</div></section>
<section class="icons"><h2>All 6 awards</h2><div class="grid">${thumbs(assets.filter(a=>a.path.includes('/awards/')))}</div></section>
<section class="icons"><h2>All 8 country flags in original order</h2><div class="grid">${thumbs(assets.filter(a=>a.path.includes('/flags/')))}</div></section>
<p class="reference">Reference only: <a href="references/landing-page.png">captured storefront screenshot</a> · <a href="references/landing-page.figma.jsx.txt">source placement instructions</a> · <a href="asset-manifest.json">manifest</a></p>
<div hidden id="all-files">${assets.filter(a=>/\.(png|jpg|svg|webp)$/.test(a.path)).map(a=>image(a.path)).join('')}</div>
<script>
const stages=[...document.querySelectorAll('.scaled')];function resize(){for(const stage of stages)stage.style.transform='scale('+stage.parentElement.clientWidth/Number(stage.dataset.width)+')'}resize();addEventListener('resize',resize);
addEventListener('load',async()=>{const images=[...document.images];const broken=images.filter(image=>!image.complete||!image.naturalWidth).map(image=>image.getAttribute('src'));const medium=await document.fonts.load('500 20px "Red Hat Display"','Zażółć gęślą jaźń');const bold=await document.fonts.load('700 20px "Red Hat Display"','Zażółć gęślą jaźń');await document.fonts.ready;const report={images:images.length,broken,mediumFontFaces:medium.length,boldFontFaces:bold.length,compositions:stages.length};document.getElementById('review-status').textContent=JSON.stringify(report);document.documentElement.dataset.review=broken.length||!medium.length||!bold.length?'failed':'passed'});
</script></html>`;
await writeFile(path.join(root,'docs/asset-review.html'),gallery);

const errors=[];
for(const asset of assets){
  const filename=path.join(root,asset.path);const bytes=await readFile(filename);
  if(!bytes.length)errors.push(`Empty: ${asset.path}`);
  if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)errors.push(`Hash mismatch: ${asset.path}`);
  if(/\.woff2$/.test(asset.path)&&bytes.subarray(0,4).toString()!=='wOF2')errors.push(`Bad WOFF2: ${asset.path}`);
  if(/\.(svg|css)$/.test(asset.path)&&/https?:\/\/www\.figma\.com\/api\/mcp\/asset\//.test(bytes.toString()))errors.push(`Temporary runtime URL: ${asset.path}`);
}
const expected=[['payments',10],['awards',6],['flags',8]];
for(const [folder,count]of expected){const actual=assets.filter(a=>a.path.includes('/'+folder+'/')).length;if(actual!==count)errors.push(`${folder}: expected ${count}, got ${actual}`)}
for(const reference of capture.referenceOnly)if(!(await stat(path.join(root,reference.path))).size)errors.push(`Empty reference: ${reference.path}`);
const report={checkedOn:capture.capturedOn,assets:assets.length,totalBytes:assets.reduce((n,a)=>n+a.bytes,0),sourceAssets:capture.sources.length,responsiveJpegs:assets.filter(a=>a.sourceType==='responsive-jpeg').length,responsiveWebps:assets.filter(a=>a.sourceType==='responsive-webp').length,paymentLogos:10,awards:6,flags:8,errors};
await writeFile(path.join(root,'docs/asset-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
