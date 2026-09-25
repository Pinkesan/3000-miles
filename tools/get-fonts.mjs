// One-off: download the self-hosted fonts (latin + thai subsets) and their licenses into public/.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Overpass:ital,wght@0,400;0,600;0,800;1,700&family=Overpass+Mono:wght@600&family=Anuphan:wght@400;600&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

mkdirSync(path.join(PUB, 'fonts'), { recursive: true });
mkdirSync(path.join(PUB, 'css'), { recursive: true });
const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();

const out = [];
for (const m of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
  const [, subset, body] = m;
  if (subset !== 'latin' && subset !== 'thai') continue;
  const get = (re) => re.exec(body)?.[1]?.trim();
  const family = get(/font-family:\s*'([^']+)'/).replace(/\s+/g, '');
  const style = get(/font-style:\s*(\w+)/);
  const weight = get(/font-weight:\s*(\d+)/);
  const url = get(/url\(([^)]+)\)/);
  const range = get(/unicode-range:\s*([^;]+);/);
  const name = `${family}-${weight}${style === 'italic' ? '-italic' : ''}-${subset}.woff2`;
  writeFileSync(path.join(PUB, 'fonts', name), Buffer.from(await (await fetch(url)).arrayBuffer()));
  out.push(
    `@font-face {\n  font-family: '${get(/font-family:\s*'([^']+)'/)}';\n  font-style: ${style};\n  font-weight: ${weight};\n  font-display: swap;\n  src: url(../fonts/${name}) format('woff2');\n  unicode-range: ${range};\n}`,
  );
  console.log('font', name);
}
writeFileSync(path.join(PUB, 'css', 'fonts.css'), out.join('\n') + '\n');

for (const fam of ['overpass', 'overpassmono', 'anuphan']) {
  const r = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${fam}/OFL.txt`);
  if (!r.ok) throw new Error(`license ${fam}: ${r.status}`);
  writeFileSync(path.join(PUB, 'fonts', `OFL-${fam}.txt`), await r.text());
}
console.log('done');
