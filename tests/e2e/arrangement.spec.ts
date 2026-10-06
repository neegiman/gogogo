import { test, expect, type Page, type Locator } from '@playwright/test';

async function press(page: Page, locator: Locator) {
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await locator.tap();
  else await locator.click();
}
async function prepare(page: Page, count = 12) {
  await page.setViewportSize({ width: 375, height: 667 }); await page.goto('/gogogo/');
  await press(page, page.getByRole('button', { name: '샘플 퍼즐 해보기' }));
  await press(page, page.locator('.difficulty-card').filter({ hasText: `${count}개` }));
  await press(page, page.getByRole('button', { name: '붙이러 고고고!' }));
  await expect(page.locator('.puzzle-piece')).toHaveCount(count);
  await expect(page.locator('.tray-area')).toHaveAttribute('data-paged', 'true');
  return page.locator('.puzzle-piece').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-piece-id')!));
}
const cell = (page: Page, id: string) => page.locator(`[data-target-id="${id}"]`);
const slot = (page: Page, index: number) => page.locator(`[data-tray-slot="${index}"]`);
async function placeFromTray(page: Page, id: string, target = id) {
  const piece = page.locator(`[data-piece-id="${id}"]`);
  for (let attempt = 0; attempt < 8 && !await piece.isVisible(); attempt++) {
    const desired = Math.floor((Number(await piece.locator('..').getAttribute('data-tray-slot')) - 1) / 6) + 1;
    const current = Number(await page.locator('.tray-page-count strong').innerText());
    if (current === desired) break;
    const button = page.getByRole('button', { name: current > desired ? '이전 조각' : '다음 조각' });
    try { if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await button.tap({ timeout: 1500 }); else await button.click({ timeout: 1500 }); }
    catch (error) { if (await button.isEnabled()) throw error; }
  }
  await expect(piece).toBeVisible();
  await press(page, piece); await press(page, cell(page, target));
  await expect(cell(page, target)).toHaveAttribute('data-placed-piece-id', id);
}
async function returnToTray(page: Page, id: string) {
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) { await cell(page, id).tap(); await cell(page, id).tap(); }
  else await cell(page, id).dblclick({ delay: 80 });
}
async function conserved(page: Page, count: number) {
  const ids = await page.locator('[data-placed-piece-id], [data-tray-piece-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placed-piece-id') ?? node.getAttribute('data-tray-piece-id')));
  expect(ids.length).toBe(count); expect(new Set(ids).size).toBe(count);
  expect([...ids].sort()).toEqual(Array.from({ length: count }, (_, index) => `piece-${index}`).sort());
}
for (const count of [12, 16, 20, 24]) test(`${count} pieces swap on a full board and return to the first available tray slots`, async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const initial = await prepare(page, count);
  for (const id of initial) await placeFromTray(page, id);
  const first = `piece-0`, last = `piece-${count - 1}`;
  await press(page, cell(page, first)); await expect(cell(page, first)).toHaveAttribute('aria-pressed', 'true');
  await press(page, cell(page, last));
  await expect(cell(page, first)).toHaveAttribute('data-placed-piece-id', last);
  await expect(cell(page, last)).toHaveAttribute('data-placed-piece-id', first);
  await expect(page.locator('.board-cell.occupied')).toHaveCount(count);
  await expect(page.locator('.puzzle-piece')).toHaveCount(0); await conserved(page, count);
  await expect(page.locator('.challenge-feedback')).toHaveCount(0);
  await page.getByRole('button', { name: '도전!', exact: true }).click();
  await expect(page.getByRole('heading', { name: '다시 도전!', exact: true })).toBeVisible();
  await expect(page.locator('.challenge-feedback-layer')).toHaveCount(0);
  // Two ordinary taps swap back, without returning either piece or auto-winning.
  await press(page, cell(page, last)); await press(page, cell(page, first));
  await expect(cell(page, first)).toHaveAttribute('data-placed-piece-id', first);
  await expect(cell(page, last)).toHaveAttribute('data-placed-piece-id', last);
  await expect(page.locator('.board-cell.occupied')).toHaveCount(count);
  await expect(page.getByRole('heading', { name: '퍼즐 완성!' })).toHaveCount(0);
  const returnedFirst = initial[count - 1], returnedSecond = initial[count - 2];
  await returnToTray(page, returnedFirst);
  await expect(slot(page, 1)).toHaveAttribute('data-tray-piece-id', returnedFirst);
  await expect(page.locator('.tray-page-count strong')).toHaveText('1');
  await returnToTray(page, returnedSecond);
  await expect(slot(page, 2)).toHaveAttribute('data-tray-piece-id', returnedSecond);
  await expect(slot(page, count)).not.toHaveAttribute('data-tray-piece-id');
  await expect(page.locator('.board-cell.occupied')).toHaveCount(count - 2);
  await conserved(page, count);
  // A tray-to-board exchange also preserves the displaced photo piece.
  const target = page.locator('.board-cell.occupied').first();
  const displaced = (await target.getAttribute('data-placed-piece-id'))!;
  const targetId = (await target.getAttribute('data-target-id'))!;
  await placeFromTray(page, returnedSecond, targetId);
  await expect(slot(page, 1)).toHaveAttribute('data-tray-piece-id', returnedFirst);
  await expect(slot(page, 2)).toHaveAttribute('data-tray-piece-id', displaced);
  await expect(page.locator('.board-cell.occupied')).toHaveCount(count - 2);
  await conserved(page, count);
  await page.screenshot({ path: `test-results/exchange-${count}-${info.project.name}.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('keyboard swaps occupied cells and returns to the earliest free tray slot', async ({ page }) => {
  const ids = await prepare(page);
  await placeFromTray(page, ids[0], 'piece-0'); await placeFromTray(page, ids[11], 'piece-1');
  await cell(page, 'piece-1').focus(); await page.keyboard.press('Enter');
  await cell(page, 'piece-0').focus(); await page.keyboard.press('Space');
  await expect(cell(page, 'piece-0')).toHaveAttribute('data-placed-piece-id', ids[11]);
  await expect(cell(page, 'piece-1')).toHaveAttribute('data-placed-piece-id', ids[0]);
  await page.keyboard.press('Delete');
  await expect(slot(page, 1)).toHaveAttribute('data-tray-piece-id', ids[11]);
  await expect(slot(page, 12)).not.toHaveAttribute('data-tray-piece-id');
  // Other tray pieces keep their positions when a returned piece fills slot 1.
  await expect(slot(page, 2)).toHaveAttribute('data-tray-piece-id', ids[1]);
  await conserved(page, 12);
});
