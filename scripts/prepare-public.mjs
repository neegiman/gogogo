import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
await mkdir('public/icons', { recursive: true });
await mkdir('public/sounds', { recursive: true });
// Relative URLs resolve against the manifest location in dev and any repository path.
await writeFile('public/manifest.webmanifest', JSON.stringify({
  id: './', name: '고고고! 사진퍼즐', short_name: '고고고!', lang: 'ko',
  description: '찍고, 자르고, 붙이고. 고고고! 내 사진으로 만드는 즐거운 퍼즐.',
  start_url: './', scope: './', display: 'standalone', background_color: '#fff6fa', theme_color: '#fff6fa',
  icons: [192,512].map(size=>({ src:`icons/icon-${size}.png`, sizes:`${size}x${size}`, type:'image/png', purpose:'any maskable' })),
}, null, 2));
function crc32(buffer) { let crc = 0xffffffff; for (const byte of buffer) { crc ^= byte; for (let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); } return (crc^0xffffffff)>>>0; }
function chunk(type,data) { const name=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([len,name,data,crc]); }
for (const size of [192,512]) {
  const pixels=Buffer.alloc((size*4+1)*size);
  for (let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const nx=x/size,ny=y/size;
    let color=[255,246,250];
    if(nx>.2&&nx<.8&&ny>.2&&ny<.8) {
      color = nx<.5 ? (ny<.5?[185,56,107]:[231,107,149]) : (ny<.5?[236,132,166]:[244,175,200]);
      if (Math.abs(nx-.5)<.011 || Math.abs(ny-.5)<.011) color=[255,246,250];
    }
    // Rounded interlocking tabs, with room for adaptive icon cropping.
    for (const [cx,cy,r,c] of [[.5,.35,.055,[185,56,107]],[.65,.5,.055,[236,132,166]],[.35,.5,.055,[231,107,149]],[.5,.65,.055,[244,175,200]]]) if(Math.hypot(nx-cx,ny-cy)<r) color=c;
    const offset=y*(size*4+1)+1+x*4;pixels.set([...color,255],offset);
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  await writeFile(`public/icons/icon-${size}.png`,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]));
}
// Original soft chimes synthesized at build time; no external audio or runtime synthesis.
for(const [name,notes] of [['piece-correct',[659.25,880]],['puzzle-complete',[523.25,659.25,783.99,1046.5]]]) {
  const rate=22050,noteLength=.18,duration=notes.length*noteLength+.2,samples=Math.floor(rate*duration),data=Buffer.alloc(samples*2);
  for(let i=0;i<samples;i++) {
    const time=i/rate;
    let sample=0;
    notes.forEach((note,index)=> { const t=time-index*noteLength;if(t>=0&&t<.4) sample+=Math.sin(2*Math.PI*note*t)*Math.exp(-t*11)*Math.min(1,t*130)*.28; });
    data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,sample))*32767),i*2);
  }
  const wav=Buffer.alloc(44);wav.write('RIFF');wav.writeUInt32LE(36+data.length,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(data.length,40);
  await writeFile(`public/sounds/${name}.wav`,Buffer.concat([wav,data]));
}
await writeFile('public/sw.js', '// Development placeholder. npm run build generates a versioned asset-only offline worker in out/sw.js.\n');
await writeFile('public/.nojekyll','');
console.log('Local manifest, icons and sounds ready.');
