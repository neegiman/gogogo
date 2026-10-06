import { test, expect, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
async function localPhoto(page: Page) {
  await page.goto('/gogogo/');
  const buffer = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 1200;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 900, 1200);
    gradient.addColorStop(0, '#f7a8cc'); gradient.addColorStop(1, '#633254');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 900, 1200);
    return canvas.toDataURL('image/jpeg').split(',')[1];
  }), 'base64');
  await page.getByLabel('기기 사진 선택').setInputFiles({ name: 'local-photo.jpg', mimeType: 'image/jpeg', buffer });
  await expect(page.getByText('12개 선택됨')).toBeVisible();
}

test('cropping starts a puzzle even if the puzzle route cannot be fetched', async ({ page }, info) => {
  const routeFailures: string[] = [];
  page.on('console', message => { if (message.type() === 'error') routeFailures.push(message.text()); });
  await localPhoto(page);
  await page.route('**/gogogo/puzzle/**', route => route.fulfill({ status: 503, body: 'Route unavailable' }));
  await page.getByRole('button', { name: '붙이러 고고고!' }).click();
  await expect(page.locator('.board-cell'), JSON.stringify(routeFailures)).toHaveCount(12);
  await expect(page.locator('.puzzle-piece')).toHaveCount(12);
  await page.screenshot({ path: `test-results/route-free-${info.project.name}.png` });
});

test('scrolling never covers the tray or tools with the puzzle board', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await localPhoto(page);
  await page.getByRole('button', { name: '붙이러 고고고!' }).click();
  await expect(page.locator('.board-cell')).toHaveCount(12);
  const maximum = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (const y of [0, maximum * .25, maximum * .5, maximum * .75, maximum]) {
    await page.evaluate(async y => { window.scrollTo(0, y); await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }, y);
    const overlaps = await page.evaluate(() => {
      const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const board = rect('.puzzle-board'), tray = rect('.piece-tray'), tools = rect('.puzzle-toolbar');
      const area = (a: DOMRect, b: DOMRect) => Math.max(0, Math.min(a.right, b.right, innerWidth) - Math.max(a.left, b.left, 0)) * Math.max(0, Math.min(a.bottom, b.bottom, innerHeight) - Math.max(a.top, b.top, 0));
      return { boardTray: area(board, tray), boardTools: area(board, tools), trayTools: area(tray, tools) };
    });
    expect(overlaps, `scrollY ${y}`).toEqual({ boardTray: 0, boardTools: 0, trayTools: 0 });
  }
  await page.screenshot({ path: `test-results/scroll-${info.project.name}.png` });
  // The board and tray can be at different scroll positions. Selection survives
  // scrolling, and neither the toolbar nor another layer intercepts the tap.
  const piece = page.locator('.puzzle-piece:visible').first();
  const id = (await piece.getAttribute('data-piece-id'))!;
  const cell = page.locator(`[data-target-id="${id}"]`);
  const tap = async (locator: ReturnType<typeof page.locator>) => {
    if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await locator.tap();
    else await locator.click();
  };
  await tap(piece); await expect(piece).toHaveAttribute('aria-pressed', 'true');
  await tap(cell); await expect(cell).toHaveAttribute('data-placed-piece-id', id);
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) { await cell.tap(); await cell.tap(); }
  else await cell.dblclick({ delay: 80 });
  await expect(page.locator(`[data-piece-id="${id}"]`)).toBeVisible();
});

test('a local photo can be zoomed, panned, rotated and cropped on a small phone', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 375, height: 667 });
  await localPhoto(page);
  const canvas = page.locator('.crop-frame canvas');
  const pixels = () => canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
  const original = await pixels();
  await page.getByRole('button', { name: '사진 확대', exact: true }).click();
  await expect.poll(pixels).not.toBe(original);
  const zoomed = await pixels(), box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * .4, box.y + box.height * .4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .6, box.y + box.height * .6, { steps: 5 });
  await page.mouse.up();
  await expect.poll(pixels).not.toBe(zoomed);
  const panned = await pixels();
  await page.getByRole('button', { name: '90° 회전' }).click();
  await expect.poll(pixels).not.toBe(panned);
  const start = page.getByRole('button', { name: '붙이러 고고고!' });
  // In a short viewport the fixed crop action must still receive the touch.
  expect(await start.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  })).toBe(true);
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await start.tap();
  else await start.click();
  await expect(page.locator('.board-cell')).toHaveCount(12);
  await expect(page.locator('.puzzle-piece')).toHaveCount(12);
  expect(await page.locator('.puzzle-piece canvas').first().evaluate((node: HTMLCanvasElement) => node.getContext('2d')!.getImageData(1, 1, 1, 1).data[3])).toBe(255);
  expect(errors).toEqual([]);
});

test('returning home and reloading release a photo and allow another puzzle', async ({ page }) => {
  await localPhoto(page); await page.getByRole('button', { name: '붙이러 고고고!' }).click();
  await expect(page.locator('.board-cell')).toHaveCount(12);
  await page.getByRole('link', { name: '처음으로', exact: true }).click();
  await expect(page.getByRole('button', { name: '사진 선택', exact: true })).toBeVisible();
  await localPhoto(page); await page.getByRole('button', { name: '붙이러 고고고!' }).click();
  await expect(page.locator('.board-cell')).toHaveCount(12);
  await page.reload();
  await expect(page.getByRole('button', { name: '사진 찍기' })).toBeVisible();
  await expect(page.locator('.board-cell')).toHaveCount(0);
});
