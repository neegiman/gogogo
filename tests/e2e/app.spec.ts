import { test, expect, type Page } from '@playwright/test';
declare global { interface Window { puzzleSounds: string[] } }
const root = '/gogogo/';
async function prepare(page: Page, count = 12) {
  await page.goto(root);
  await page.getByRole('button', { name: '샘플 퍼즐 해보기' }).click();
  await expect(page.getByRole('heading', { name: '사진을 예쁘게 맞춰요' })).toBeVisible();
  await page.locator('.difficulty-card').filter({ hasText: `${count}개` }).click();
  await page.getByRole('button', { name: '붙이러 고고고!' }).click();
  await expect(page.locator('.puzzle-piece')).toHaveCount(count);
  const compact = await page.evaluate(() => matchMedia('(max-width: 600px), (max-height: 520px)').matches);
  await expect(page.locator('.tray-area')).toHaveAttribute('data-paged', String(compact));
}
async function revealPiece(page: Page, id: string) {
  const piece=page.locator(`[data-piece-id="${id}"]`);
  await expect(piece).toHaveCount(1);
  if(await piece.isVisible()) return;
  const index=await piece.evaluate(node=>Array.from(node.closest('.piece-tray')!.children).indexOf(node.parentElement!));
  const targetPage=Math.floor(index/6)+1;
  for(let i=0;i<8 && !(await piece.isVisible());i++) {
    const current=Number(await page.locator('.tray-page-count strong').innerText());
    if(current===targetPage) break;
    const button=page.getByRole('button',{name:current>targetPage?'이전 조각':'다음 조각'});
    try { await button.click({timeout:1500}); }
    catch(error) { if(await button.isEnabled()) throw error; }
  }
  await expect(piece).toBeVisible();
}
async function tapPlace(page: Page, id: string, targetId=id) {
  await revealPiece(page,id);
  if (await page.evaluate(()=>navigator.maxTouchPoints>0)) {
    await page.locator(`[data-piece-id="${id}"]`).tap();
    await page.locator(`[data-target-id="${targetId}"]`).tap();
  } else {
    await page.locator(`[data-piece-id="${id}"]`).click();
    await page.locator(`[data-target-id="${targetId}"]`).click();
  }
  await expect(page.locator(`[data-target-id="${targetId}"]`)).toHaveAttribute('data-placed-piece-id',id);
}
async function returnPlaced(page: Page, cellId: string) {
  const cell=page.locator(`[data-target-id="${cellId}"]`);
  if(await page.evaluate(()=>navigator.maxTouchPoints>0)) {
    await cell.tap();await cell.tap();
  } else await cell.dblclick({delay:80});
}
test('Pages assets, install metadata and offline cache are complete', async ({ page, request }, info) => {
  const errors: string[] = [], failed: string[] = [];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('response', r=>{ if(r.status()>=400) failed.push(r.url()); });
  await page.goto(root);
  await expect(page.getByRole('button', { name: '사진 찍기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '사진 선택', exact: true })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect(page.getByText('오프라인에서도 놀 수 있어요')).toBeVisible();
  const manifest = await (await request.get(`${root}manifest.webmanifest`)).json();
  expect(manifest.name).toBe('고고고! 사진퍼즐');
  expect(manifest.short_name).toBe('고고고!');
  await expect(page).toHaveTitle(/고고고! 사진퍼즐/);
  expect(new URL(manifest.start_url,`http://127.0.0.1:4173${root}manifest.webmanifest`).pathname).toBe(root);
  expect(new URL(manifest.scope,`http://127.0.0.1:4173${root}manifest.webmanifest`).pathname).toBe(root);
  for(const path of ['icons/icon-192.png','icons/icon-512.png','sounds/piece-correct.wav','sounds/puzzle-complete.wav','sw.js','puzzle/','records/']) expect((await request.get(`${root}${path}`)).status()).toBe(200);
  const resources = await page.evaluate(async()=>{
    const names=(await caches.keys()).filter(n=>n.startsWith('photo-puzzle-v1-'));
    const cache=await caches.open(names[0]);return (await cache.keys()).map(r=>r.url);
  });
  expect(resources.length).toBeGreaterThan(15);
  for(const url of resources) expect((await request.get(url)).status(),url).toBe(200);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/home-${info.project.name}.png`,fullPage:true});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
for(const count of [12,16,20,24]) test(`${count} pieces: free placement, whole-board challenge, return, retry and persisted records`,async({page},info)=>{
  const failed: string[]=[], uploads: string[]=[];
  page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))uploads.push(r.method()+' '+r.url());});
  await page.addInitScript(()=>{
    Object.defineProperty(window,'puzzleSounds',{value:[],configurable:true});
    HTMLMediaElement.prototype.play=function(){
      (window as Window & {puzzleSounds:string[]}).puzzleSounds.push(this.src);
      return Promise.resolve();
    };
  });
  await prepare(page,count);
  await expect(page.getByRole('button',{name:'도전!',exact:true})).toBeDisabled();
  const pieces=await page.locator('.puzzle-piece').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-piece-id')!));
  // Both incorrect positions are accepted with the same neutral appearance.
  await tapPlace(page,pieces[0],pieces[1]);
  await expect(page.locator(`[data-target-id="${pieces[1]}"]`)).toHaveAttribute('data-placed-piece-id',pieces[0]);
  await expect(page.locator('.board-cell.occupied')).toHaveCount(1);
  await expect(page.locator('.board-cell:disabled')).toHaveCount(0);
  await tapPlace(page,pieces[1],pieces[0]);
  for(const id of pieces.slice(2)) await tapPlace(page,id);
  await expect(page.locator('.board-cell.occupied')).toHaveCount(count);
  await expect(page.locator('.puzzle-piece')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'퍼즐 완성!'})).toHaveCount(0);
  expect(await page.evaluate(()=>(window as Window & {puzzleSounds:string[]}).puzzleSounds)).toEqual([]);
  const before=await page.locator('.board-cell').evaluateAll(nodes=>nodes.map(n=>({piece:n.getAttribute('data-placed-piece-id'),className:n.className,disabled:(n as HTMLButtonElement).disabled})));
  await page.getByRole('button',{name:'도전!',exact:true}).click();
  await expect(page.getByText('조각을 살펴보고 다시 도전해요!',{exact:true})).toBeVisible();
  await expect(page.locator('.challenge-feedback')).toHaveCount(1);
  const notice = (await page.locator('.challenge-feedback').boundingBox())!, viewport = page.viewportSize()!;
  expect(notice.x + notice.width / 2).toBeCloseTo(viewport.width / 2, 0);
  expect(notice.y + notice.height / 2).toBeCloseTo(viewport.height / 2, 0);
  expect(await page.locator('.board-cell').evaluateAll(nodes=>nodes.map(n=>({piece:n.getAttribute('data-placed-piece-id'),className:n.className,disabled:(n as HTMLButtonElement).disabled})))).toEqual(before);
  await expect(page.getByRole('heading',{name:'퍼즐 완성!'})).toHaveCount(0);
  expect(await page.evaluate(()=>(window as Window & {puzzleSounds:string[]}).puzzleSounds)).toEqual([]);
  await expect(page.locator('.challenge-feedback-layer')).toHaveCount(0);
  await page.getByRole('button',{name:'다시 도전!',exact:true}).click();
  await expect(page.locator('.challenge-feedback')).toHaveCount(1);
  await expect(page.locator('.challenge-feedback-layer')).toHaveCount(0);
  await expect(page.locator('.board-cell:disabled')).toHaveCount(0);
  // Original remains visible even when every cell has an opaque photo piece.
  await page.getByRole('button',{name:'원본 보기'}).click();await expect(page.getByRole('dialog',{name:'원본 사진'})).toBeVisible();
  await expect(page.locator('.original-guide')).toHaveCSS('opacity','1');
  await page.getByRole('button',{name:'닫고 이어하기'}).click();await expect(page.locator('.original-guide')).toHaveCount(0);
  // Double click/tap returns even a correct piece, not only incorrect pieces.
  await returnPlaced(page,pieces[2]);await expect(page.locator(`[data-piece-id="${pieces[2]}"]`)).toBeVisible();
  await tapPlace(page,pieces[2]);
  await returnPlaced(page,pieces[1]);await returnPlaced(page,pieces[0]);
  await expect(page.getByRole('button',{name:'다시 도전!',exact:true})).toBeDisabled();
  await tapPlace(page,pieces[0]);await tapPlace(page,pieces[1]);
  await expect(page.getByRole('heading',{name:'퍼즐 완성!'})).toHaveCount(0);
  await page.screenshot({path:`test-results/playing-${count}-${info.project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:'다시 도전!',exact:true}).click();
  await expect(page.getByRole('heading',{name:'퍼즐 완성!'})).toBeVisible();
  await expect(page.locator('.challenge-feedback')).toHaveCount(1);
  await expect(page.locator('.challenge-feedback-layer')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'퍼즐 완성!'})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'나의 완성 기록'})).toBeVisible();
  await expect(page.getByText('이 기기에 기록을 저장했어요.')).toBeVisible();
  await expect(page.getByText('힌트 0번',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as Window & {puzzleSounds:string[]}).puzzleSounds.length)).toBe(1);
  await page.screenshot({path:`test-results/complete-${count}-${info.project.name}.png`});
  await page.getByRole('link',{name:'기록 보기',exact:true}).click();
  await expect(page.locator('.record-row')).toHaveCount(1);
  await page.reload();await expect(page.locator('.record-row')).toHaveCount(1);
  await page.getByRole('button',{name:'기록 삭제',exact:true}).click();
  await page.getByRole('button',{name:'그대로 둘래요'}).click();await expect(page.locator('.record-row')).toHaveCount(1);
  await page.getByRole('button',{name:'기록 삭제',exact:true}).click();await page.getByRole('button',{name:'모두 지우기'}).click();
  await expect(page.locator('.record-row')).toHaveCount(0);await page.reload();await expect(page.locator('.record-row')).toHaveCount(0);
  expect(failed).toEqual([]);expect(uploads).toEqual([]);
});
test('keyboard selection, free placement and return work without dragging',async({page})=>{
  await prepare(page);
  const piece=page.locator('.puzzle-piece').first(),id=(await piece.getAttribute('data-piece-id'))!;
  await piece.focus();await page.keyboard.press('Enter');
  await expect(piece).toHaveAttribute('aria-pressed','true');
  const target=page.locator('[data-target-id]').first();
  await target.focus();await page.keyboard.press('Space');
  await expect(target).toHaveAttribute('data-placed-piece-id',id);
  await page.keyboard.press('Delete');
  await expect(target).not.toHaveAttribute('data-placed-piece-id',id);
  await expect(page.locator(`[data-piece-id="${id}"]`)).toBeVisible();
});

test('local photos crop and start with 12 selected without touching difficulty', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const [width, height, viewport] of [[800, 1100, 320], [1400, 900, 375], [4000, 3000, 430]]) {
    await page.setViewportSize({ width: viewport, height: 844 }); await page.goto(root);
    await expect(page.locator('.difficulty-card[aria-pressed="true"]')).toContainText('12');
    const buffer = Buffer.from(await page.evaluate(({ width, height }) => {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#e090b4'; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#894f72'; ctx.fillRect(width / 4, height / 3, width / 2, height / 3);
      return canvas.toDataURL('image/jpeg').split(',')[1];
    }, { width, height }), 'base64');
    await page.getByLabel('기기 사진 선택').setInputFiles({ name: 'my-photo.jpg', mimeType: 'image/jpeg', buffer });
    await expect(page.getByText('12개 선택됨')).toBeVisible();
    await expect(page.locator('.difficulty-card[aria-pressed="true"]')).toContainText('12');
    await expect(page.locator('.difficulty-check')).toHaveCount(1);
    await expect(page.locator('.crop-grid line')).toHaveCount(5);
    const start = page.getByRole('button', { name: '붙이러 고고고!' }); await expect(start).toBeEnabled();
    await page.getByRole('button', { name: '90° 회전' }).click();
    await page.getByRole('button', { name: '사진 확대', exact: true }).click();
    await start.click();
    await expect(page.locator('.board-cell')).toHaveCount(12);
    await expect(page.locator('.puzzle-piece')).toHaveCount(12);
    await expect(page.getByRole('heading', { name: '어떤 사진으로 놀까요?' })).toHaveCount(0);
    expect(await page.locator('.puzzle-piece canvas').first().evaluate((canvas: HTMLCanvasElement) => canvas.getContext('2d')!.getImageData(1, 1, 1, 1).data[3])).toBe(255);
  }
  expect(errors).toEqual([]);
});

test('a crop failure is explained and the start button can be retried', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(root); await page.getByRole('button', { name: '샘플 퍼즐 해보기' }).click();
  await expect(page.getByRole('button', { name: '붙이러 고고고!' })).toBeEnabled();
  await page.evaluate(() => {
    let fail = true;
    HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
      apply(target, canvas: HTMLCanvasElement, args) {
        if (fail && !canvas.isConnected && canvas.width === 1024 && canvas.height === 1024) { fail = false; return null; }
        return Reflect.apply(target, canvas, args);
      },
    });
  });
  await page.getByRole('button', { name: '붙이러 고고고!' }).click();
  await expect(page.locator('.editor-card .error-notice')).toContainText('잠시 후 다시');
  await expect(page.getByRole('button', { name: '붙이러 고고고!' })).toBeEnabled();
  await page.getByRole('button', { name: '붙이러 고고고!' }).click();
  await expect(page.locator('.board-cell')).toHaveCount(12); expect(errors).toEqual([]);
});

test('hints swap incorrect full boards at all difficulties, stop after three and reset on replay', async ({ page }) => {
  test.setTimeout(90000);
  for (const count of [12, 16, 20, 24]) {
    await prepare(page, count);
    const ids = await page.locator('.puzzle-piece').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-piece-id')!));
    for (let i = 0; i < ids.length; i++) await tapPlace(page, ids[(i + 1) % ids.length], ids[i]);
    for (let used = 0; used < 3; used++) {
      const before = await page.locator('.board-cell').evaluateAll(nodes => nodes.map(node => ({ cell: node.getAttribute('data-target-id')!, piece: node.getAttribute('data-placed-piece-id')! })));
      const candidate = before.find(item => item.cell !== item.piece)!.cell;
      await page.getByRole('button', { name: `힌트 ${3 - used}번 남음` }).click();
      await expect(page.locator(`[data-target-id="${candidate}"]`)).toHaveAttribute('data-placed-piece-id', candidate);
      const after = await page.locator('.board-cell').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placed-piece-id')!));
      expect(new Set(after).size).toBe(count);
      for (const item of before.filter(item => item.cell === item.piece)) await expect(page.locator(`[data-target-id="${item.cell}"]`)).toHaveAttribute('data-placed-piece-id', item.piece);
      await expect(page.getByRole('heading', { name: '퍼즐 완성!' })).toHaveCount(0);
    }
    await expect(page.getByRole('button', { name: '힌트 0번 남음' })).toBeDisabled();
    const cells = await page.locator('.board-cell').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-target-id')!));
    for (const cell of cells) await returnPlaced(page, cell);
    for (const id of ids) await tapPlace(page, id);
    await page.getByRole('button', { name: '도전!', exact: true }).click();
    await expect(page.getByRole('heading', { name: '퍼즐 완성!' })).toBeVisible();
    await expect(page.getByText('힌트 3번', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '다시 하기' }).click();
    await expect(page.getByRole('button', { name: '힌트 3번 남음' })).toBeEnabled();
    await expect(page.locator('.board-cell.occupied')).toHaveCount(0);
  }
});

test('hints place missing pieces but never finish automatically or grant a fourth hint', async ({ page }) => {
  await prepare(page);
  for (let used = 0; used < 3; used++) {
    await page.getByRole('button', { name: `힌트 ${3 - used}번 남음` }).click();
    await expect(page.locator(`[data-target-id="piece-${used}"]`)).toHaveAttribute('data-placed-piece-id', `piece-${used}`);
  }
  await expect(page.locator('.board-cell.occupied')).toHaveCount(3);
  await expect(page.getByRole('button', { name: '힌트 0번 남음' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '도전!', exact: true })).toBeDisabled();
  await returnPlaced(page, 'piece-2');
  await expect(page.locator('.board-cell.occupied')).toHaveCount(2);
  await expect(page.getByRole('button', { name: '힌트 0번 남음' })).toBeDisabled();
});
test('local photo processing, crop, rotation, cancel and reload recovery',async({page})=>{
  await page.goto(root);
  const makePhoto=async(width:number,height:number)=>Buffer.from(await page.evaluate(async({width,height})=>{
    const img=new Image();img.src='/gogogo/sample.svg';await img.decode();
    const c=document.createElement('canvas');c.width=width;c.height=height;c.getContext('2d')!.drawImage(img,0,0,width,height);
    return c.toDataURL('image/jpeg',.88).split(',')[1];
  },{width,height}),'base64');
  for(const [width,height] of [[900,1200],[1600,900],[4000,3000]]) {
    await page.getByLabel('기기 사진 선택').setInputFiles({name:'local-photo.jpg',mimeType:'image/jpeg',buffer:await makePhoto(width,height)});
    await expect(page.locator('.crop-frame canvas')).toBeVisible();
    const before=await page.locator('.crop-frame canvas').evaluate((c:HTMLCanvasElement)=>c.toDataURL());
    await page.getByRole('button',{name:'90° 회전'}).click();
    await expect.poll(()=>page.locator('.crop-frame canvas').evaluate((c:HTMLCanvasElement)=>c.toDataURL())).not.toBe(before);
    await page.getByRole('button',{name:'사진 확대',exact:true}).click();
    await expect(page.getByRole('slider')).toHaveValue('1.2');
    const canvas=page.locator('.crop-frame canvas'),box=(await canvas.boundingBox())!;
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.6,{steps:10});await page.mouse.up();
    await page.getByRole('button',{name:'처음 상태로'}).click();await expect(page.getByRole('slider')).toHaveValue('1');
    await page.getByRole('button',{name:'다른 사진',exact:true}).click();
  }
  // JPEG EXIF orientation 6 rotates a landscape sensor image clockwise.
  const raw=Buffer.from(await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=400;c.height=200;const ctx=c.getContext('2d')!;
    for(const [x,y,color] of [[0,0,'#ff0000'],[200,0,'#00ff00'],[0,100,'#0000ff'],[200,100,'#ffff00']] as const){ctx.fillStyle=color;ctx.fillRect(x,y,200,100);}
    return c.toDataURL('image/jpeg',1).split(',')[1];
  }),'base64');
  const exif=Buffer.alloc(36);exif.writeUInt16BE(0xffe1,0);exif.writeUInt16BE(34,2);exif.write('Exif\0\0',4,'binary');exif.write('II',10);exif.writeUInt16LE(42,12);exif.writeUInt32LE(8,14);exif.writeUInt16LE(1,18);exif.writeUInt16LE(0x0112,20);exif.writeUInt16LE(3,22);exif.writeUInt32LE(1,24);exif.writeUInt16LE(6,28);
  await page.getByLabel('기기 사진 선택').setInputFiles({name:'camera-orientation.jpg',mimeType:'image/jpeg',buffer:Buffer.concat([raw.subarray(0,2),exif,raw.subarray(2)])});
  await expect.poll(async()=>page.locator('.crop-frame canvas').evaluate((c:HTMLCanvasElement)=>{
    const ctx=c.getContext('2d')!,left=ctx.getImageData(c.width*.15,c.height*.15,1,1).data,right=ctx.getImageData(c.width*.85,c.height*.15,1,1).data;
    return left[2]>180&&left[0]<80&&right[0]>180&&right[2]<80;
  })).toBe(true);
  await page.getByRole('button',{name:'다른 사진',exact:true}).click();
  await page.getByLabel('기기 사진 선택').setInputFiles([]);await expect(page.getByRole('heading',{name:'찍고, 자르고, 붙이고. 고고고!'})).toBeVisible();
  await page.getByLabel('기기 사진 선택').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('no photo')});
  await expect(page.locator('.error-notice')).toContainText('사진 파일');
  await page.getByLabel('기기 사진 선택').setInputFiles({name:'broken.jpg',mimeType:'image/jpeg',buffer:Buffer.from('not a jpeg')});
  await expect(page.locator('.error-notice')).toContainText('열 수 없어요');
  await page.getByRole('button',{name:'샘플 퍼즐 해보기'}).click();await expect(page.locator('.crop-frame')).toBeVisible();await page.reload();
  await expect(page.getByRole('button',{name:'사진 찍기'})).toBeVisible();
  await prepare(page);await page.reload();await expect(page.getByRole('heading',{name:'어떤 사진으로 놀까요?'})).toBeVisible();
});
test('offline launch, local file selection, play and IndexedDB work without a network',async({page,context})=>{
  await page.goto(root);await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await expect(page.getByText('오프라인에서도 놀 수 있어요')).toBeVisible();
  await page.reload();
  await context.setOffline(true);await page.reload();
  await expect(page.getByRole('button',{name:'사진 선택',exact:true})).toBeVisible();
  // A user file, not just the bundled sample, goes through offline decoding and editing.
  const buffer=Buffer.from(await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=800;c.height=1100;const ctx=c.getContext('2d')!;
    const g=ctx.createLinearGradient(0,0,800,1100);g.addColorStop(0,'#da9b67');g.addColorStop(1,'#4b8d78');ctx.fillStyle=g;ctx.fillRect(0,0,800,1100);
    return c.toDataURL('image/png').split(',')[1];
  }),'base64');
  await page.getByLabel('기기 사진 선택').setInputFiles({name:'offline-local.png',mimeType:'image/png',buffer});
  await page.getByRole('button',{name:'붙이러 고고고!'}).click();await expect(page.locator('.puzzle-piece')).toHaveCount(12);
  const ids=await page.locator('.puzzle-piece').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-piece-id')!));
  for(const id of ids) await tapPlace(page,id);
  await page.getByRole('button',{name:'도전!',exact:true}).click();
  await expect(page.getByText('이 기기에 기록을 저장했어요.')).toBeVisible();await page.getByRole('link',{name:'기록 보기',exact:true}).click();
  await expect(page).toHaveURL(/\/gogogo\/records\/$/);await expect(page.locator('.record-row')).toHaveCount(1);
  await page.reload();await expect(page.locator('.record-row')).toHaveCount(1);
  const cached=await page.evaluate(async()=>{const keys=await caches.keys();const lists=await Promise.all(keys.map(async k=>(await(await caches.open(k)).keys()).map(r=>r.url)));return lists.flat();});
  expect(cached.every(url=>url.startsWith('http://127.0.0.1:4173/gogogo/'))).toBe(true);expect(cached.some(url=>url.startsWith('blob:'))).toBe(false);
});
test('sound preference persists and optional browser features fail gracefully',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'vibrate',{value:undefined,configurable:true});
    HTMLMediaElement.prototype.play=()=>Promise.reject(new Error('audio unavailable'));
  });
  await page.goto(root);await page.getByRole('button',{name:'소리 끄기'}).click();await page.reload();await expect(page.getByRole('button',{name:'소리 켜기'})).toBeVisible();
  await page.getByRole('button',{name:'소리 켜기'}).click();await prepare(page);
  const ids=await page.locator('.puzzle-piece').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-piece-id')!));
  for(const id of ids) await tapPlace(page,id);
  await page.getByRole('button',{name:'도전!',exact:true}).click();
  await expect(page.getByRole('heading',{name:'퍼즐 완성!'})).toBeVisible();await page.getByRole('button',{name:'다시 하기'}).click();await expect(page.locator('.puzzle-piece')).toHaveCount(12);await expect(page.locator('.board-cell.occupied')).toHaveCount(0);
});
test('native taps, double taps, pinch zoom and viewport changes',async({page,context},info)=>{
  test.skip(info.project.name!=='touch','Requires native touch emulation');
  await page.goto(root);await page.getByRole('button',{name:'샘플 퍼즐 해보기'}).click();
  const cdp=await context.newCDPSession(page);
  const crop=(await page.locator('.crop-frame canvas').boundingBox())!;
  const cx=crop.x+crop.width/2,cy=crop.y+crop.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-30,y:cy,id:1},{x:cx+30,y:cy,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-60,y:cy,id:1},{x:cx+60,y:cy,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(async()=>Number(await page.getByRole('slider').inputValue())).toBeGreaterThan(1.5);
  await page.getByRole('button',{name:'붙이러 고고고!'}).tap();
  const piece=page.locator('.puzzle-piece').first(),id=(await piece.getAttribute('data-piece-id'))!;
  const target=page.locator(`[data-target-id="${await page.locator('[data-target-id]').first().getAttribute('data-target-id')}"]`);
  async function nativeTap(locator: ReturnType<typeof page.locator>) {
    await locator.scrollIntoViewIfNeeded();const box=(await locator.boundingBox())!;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await nativeTap(piece);await expect(piece).toHaveAttribute('aria-pressed','true');
  await nativeTap(target);await expect(target).toHaveAttribute('data-placed-piece-id',id);
  await nativeTap(target);await nativeTap(target);
  await expect(page.locator('.board-cell.occupied')).toHaveCount(0);
  await expect(page.locator(`[data-piece-id="${id}"]`)).toBeVisible();
  await piece.scrollIntoViewIfNeeded();const box=(await piece.boundingBox())!;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2-35,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await expect(page.locator('.board-cell.occupied')).toHaveCount(0);
  await tapPlace(page,id);await expect(page.locator('.board-cell.occupied')).toHaveCount(1);
  await page.setViewportSize({width:740,height:390});await expect(page.locator('.board-cell.occupied')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.setViewportSize({width:320,height:640});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const lastId=(await page.locator('.puzzle-piece').last().getAttribute('data-piece-id'))!;
  await tapPlace(page,lastId);await expect(page.locator('.board-cell.occupied')).toHaveCount(2);
  await returnPlaced(page,lastId);await expect(page.locator(`[data-piece-id="${lastId}"]`)).toBeVisible();
  await cdp.detach();
});
test('IndexedDB failure preserves a cheerful completed puzzle',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'indexedDB',{get(){throw new Error('storage denied');},configurable:true}));
  await prepare(page);
  const ids=await page.locator('.puzzle-piece').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-piece-id')!));
  for(const id of ids) await tapPlace(page,id);
  await page.getByRole('button',{name:'도전!',exact:true}).click();
  await expect(page.getByRole('heading',{name:'퍼즐 완성!'})).toBeVisible();
  await expect(page.getByText('퍼즐은 완성했어요!',{exact:false})).toBeVisible();
});
test('phone tray paging, automatic advancement and reachable editor actions',async({page},info)=>{
  test.skip(info.project.name!=='touch','Phone layout checks');
  for(const width of [320,375,390,430]) {
    await page.setViewportSize({width,height:844});await page.goto(root);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const camera=(await page.getByRole('button',{name:'사진 찍기'}).boundingBox())!;
    expect(camera.height).toBeGreaterThanOrEqual(56);expect(camera.y+camera.height).toBeLessThan(844);
  }
  await page.getByRole('button',{name:'샘플 퍼즐 해보기'}).tap();
  const start=page.getByRole('button',{name:'붙이러 고고고!'}),first=(await start.boundingBox())!;
  expect(first.height).toBeGreaterThanOrEqual(56);expect(first.y+first.height).toBeLessThanOrEqual(844);
  await page.locator('.difficulty-card').filter({hasText:'24개'}).tap();
  const after=(await start.boundingBox())!;expect(after.y).toBeCloseTo(first.y,0);
  await page.screenshot({path:'test-results/editor-phone.png',fullPage:true});
  await start.tap();await expect(page.locator('.puzzle-piece:visible')).toHaveCount(6);
  expect((await page.locator('.puzzle-piece:visible').first().boundingBox())!.width).toBeGreaterThan(75);
  await page.getByRole('button',{name:'다음 조각'}).tap();await page.getByRole('button',{name:'다음 조각'}).tap();await page.getByRole('button',{name:'다음 조각'}).tap();
  await expect(page.getByRole('button',{name:'다음 조각'})).toBeDisabled();
  await page.getByRole('button',{name:'이전 조각'}).tap();await page.getByRole('button',{name:'이전 조각'}).tap();await page.getByRole('button',{name:'이전 조각'}).tap();
  await expect(page.locator('.tray-page-count')).toContainText('1');
  const ids=await page.locator('.puzzle-piece:visible').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-piece-id')!));
  for(const id of ids) await tapPlace(page,id);
  await expect(page.locator('.board-cell.occupied')).toHaveCount(6);await expect(page.locator('.tray-page-count')).toContainText('2');
  await expect(page.locator('.puzzle-piece:visible')).toHaveCount(6);
  await page.screenshot({path:'test-results/paged-tray-phone.png',fullPage:true});
  await returnPlaced(page,ids[0]);
  await expect(page.locator('.tray-page-count')).toContainText('1');
  await expect(page.locator(`[data-piece-id="${ids[0]}"]`)).toBeVisible();
});
