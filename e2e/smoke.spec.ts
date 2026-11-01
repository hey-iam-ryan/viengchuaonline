import { test, expect } from '@playwright/test';

test('vào chùa & lạy ở chế độ một mình', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await expect(page.getByText('Đang viếng một mình')).toBeVisible();
  await page.waitForFunction(() => (window as any).__vco?.zones);
  await page.evaluate(() => (window as any).__vco.teleportToCushion(0));
  await page.getByRole('button', { name: 'Lạy', exact: true }).click();
  await expect(page.getByTestId('bow-count')).toHaveText('1');
});

test('không có lỗi console khi tải', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test('viewport điện thoại: chạm bên trái hiện joystick', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'vi-VN' });
  const page = await ctx.newPage();
  await page.goto('./');
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  const joy = page.getByTestId('joystick');
  await expect(joy).toBeHidden();
  await page.locator('#scene').dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: 80, clientY: 600, isPrimary: true });
  await expect(joy).toBeVisible();
  await ctx.close();
});

test('pháp danh & màu áo được nhớ cho lần sau', async ({ page }) => {
  await page.goto('./');
  await page.getByPlaceholder('Pháp danh (không bắt buộc)').fill('Minh Tâm');
  await page.getByRole('button', { name: 'Áo nâu' }).click();
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await page.reload();
  await expect(page.getByPlaceholder('Pháp danh (không bắt buộc)')).toHaveValue('Minh Tâm');
  await expect(page.getByRole('button', { name: 'Áo nâu' })).toHaveAttribute('aria-pressed', 'true');
});

test('không có WebGL → thông báo thân thiện', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error giả lập máy không có WebGL
    HTMLCanvasElement.prototype.getContext = function (type: string, ...a: unknown[]) {
      return type.startsWith('webgl') ? null : orig.call(this, type, ...a);
    };
  });
  await page.goto('./');
  await expect(page.getByText('chưa hỗ trợ đồ hoạ 3D')).toBeVisible();
});

test('vào chùa thì nhạc thiền phát; bấm 🎵 thì dừng; bấm 🪵 thì gõ mõ', async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { (window as any).__media = this; return play.call(this); };
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await page.waitForFunction(() => { const m = (window as any).__media as HTMLMediaElement | undefined; return !!m && !m.paused && m.currentTime > 0.3; }, null, { timeout: 15_000 });
  const music = page.getByRole('button', { name: 'Nhạc thiền' });
  await expect(music).toHaveAttribute('aria-pressed', 'true');
  await music.click();
  await expect(music).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => (window as any).__media.paused)).toBe(true);
  const chant = page.getByRole('button', { name: 'Gõ mõ tụng kinh' });
  await chant.click();
  await expect(chant).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await expect(page.getByRole('button', { name: 'Nhạc thiền' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Gõ mõ tụng kinh' })).toHaveAttribute('aria-pressed', 'true');
});

test('nút toàn màn hình đưa trang vào fullscreen', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await page.getByRole('button', { name: 'Toàn màn hình' }).click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  await page.getByRole('button', { name: 'Toàn màn hình' }).click();
  await page.waitForFunction(() => !document.fullscreenElement);
});

test('manifest PWA hợp lệ, có icon', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const m = await (await request.get(`./${href}`)).json();
  expect(m.display).toBe('fullscreen');
  for (const i of m.icons) expect((await request.get(`./${i.src}`)).status()).toBe(200);
});
