import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (!process.argv[2]) throw new Error('Usage: node scripts/import-jump.mjs SOURCE_DIST');
const source = resolve(process.argv[2]);
const checkout = fileURLToPath(new URL('../', import.meta.url));
const target = join(checkout, 'public/jump');
const hash = data => createHash('sha256').update(data).digest('hex').slice(0, 12);
const metadata = JSON.parse(await readFile(join(checkout, 'package.json'), 'utf8'));
if (metadata.name !== 'photo-puzzle') throw new Error('Expected the gogogo checkout.');
await mkdir(target, { recursive: true });
await access(join(target, 'jua-regular.ttf'));
await access(join(target, 'OFL.txt'));

// Keep this Pages game self-contained, including its display font. All asset
// URLs remain relative so both development and /gogogo/ hosting work.
let style = await readFile(join(source, 'style.css'), 'utf8');
style = style.replace(/^@import[^\r\n]+[\r\n]+/, '');
style = `@font-face{font-family:Jua;src:url('./jua-regular.ttf') format('truetype');font-style:normal;font-weight:400;font-display:swap}\n${style}`;
style = style.replaceAll("'Noto Sans KR',sans-serif", "system-ui,-apple-system,'Malgun Gothic',sans-serif");
const assets = {
  style: { extension: 'css', content: style },
  sound: { extension: 'js', content: await readFile(join(source, 'sound.js'), 'utf8') },
  game: { extension: 'js', content: await readFile(join(source, 'game.js'), 'utf8') },
};
let html = await readFile(join(source, 'index.html'), 'utf8');
for (const [name, asset] of Object.entries(assets)) {
  const filename = `${name}-${hash(asset.content)}.${asset.extension}`;
  await writeFile(join(target, filename), asset.content);
  const reference = new RegExp(`\\./${name}\\.${asset.extension}(?:\\?[^"']*)?`, 'g');
  if (!reference.test(html)) throw new Error(`Missing ${name} asset reference.`);
  html = html.replace(reference, `./${filename}`);
}
html = html.replace('href="./" aria-label="콩콩 놀이터 홈"', 'href="../" aria-label="고고고 게임 메뉴로 돌아가기"');
await writeFile(join(target, 'favicon.svg'), await readFile(join(source, 'favicon.svg')));
await writeFile(join(target, 'index.html'), html);

const headerPath = join(checkout, 'src/components/Header.tsx');
let header = await readFile(headerPath, 'utf8');
const link = `<a href={assetPath('jump/index.html?v=${hash(html)}')} className="nav-link">점프</a>`;
const jumpLink = /<a href=\{assetPath\('jump\/index\.html(?:\?v=[a-f0-9]+)?'\)\} className="nav-link">점프<\/a>/;
if (jumpLink.test(header)) header = header.replace(jumpLink, link);
else {
  const blockLink = /<a href=\{assetPath\('blocks\/index\.html(?:\?v=[a-f0-9]+)?'\)\} className="nav-link">말랑 블록<\/a>/;
  if (!blockLink.test(header)) throw new Error('Could not find the block menu insertion point.');
  header = header.replace(blockLink, match => `${match}${link}`);
}
await writeFile(headerPath, header);
console.log(`Added the rhythm jump game and 점프 menu: public/jump/index.html?v=${hash(html)}`);
