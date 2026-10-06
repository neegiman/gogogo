import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--port','3000'],{windowsHide:true,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
let log='';
server.stdout.on('data',d=>{log+=d.toString();});server.stderr.on('data',d=>{log+=d.toString();});
let browser;
try {
  const start=Date.now();
  while(!log.includes('Ready in')) {
    if(server.exitCode!==null||Date.now()-start>45000)throw new Error(`Development server did not start: ${log}`);
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge'});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await page.goto('http://localhost:3000/');await page.getByRole('button',{name:'사진 찍기'}).waitFor();
  await page.getByRole('button',{name:'샘플 퍼즐 해보기'}).click();await page.getByRole('button',{name:'붙이러 고고고!'}).click();
  await page.locator('.puzzle-piece').first().waitFor();
  if(await page.locator('.puzzle-piece').count()!==12)throw new Error('Development puzzle pieces missing');
  if(new URL(page.url()).pathname!=='/')throw new Error('Photo startup unexpectedly navigated away from the development root');
  await page.getByRole('link',{name:'처음으로',exact:true}).click();
  await page.getByRole('link',{name:'나의 기록'}).click();await page.getByRole('heading',{name:'반짝반짝, 나의 기록'}).waitFor();
  if(new URL(page.url()).pathname!=='/records/')throw new Error('Development records path incorrectly prefixed');
  await page.screenshot({path:'test-results/dev-mobile.png',fullPage:true});
  if(errors.length||failed.length)throw new Error(JSON.stringify({errors,failed}));
  console.log('Development verified: root routes, local sample editing, 12-piece puzzle, records navigation, no browser errors or resource 404s.');
} finally {
  if(browser)await browser.close();
  server.kill();
}
