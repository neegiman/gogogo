import { readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base=(process.env.NEXT_PUBLIC_BASE_PATH ?? '/gogogo').replace(/\/$/,'');
async function walk(dir,prefix='') { const entries=await readdir(dir,{withFileTypes:true});const groups=await Promise.all(entries.map(e=>e.isDirectory()?walk(`${dir}/${e.name}`,`${prefix}${e.name}/`):[`${prefix}${e.name}`]));return groups.flat(); }
// Next's segment prefetch requests use dotted names. On this Windows export,
// some segment data is emitted in nested directories; add static aliases so
// plain hosting can serve those requests without rewrites or a runtime server.
for (const file of await walk('out')) {
  const marker=file.indexOf('__next.');
  if(marker>=0 && file.slice(marker).includes('/')) {
    const alias=file.slice(0,marker)+file.slice(marker).replaceAll('/','.');
    await copyFile(`out/${file}`,`out/${alias}`);
  }
}
const files=(await walk('out')).filter(file=>!['sw.js','.nojekyll'].includes(file));
const hash=createHash('sha256');
for(const file of files.sort()) { hash.update(file);hash.update(await readFile(`out/${file}`)); }
const version=`photo-puzzle-v1-${hash.digest('hex').slice(0,16)}`;
const assets=files.map(file=>`${base}/${file}`);
for(const route of ['', 'puzzle/', 'records/']) assets.push(`${base}/${route}`);
const sw=`/* Generated from the actual static export. No photos enter this cache. */
const CACHE = ${JSON.stringify(version)};
const BASE = ${JSON.stringify(`${base}/`)};
const ASSETS = ${JSON.stringify(assets)};
const ALLOWED = new Set(ASSETS);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  // Updates activate after existing tabs close, keeping in-progress puzzles safe.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('photo-puzzle-v1-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE) || !ALLOWED.has(url.pathname)) return;
  // Only generated application files can be read or cached. blob: URLs are excluded.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (request.mode === 'navigate') {
      try { const response = await fetch(request); if (response.ok) return response; } catch {}
      return (await cache.match(url.pathname)) || Response.error();
    }
    const cached = await cache.match(url.pathname);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(url.pathname, response.clone());
    return response;
  })());
});
`;
await writeFile('out/sw.js',sw);
await writeFile('out/.nojekyll','');
console.log(`Static export ready: ${assets.length} offline resources, scope ${base}/, cache ${version}`);
