import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const base=(process.env.NEXT_PUBLIC_BASE_PATH ?? '/gogogo').replace(/\/$/,'');
const root=resolve('out');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.wav':'audio/wav'};
createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname===base && base) {res.writeHead(301,{Location:`${base}/`});res.end();return;}
    if(!url.pathname.startsWith(`${base}/`)) throw new Error('path');
    let file=resolve(root,decodeURIComponent(url.pathname.slice(base.length)).replace(/^\//,''));
    if(file!==root&&!file.startsWith(root+sep)) throw new Error('path');
    if((await stat(file)).isDirectory()) file=resolve(file,'index.html');
    const content=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(content);
  } catch {res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
}).listen(4173,'127.0.0.1',()=>console.log(`Static Pages preview: http://127.0.0.1:4173${base}/`));
