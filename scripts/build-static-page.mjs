// Optional authoring helper. The committed index.html runs directly without a build or JavaScript.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const json = async file => JSON.parse((await readFile(path.join(root, file), 'utf8')).replace(/^\uFEFF/, ''));
const manifest = await json('docs/asset-manifest.json');
const destinations = await json('docs/destinations.json');
const assets = new Map(manifest.assets.map(asset => [asset.path, asset]));
const routes = new Map(destinations.entries.map(entry => [entry.id, entry.href]));
const decisions = {
  tiktok: { href: 'https://www.tiktok.com/', reason: 'Use the TikTok homepage until the official SOLLUX profile URL is supplied or verified.' },
  about: { href: 'https://sollux-lighting.com/pl/o-firmie/', reason: 'Verified official company page, linked from the official corporate homepage.' },
  inspiration: { href: 'https://sollux.pl/pl/blog', reason: 'Use the verified official blog as the inspiration destination.' },
  premium: { href: routes.get('thoro'), reason: 'Use the same verified premium-brand destination as the THORO card.' },
  'buy-now': { href: routes.get('lamps'), reason: 'The static CTA opens the verified lamp catalogue rather than implying a checkout.' },
};
for (const [id, entry] of Object.entries(decisions)) routes.set(id, entry.href);
const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const img = (file, { alt = '', classes = '', style = '', eager = false } = {}) => {
  const asset = assets.get(file);
  if (!asset) throw new Error(`Missing asset: ${file}`);
  return `<img src="${file}" width="${asset.width}" height="${asset.height}" alt="${esc(alt)}"${classes ? ` class="${classes}"` : ''}${style ? ` style="${style}"` : ''} loading="${eager ? 'eager' : 'lazy'}" decoding="async" data-figma-node="${asset.sourceNodeIds.join(' ')}">`;
};
const icon = (name, classes = '') => `<span class="icon ${classes}" aria-hidden="true">${img(`assets/icons/${name}.svg`, { eager: true })}</span>`;
// One semantic label; the second face is only a precolored opacity layer.
const headerFace = content => `<span class="header-face"><span class="header-face-light">${content}</span><span class="header-face-dark" aria-hidden="true">${content}</span></span>`;
const link = (id, label, classes = '') => routes.has(id)
  ? `<a href="${esc(routes.get(id))}"${classes ? ` class="${classes}"` : ''} data-destination="${id}">${label}</a>`
  : `<span class="unresolved-label ${classes}" data-unresolved-destination="${id}">${label}</span>`;
const picture = (name, sizes, { alt = '', eager = false, classes = '' } = {}) => {
  const variants = manifest.assets.filter(asset => asset.path.startsWith(`assets/images/${name}-`) && asset.path.endsWith('.jpg')).sort((a,b) => a.width - b.width);
  const srcset = extension => variants.map(asset => `${asset.path.replace('.jpg', extension)} ${asset.width}w`).join(', ');
  const fallback = variants.at(-1);
  return `<picture${classes ? ` class="${classes}"` : ''}><source type="image/webp" srcset="${srcset('.webp')}" sizes="${sizes}"><img src="${fallback.path}" srcset="${srcset('.jpg')}" sizes="${sizes}" width="${fallback.width}" height="${fallback.height}" alt="${esc(alt)}" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} decoding="async" data-figma-node="${fallback.sourceNodeIds.join(' ')}"></picture>`;
};
// Convert the exact source pixel coordinates into proportional placement, preserving artwork geometry.
const box = (parentW, parentH, x, y, w, h, content, extra = '') => `<div class="art-box" style="left:${x/parentW*100}%;top:${y/parentH*100}%;width:${w/parentW*100}%;height:${h/parentH*100}%;${extra}">${content}</div>`;
const inset = (values, content, extra = '') => `<div class="art-box" style="inset:${values};${extra}">${content}</div>`;
const fill = file => img(file, { classes: 'art-image' });
const colors = ['#f5f5dc','#56663e','#3f4f8b','#beada3','#708238','#837060','#0e2a94'];
const centers = [[134.99,132.23],[190.68,159.06],[204.44,219.33],[165.9,267.66],[104.08,267.66],[65.53,219.33],[79.3,159.06]];
const palette = box(488,464,33.621,102.151,202.638,202.638,fill('assets/icons/configurator-palette.svg')) + centers.map(([x,y],i) => box(488,464,x-18.86,y-18.86,37.72,37.72,'',`border-radius:50%;background:${colors[i]}`)).join('');
const configurator = `<div class="artboard artboard-wide" data-figma-node="1:641">${box(936,518,413,10,488,464,palette + box(488,464,-76.995,-30.002,700.91,524.704,fill('assets/images/configurator-laptop.png')) + box(488,464,24,305,464,159,'','background:linear-gradient(to bottom,rgba(114,163,243,.01),#72a3f3)'))}</div>`;
const catalogue = `<div class="artboard artboard-wide" data-figma-node="1:671">${box(936,518,424,54,488,464,box(488,464,-108,-48,727.568,545.175,fill('assets/images/catalogue-tablet.png')) + box(488,464,24,124,464,340,'','background:linear-gradient(to bottom,rgba(253,248,235,.01),#fdf8eb)'),'overflow:hidden')}</div>`;
const mirror = content => `<div class="mirrored">${content}</div>`;
const back = box(648,518,79,72,230,231,
  inset('2.6% 0 -25.14% 3.04%',mirror(fill('assets/images/smart-phone-frame.png'))) +
  inset('4.59% 2.49% -19.05% 7.98%',mirror(fill('assets/icons/smart-back-device.svg'))) +
  inset('4.11% .14% -19.84% 5.76%',mirror(`<div class="screen-mask" style="mask-image:url(assets/icons/smart-back-screen-mask.svg);mask-position:48.4824% 37.6674%;mask-size:95.149% 98.8987%">${fill('assets/images/smart-screen-back.png')}</div>`)) +
  box(230,231,0,92,230,139,'','background:linear-gradient(to bottom,rgba(232,228,223,.01),#e8e4df)'), 'overflow:hidden');
const front = box(648,518,220,97,419,421,
  inset('9.03% 4.27% -21.22% 6.92%',fill('assets/images/smart-phone-frame.png')) +
  inset('10.85% 8.79% -15.64% 9.2%',fill('assets/icons/smart-front-device.svg')) +
  inset('10.41% 6.76% -16.37% 7.05%',`<div class="screen-mask" style="mask-image:url(assets/icons/smart-front-screen-mask.svg);mask-position:51.5223% 37.6662%;mask-size:95.1489% 98.8987%">${fill('assets/images/smart-screen-front.png')}</div>`) +
  box(419,421,15,96,386,325,'','background:linear-gradient(to bottom,rgba(232,228,223,.01),#e8e4df)'), 'overflow:hidden');
const smart = `<div class="artboard artboard-narrow" data-figma-node="1:681 1:691">${back}${front}</div>`;
const idosellInsets = ['0 -0.28% 0 0.4%','19.76% 81.37% 64.58% 12.55%','22.8% 73.68% 64.38% 19.28%','23.01% 63.26% 64.58% 26.66%','22.8% 56.12% 64.38% 37.08%','22.8% 51.48% 64.58% 45.03%','22.8% 44.09% 64.38% 49.11%','18.75% 36.33% 64.38% 56.58%','18.75% 24.63% 64.38% 68.29%','23.01% 17.26% 58.75% 75.71%'];
const idosell = `<span class="idosell-mark" role="img" aria-label="Powered by IdoSell" data-figma-node="1:967"><span aria-hidden="true">${idosellInsets.map((v,i) => inset(v,fill(`assets/icons/partner-idosell-part-${String(i+1).padStart(2,'0')}.svg`))).join('')}${inset('48.75% 11.58% 18.74% 12.55%',fill('assets/icons/partner-idosell-wordmark.svg'),'mask-image:url(assets/icons/partner-idosell-wordmark-mask.svg);mask-repeat:no-repeat;mask-position:0 -.002px;mask-size:50.073px 11.7px')}</span></span>`;
const benefits = [
  ['returns','Zwroty nawet do 100 dni','szybkie i proste','1:596'],
  ['warranty','5 lat gwarancji','na wszystkie produkty','1:602'],
  ['delivery','Darmowa dostawa','już za 299 zł','1:608'],
  ['polish','Polskie produkty','sprawdzona jakość','1:614'],
  ['official','Oficjalny sklep producenta','gwarancja satysfakcji','1:625'],
];
const benefitsHtml = benefits.map(([name,title,copy,id]) => `<li class="benefit" data-figma-node="${id}">${name === 'polish' ? `<span class="benefit-icon polish-icon" aria-hidden="true">${img('assets/icons/benefit-polish-artwork.svg')}</span>` : icon(`benefit-${name}`, 'benefit-icon')}<div><h3>${title}</h3><p>${copy}</p></div></li>`).join('\n');
const card = ({id,type,route,eyebrow,title,cta,media}) => `<article class="promo-card card-${type}" data-figma-node="${id}"><div class="card-media" aria-hidden="true">${media}</div><div class="card-copy"><p class="eyebrow">${eyebrow}</p><h3>${title}</h3>${link(route,cta,'button button-dark')}</div></article>`;
const cards = [
  {id:'1:633',type:'thoro',route:'thoro',eyebrow:'Marka THORO',title:'Poznaj lampy premium',cta:'Odwiedź sklep THORO',media:picture('thoro','(min-width: 1696px) 648px, (min-width: 1200px) calc((100vw - 112px) * 0.4091), (min-width: 700px) calc((100vw - 64px) / 2), calc(100vw - 32px)')},
  {id:'1:640',type:'configurator',route:'configurator',eyebrow:'Konfigurator 3D',title:'Wybierz projekt i dostosuj<br class="desktop-break"> go do swojego wnętrza',cta:'Stwórz swój projekt',media:configurator},
  {id:'1:670',type:'catalogue',route:'catalogue',eyebrow:'Katalog',title:'Odkryj najnowszy katalog',cta:'Sprawdź katalog',media:catalogue},
  {id:'1:680',type:'smart',route:'smart',eyebrow:'SOLLUX SMART',title:'Przymierz lampę w aplikacji',cta:'Pobierz aplikacje na telefon',media:smart},
].map(card);
const footerGroups = [
  ['Moje zamówienia',[['order-status','Status zamówienia'],['tracking','Śledzenie przesyłki'],['complaint','Chcę zareklamować produkt'],['exchange','Informacje o wymianie'],['contact','Kontakt']]],
  ['Moje konto',[['register','Zarejestruj się'],['cart','Koszyk'],['shopping-list','Listy zakupowe'],['products-bought','Lista zakupionych produktów'],['transactions','Historia transakcji'],['discounts','Moje rabaty']]],
  ['Regulaminy',[['shipping','Sposoby wysyłki'],['payments','Sposoby płatności'],['terms','Regulamin sklepu'],['privacy','Polityka prywatności'],['security','Polityka bezpieczeństwa']]],
  ['Informacje',[['about','O nas'],['faq','FAQ'],['light-course','Kurs światła'],['inspiration','Inspiracje'],['premium','Marka premium'],['warranty','Gwarancja'],['configurator','Konfigurator 3D']]],
  ['Współpraca',[['architect','Dla Architekta'],['models','Modele 3D'],['distribution','Dystrybucja']]],
];
const cookies = `<details class="cookie-settings"><summary>Zmień ustawienia ciasteczek</summary><div class="cookie-copy"><p>Ta strona nie zapisuje opcjonalnych plików cookie.</p><p>Informacje o plikach cookie w sklepie SOLLUX znajdziesz w ${link('privacy','polityce prywatności sklepu')}.</p></div></details>`;
const footerNav = footerGroups.map(([heading,items],i) => `<section class="footer-group"><h2 id="footer-heading-${i}">${heading}</h2><ul aria-labelledby="footer-heading-${i}">${items.map(([id,label])=>`<li>${link(id,esc(label))}</li>`).join('')}${i===2?`<li>${cookies}</li>`:''}</ul></section>`).join('\n');
const footerMarks = folder => manifest.assets.filter(asset=>asset.path.includes(`/${folder}/`)).sort((a,b)=>(a.sourceOrder??Number(a.sourceNodeIds[0].split(':')[1]))-(b.sourceOrder??Number(b.sourceNodeIds[0].split(':')[1])));
const payments = footerMarks('payments').map(asset=>`<li>${img(asset.path,{alt:asset.accessibleLabel})}</li>`).join('');
const awardLabels = ['Rzetelna Firma','Orły Oświetlenia','Gazele Biznesu','Solidna Firma','Polska Gwarancja Jakości','Firma Godna Zaufania'];
const awards = footerMarks('awards').map((asset,i)=>`<li>${img(asset.path,{alt:awardLabels[i]})}</li>`).join('');
const shopIds=['pl','de','es','ro','fr','gb','nl','se'];
const flags = footerMarks('flags').map((asset,i)=>`<li>${link(`shop-${shopIds[i]}`,img(asset.path,{alt:asset.accessibleLabel}),'country-link')}</li>`).join('');
const socials = ['facebook','instagram','tiktok','youtube'].map(id=>link(id,id==='tiktok' ? `<span class="tiktok-icon" aria-hidden="true">${img('assets/icons/social-tiktok-artwork.svg')}</span><span class="visually-hidden">TikTok</span>` : icon(`social-${id}`),'social-link')).join('');
const html = `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Odkryj lampy SOLLUX: kolor, forma i światło do Twojego wnętrza. Poznaj bestsellery, konfigurator 3D, najnowszy katalog i aplikację SOLLUX SMART.">
  <meta name="theme-color" content="#F2BF25">
  <link rel="icon" href="assets/icons/sollux-dark.svg" type="image/svg+xml">
  <title>SOLLUX — Kolor i forma w nowym świetle</title>
  <link rel="preload" href="assets/fonts/red-hat-display-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="assets/fonts/red-hat-display.css">
  <link rel="stylesheet" href="styles/tokens.css">
  <link rel="stylesheet" href="styles/main.css">
  <link rel="stylesheet" href="styles/motion.css">
  <script type="module" src="scripts/main.js"></script>
</head>
<body>
  <a class="skip-link" href="#main">Przejdź do treści</a>
  <header class="site-header" data-figma-node="1:533">
    <div class="container header-inner">
      <a class="brand" href="${routes.get('home')}" aria-label="SOLLUX — strona główna">${img('assets/icons/sollux-light.svg',{classes:'brand-light',eager:true})}${img('assets/icons/sollux-dark.svg',{classes:'brand-dark',eager:true})}</a>
      <button class="menu-toggle" type="button" aria-label="Menu" aria-controls="primary-navigation" aria-expanded="false" hidden>${headerFace('<img class="menu-icon-open" src="assets/icons/menu-hamburger.svg" width="24" height="24" alt=""><img class="menu-icon-close" src="assets/icons/menu-close.svg" width="24" height="24" alt="">')}</button>
      <nav id="primary-navigation" class="primary-nav" aria-label="Nawigacja główna"><ul>
        <li>${link('lamps',headerFace(`Lampy ${icon('angle-down')}`))}</li><li>${link('colors',headerFace(`Kolory ${icon('angle-down')}`))}</li><li>${link('rooms',headerFace(`Pomieszczenia ${icon('angle-down')}`))}</li><li>${link('new',headerFace('Nowości'))}</li><li>${link('bestsellers',headerFace('Bestsellery'))}</li><li>${link('promotions',headerFace('Promocje'))}</li>
      </ul></nav>
      <form class="search-form" role="search" action="${destinations.search.action}" method="get">
        <label class="visually-hidden" for="product-search">Czego szukasz?</label><span class="search-field"><input id="product-search" type="search" name="text" placeholder="Czego szukasz?" required><span class="search-dark-text" aria-hidden="true">Czego szukasz?</span></span><button type="submit" aria-label="Szukaj produktów">${headerFace(icon('search'))}</button>
      </form>
      <div class="header-actions">${link('configurator',headerFace(`${icon('configurator')}<span>Stwórz swoją lampę</span>`),'configurator-link')}${link('account',`${headerFace(icon('account'))}<span class="visually-hidden">Moje konto</span>`,'utility-link')}${link('cart',`${headerFace(`<span class="cart-icon" aria-hidden="true">${img('assets/icons/cart-artwork.svg',{eager:true})}</span>`)}<span class="visually-hidden">Koszyk</span>`,'utility-link')}</div>
    </div>
  </header>
  <main id="main" tabindex="-1">
    <section class="hero" aria-labelledby="hero-title" data-figma-node="1:506">
      ${picture('hero-bestsellers','100vw',{eager:true,classes:'hero-image hero-slide is-active'})}
      <div class="hero-slide-secondary" hidden>${picture('hero-interior','100vw',{classes:'hero-image hero-slide'})}</div>
      <div class="lamp-regions" hidden><button type="button" data-lamp="beige" data-figma-node="1:1004" aria-label="Lampa beżowa — światło" aria-pressed="false">${img('assets/images/lamp-beige.png',{eager:true})}</button><button type="button" data-lamp="green" data-figma-node="1:1003" aria-label="Lampa zielona — światło" aria-pressed="false">${img('assets/images/lamp-green.png',{eager:true})}</button><button type="button" data-lamp="terracotta" data-figma-node="1:1002" aria-label="Lampa terakotowa — światło" aria-pressed="false">${img('assets/images/lamp-terracotta.png',{eager:true})}</button></div>
      <div class="container hero-content"><p class="hero-eyebrow">Bestsellery SOLLUX</p><h1 id="hero-title">Kolor i forma<br> w nowym świetle</h1>${link('bestsellers','Sprawdź bestsellery','button button-yellow')}</div>
      <div class="hero-controls" hidden><button class="hero-arrow hero-arrow-left" type="button" aria-label="Poprzedni slajd" hidden>${icon('arrow-left')}</button><div class="hero-progress" role="group" aria-label="Wybierz slajd"><button type="button" data-slide="0" aria-label="Slajd 1 z 2" aria-current="true"><span></span></button><button type="button" data-slide="1" aria-label="Slajd 2 z 2"><span></span></button></div><button class="hero-arrow hero-arrow-right" type="button" aria-label="Następny slajd" hidden>${icon('arrow-right')}</button><button class="hero-pause" type="button">Wstrzymaj animację</button></div>
      <p class="visually-hidden hero-status" role="status" aria-live="polite"></p>
      <p class="review-badge" data-figma-node="1:524"><strong>4.8</strong>${icon('review-star')}<span>Uwielbiany przez klientów</span></p>
    </section>
    <section class="showcase" aria-labelledby="showcase-title" data-figma-node="1:593">
      <div class="container"><h2 id="showcase-title" class="visually-hidden">Odkryj świat SOLLUX</h2><ul class="benefits" aria-label="Dlaczego SOLLUX">${benefitsHtml}</ul><div class="promo-grid"><div class="promo-row">${cards.slice(0,2).join('\n')}</div><div class="promo-row promo-row-reversed">${cards.slice(2).join('\n')}</div></div></div>
    </section>
    <section class="light-section" aria-labelledby="light-title" data-figma-node="1:707">
      <div class="light-background" aria-hidden="true"><canvas class="light-canvas" aria-hidden="true" tabindex="-1"></canvas></div>
      <div class="light-content"><h2 id="light-title">Twoje wnętrze zasługuje na<br class="desktop-break"> wyjątkowe światło</h2>${link('buy-now','Kup teraz','button button-yellow')}<p>Od 119 zł na oficjalnej stronie<br> producenta SOLLUX</p></div>
      <button class="light-pause" type="button" aria-describedby="light-title" hidden>Wstrzymaj animację tła</button>
    </section>
  </main>
  <footer class="site-footer" data-figma-node="1:708">
    <div class="footer-top container"><div class="footer-brand">${link('home',img('assets/icons/sollux-dark.svg',{alt:'SOLLUX'}))}<div class="socials" aria-label="SOLLUX w mediach społecznościowych">${socials}</div></div><div class="footer-links">${footerNav}</div></div>
    <div class="footer-bottom container"><section class="footer-panel"><h2>Płatności i dostawy</h2><ul class="payment-logos" aria-label="Płatności i dostawy">${payments}</ul></section><section class="footer-panel"><h2>Nagrody</h2><ul class="award-logos" aria-label="Nagrody i wyróżnienia">${awards}</ul></section><section class="footer-panel"><h2>Nasze sklepy</h2><ul class="country-flags" aria-label="Sklepy SOLLUX w Europie">${flags}</ul></section></div>
    <div class="footer-caption container"><div class="vat-row"><p>W sklepie prezentujemy ceny brutto (z VAT). Stawki VAT dla konsumentów z kraju: Polska.</p><span class="caption-rule" aria-hidden="true">${img('assets/icons/footer-divider.svg')}</span><div class="partner-marks">${img('assets/icons/partner-idomods.svg',{alt:'Design & Code — IdoMods'})}${idosell}</div></div><address class="shop-contact"><span>NIP: 6070082443</span><span>${link('phone','+48 668 806 323')} <span class="opening-hours">(Pn - Pt 7:00 - 15:00)</span></span>${link('email','sklep@sollux.pl')}<span>Sollux Lighting Sp. z o.o.</span><span>Władysława Łokietka 35, 64-840 Budzyń (POLSKA)</span></address></div>
  </footer>
</body>
</html>
`;
await writeFile(path.join(root,'index.html'),html);
await writeFile(path.join(root,'docs/phase-2-content-decisions.json'),JSON.stringify({phase:2,decisions,unresolvedAsPlainText:['promotions','security','light-course'],cookies:'Native details disclosure: no optional cookies are used; links to the official store privacy notice.',sourceCopyCorrection:'Wpsółpraca → Współpraca',staticHero:'Slide one remains the no-JavaScript and image-failure fallback. Phase 4 progressively enables two slides with shared original copy/CTA.'},null,2)+'\n');
console.log('Built index.html with local assets and progressive navigation enhancement.');
