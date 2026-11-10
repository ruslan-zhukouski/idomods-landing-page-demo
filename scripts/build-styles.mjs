// One render-blocking request; readable source files remain the authoring API.
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const sources = ['assets/fonts/red-hat-display.css', 'styles/tokens.css', 'styles/main.css', 'styles/motion.css'];

// Preserve quoted strings and whitespace inside calc()/media expressions.
// Only remove comments, repeated whitespace, and spaces beside CSS punctuation.
export function minifyCss(source) {
  const tokens = source.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\/|[^"'/]+|./g);
  return tokens.map(token => {
    if (token.startsWith('/*')) return '';
    if (token.startsWith('"') || token.startsWith("'")) return token;
    return token.replace(/\s+/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1').replace(/;}/g, '}');
  }).join('').trim();
}

export async function buildStyles() {
  const files = await Promise.all(sources.map(async file => {
    let css = await readFile(new URL(file, root), 'utf8');
    if (file.startsWith('assets/fonts/')) css = css.replaceAll('url(./', 'url(../assets/fonts/');
    return css;
  }));
  await writeFile(new URL('styles/site.min.css', root), minifyCss(files.join('\n')) + '\n');
}
