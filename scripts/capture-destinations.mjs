import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const anchors = JSON.parse((await readFile(path.join(root,'docs/references/storefront-links.json'),'utf8')).replace(/^\uFEFF/,''));
const mappings = [
  ['lamps','Lampy','Lampy'],['colors','Kolory','Kolory'],['rooms','Pomieszczenia','Pomieszczenia'],
  ['new','Nowości','Nowości'],['bestsellers','Bestsellery / Sprawdź bestsellery','Bestsellery'],
  ['configurator','Stwórz swoją lampę / Stwórz swój projekt / Konfigurator 3D','Konfigurator 3D'],
  ['catalogue','Sprawdź katalog','Sprawdź katalog'],['smart','Pobierz aplikacje na telefon','Pobierz aplikacje na telefon'],['thoro','Odwiedź sklep THORO','Odwiedź sklep THORO'],
  ['account','Konto','Konto'],['register','Zarejestruj się','Zarejestruj się'],['cart','Koszyk','Koszyk'],
  ['order-status','Status zamówienia','Status zamówienia'],['tracking','Śledzenie przesyłki','Śledzenie przesyłki'],['complaint','Chcę zareklamować produkt','Chcę zareklamować produkt'],
  ['exchange','Informacje o wymianie','Chcę wymienić towar'],['contact','Kontakt','Kontakt'],['shopping-list','Listy zakupowe','Listy zakupowe'],
  ['products-bought','Lista zakupionych produktów','Lista zakupionych produktów'],['transactions','Historia transakcji','Historia transakcji'],['discounts','Moje rabaty','Moje rabaty'],
  ['shipping','Sposoby wysyłki','Wysyłka'],['payments','Sposoby płatności','Sposoby płatności'],['terms','Regulamin sklepu','Regulamin sklepu'],['privacy','Polityka prywatności','Polityka prywatności'],
  ['faq','FAQ','FAQ'],['warranty','Gwarancja','Gwarancja'],['architect','Dla Architekta','Dla Architekta'],['models','Modele 3D','Modele 3D'],['distribution','Dystrybucja','Dystrybucja'],
];
const entries = mappings.map(([id,label,liveLabel])=>{
  const match=anchors.find(a=>a.Text===liveLabel&&!a.Href.startsWith('#'));
  if(!match)throw new Error(`Missing captured anchor: ${liveLabel}`);
  return {id,label,href:new URL(match.Href.replaceAll('&amp;','&'),'https://sollux.pl/').href,status:'observed-in-official-storefront',sourceLabel:liveLabel};
});
const extra=[
  ['home','SOLLUX','https://sollux.pl/'],['facebook','Facebook','https://www.facebook.com/solluxlighting1/'],['instagram','Instagram','https://www.instagram.com/sollux_lighting/'],['youtube','YouTube','https://www.youtube.com/@solluxlighting6441'],
  ['shop-pl','Polska','https://sollux.pl/'],['shop-de','Deutschland','https://sollux-lampen.de/'],['shop-es','España','https://sollux-lamparas.es/'],['shop-ro','România','https://sollux-lampi.ro/'],['shop-fr','France','https://sollux.fr/'],['shop-gb','United Kingdom','https://sollux-lamps.co.uk/'],['shop-nl','Nederland','https://sollux-lampen.nl/'],['shop-se','Sverige','https://sollux-lampor.se/'],
  ['phone','+48 668 806 323','tel:+48668806323'],['email','sklep@sollux.pl','mailto:sklep@sollux.pl'],
];
entries.push(...extra.map(([id,label,href])=>({id,label,href,status:'observed-in-official-storefront'})));
const unresolved = [
  {id:'promotions',label:'Promocje',reason:'No matching promotion link in the captured live header; do not guess a route.'},
  {id:'security',label:'Polityka bezpieczeństwa',reason:'No separately named policy link found; privacy policy is available but is not silently substituted.'},
  {id:'about',label:'O nas',reason:'No matching link found in the captured footer.'},
  {id:'light-course',label:'Kurs światła',reason:'No matching destination found in the captured footer.'},
  {id:'inspiration',label:'Inspiracje',reason:'The official blog exists at https://sollux.pl/pl/blog; mapping this label there is a proposal, not a source-confirmed match.'},
  {id:'premium',label:'Marka premium',reason:'https://thoro.pl/ is confirmed for the THORO card; using it for this footer label remains a proposal.'},
  {id:'tiktok',label:'TikTok',reason:'Figma contains TikTok artwork; the live page repeats the Instagram URL in its third social slot. Do not copy that mismatch or invent a TikTok account.'},
  {id:'cookies',label:'Zmień ustawienia ciasteczek',reason:'The live site uses a script-bound # action. Requires a meaningful local settings action in a later phase; it is not a portable destination.'},
  {id:'buy-now',label:'Kup teraz',reason:'Proposal: use the verified lamp catalogue destination. No link target is embedded in the raster shader reference.'},
];
const data={capturedOn:'2026-11-05',source:'https://sollux.pl/',evidence:'docs/references/storefront-links.json',verificationScope:'Destinations were read from official public HTML; authenticated workflows and transactions were not executed. Observed links are not a guarantee of all downstream page responses.',search:{action:'https://sollux.pl/pl/search',method:'get',queryParameter:'text',status:'observed-in-official-search-form'},entries,unresolved};
await writeFile(path.join(root,'docs/destinations.json'),JSON.stringify(data,null,2)+'\n');
console.log(`Captured ${entries.length} destinations and ${unresolved.length} explicit follow-ups.`);
