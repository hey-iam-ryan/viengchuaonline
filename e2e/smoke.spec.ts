import { test, expect, type Page } from '@playwright/test';

/** Chữ bay chỉ sống ~1,6s; trên CI chậm, thao tác bấm có thể mất vài giây → ghi lại mọi chữ bay đã xuất hiện. */
async function recordFloats(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = ((window as any).__floats = []);
    new MutationObserver((ms) => {
      for (const m of ms) for (const n of m.addedNodes) if (n instanceof HTMLElement && n.classList.contains('float-text')) seen.push(n.textContent ?? '');
    }).observe(document.documentElement, { childList: true, subtree: true });
  });
}
const floatsSeen = (page: Page) => page.evaluate(() => (window as any).__floats as string[]);

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

test('thả đèn hoa đăng ở hồ sen & gửi lời nguyện ở cây bồ đề', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 30_000 }); // CI không có GPU: khung hình đầu chậm
  await page.evaluate(() => { const v = (window as any).__vco; const z = v.zones.find((z: any) => z.id === 'pond'); v.player.x = z.x; v.player.z = z.z; });
  await page.getByRole('button', { name: 'Thả đèn hoa đăng' }).click();
  await expect(page.getByText('Đèn hoa đăng đã được thả')).toBeVisible();
  await page.evaluate(() => { const v = (window as any).__vco; const z = v.zones.find((z: any) => z.id === 'wish'); v.player.x = z.x; v.player.z = z.z; });
  await page.getByRole('button', { name: 'Gửi lời nguyện' }).click();
  await page.getByRole('button', { name: 'Cầu cho gia đình bình an, mạnh khoẻ' }).click();
  await expect(page.getByText('Lời nguyện đã được treo lên cây bồ đề')).toBeVisible();
  await page.getByRole('button', { name: 'Thêm' }).click();
  await page.getByRole('button', { name: /Lời nguyện mọi người/ }).click();
  await expect(page.getByRole('dialog').getByText('Cầu cho gia đình bình an, mạnh khoẻ')).toBeVisible();
});

test('buổi tối (20:00 giờ VN) trời tối, đèn sáng', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-01T13:00:00Z'));
  await page.goto('./');
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await page.waitForTimeout(500);
  const bg = await page.evaluate(() => (window as any).__vco.sceneBg());
  expect(bg).toBe(0x1d1c3b);
});

// Không dùng page.clock.install ở đây: đồng hồ giả thay requestAnimationFrame, trên máy CI không GPU
// mỗi khung 3D tốn hàng trăm ms nên đồng hồ giả gọi dồn khung để "đuổi kịp" → trang treo. Dùng thời gian thật.
test('đứng ở sân cũng vái được; 108 lạy liên tục đếm theo nhịp và dừng được', async ({ page }) => {
  await recordFloats(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await expect(page.getByRole('button', { name: 'Đứng dậy' })).toBeHidden(); // đang đứng thì không có nút đứng dậy
  await page.getByRole('button', { name: 'Vái', exact: true }).click();
  await expect(page.getByTestId('bow-count')).toHaveText('1');
  await expect.poll(() => floatsSeen(page)).toContain('An lạc +1');
  await page.getByRole('button', { name: '108 lạy' }).click();
  await expect(page.getByTestId('bow108-count')).toHaveText(/^\d+\/108$/);
  // nhịp lạy chung mỗi 3,5s → trong ~4s phải có ít nhất 1 lạy
  await expect(page.getByTestId('bow108-count')).toHaveText(/^[1-9]\d*\/108$/, { timeout: 15_000 });
  await page.getByRole('button', { name: 'Dừng' }).click();
  await expect(page.getByTestId('bow108-count')).toBeHidden();
});

test('ngày Rằm: màn chào báo dịp lễ, thanh lễ hiện "Rằm tháng 9"; ngày thường hiện ngày âm lịch', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-24T03:00:00Z')); // 10:00 VN, 15/9 âm lịch
  await page.goto('./');
  await expect(page.getByText('Hôm nay 🌕 Rằm tháng 9')).toBeVisible();
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await expect(page.locator('.ceremony .cer-day')).toHaveText('🌕 Rằm tháng 9');
  await page.clock.setFixedTime(new Date('2026-11-01T03:00:00Z')); // 23/9 âm lịch
  await page.reload();
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await expect(page.locator('.ceremony .cer-day')).toHaveText('23/9 âm lịch');
});

test('hướng dẫn lần đầu: 3 bước, bỏ qua được, lần sau không hiện', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await expect(page.getByText('Đi lại trong chùa')).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp' }).click();
  await expect(page.getByText('Lễ Phật', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bỏ qua' }).click();
  await expect(page.locator('.tut')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await page.waitForTimeout(500);
  await expect(page.locator('.tut')).toHaveCount(0);
});

test('bấm xuống nền thì nhân vật tự đi tới đó', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await page.getByRole('button', { name: 'Bỏ qua' }).click();
  // chờ camera lượn xong từ góc màn chào xuống sau lưng nhân vật
  await expect.poll(async () => {
    const a = await page.evaluate(() => (window as any).__vco.camera.position.z);
    await page.waitForTimeout(150);
    const b = await page.evaluate(() => (window as any).__vco.camera.position.z);
    return Math.abs(a - b);
  }, { timeout: 15_000 }).toBeLessThan(0.01);
  const z0 = await page.evaluate(() => (window as any).__vco.player.z);
  const box = (await page.locator('#scene').boundingBox())!;
  await page.mouse.click(box.width / 2, box.height * 0.42); // phía trước mặt, trên nền sân
  await expect.poll(() => page.evaluate(() => (window as any).__vco.player.z), { timeout: 15_000 }).toBeLessThan(z0 - 1);
});

test('điểm danh & nhiệm vụ: vái 3 lần thì xong nhiệm vụ đầu, xem được bảng nhiệm vụ', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await expect(page.getByText(/Điểm danh hôm nay/)).toBeVisible();
  await page.getByRole('button', { name: 'Bỏ qua' }).click();
  await expect(page.getByTestId('quest-chip')).toHaveText('📜 0/5');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Vái', exact: true }).click();
    await page.waitForTimeout(1400); // vái xong mới vái tiếp
  }
  await expect(page.getByTestId('quest-chip')).toHaveText('📜 1/5');
  await page.getByTestId('quest-chip').click();
  await expect(page.getByRole('dialog').getByText('Vái hoặc lạy 3 lần')).toBeVisible();
});

test('cấp bậc: đủ điểm thì lên bậc, xem được trong bảng tu tập', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('vco.progress.v1')) localStorage.setItem('vco.progress.v1', JSON.stringify({ bowsTotal: 24, lang: 'vi' }));
    localStorage.setItem('vco.tutorial.v1', '1');
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Vào chùa' }).click(); // điểm danh: +5 → 29 điểm (Mầm sen)
  await page.getByRole('button', { name: 'Vái', exact: true }).click(); // +1 → 30 → Búp sen
  await expect(page.getByText('Lên bậc tu tập: 🌷 Búp sen')).toBeVisible();
  await page.getByTestId('quest-chip').click();
  await expect(page.getByText(/Bậc tu tập: 🌷 Búp sen · 30 điểm/)).toBeVisible();
});

test('quét lá sân chùa (chế độ một mình): đứng cạnh lá thì quét được', async ({ page }) => {
  await recordFloats(page);
  await page.addInitScript(() => localStorage.setItem('vco.tutorial.v1', '1'));
  await page.goto('./');
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await page.waitForFunction(() => (window as any).__vco.leafField.nearest(0, 0, 999));
  await page.evaluate(() => { const v = (window as any).__vco; const l = v.leafField.nearest(0, 5, 999); v.player.x = l.x; v.player.z = l.z + 0.4; });
  await page.getByRole('button', { name: 'Quét lá' }).click();
  await expect.poll(() => floatsSeen(page)).toContain('Sân sạch, tâm an +1');
});

test('khuôn viên mới: cầu an trước tượng Quan Âm, phóng sinh bên hồ lớn', async ({ page }) => {
  await recordFloats(page);
  await page.addInitScript(() => localStorage.setItem('vco.tutorial.v1', '1'));
  await page.goto('./');
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  const go = (id: string) => page.evaluate((id) => { const v = (window as any).__vco; const z = v.zones.find((z: any) => z.id === id); v.player.x = z.x; v.player.z = z.z; }, id);
  await go('quanam');
  await page.getByRole('button', { name: 'Cầu an' }).click();
  await expect.poll(() => floatsSeen(page)).toContain('Nam mô Quán Thế Âm Bồ Tát');
  await go('phongsinh');
  await page.getByRole('button', { name: 'Phóng sinh' }).click();
  await expect.poll(() => floatsSeen(page)).toContain('Phóng sinh, thiện duyên +1');
});

test('đi nhiễu một vòng quanh bảo tháp thì được đếm vòng', async ({ page }) => {
  await recordFloats(page);
  await page.addInitScript(() => localStorage.setItem('vco.tutorial.v1', '1'));
  await page.goto('./');
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await page.evaluate(async () => {
    const v = (window as any).__vco;
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (let a = 0; a <= Math.PI * 2 + 0.6; a += 0.45) {
      v.player.x = Math.cos(a) * 6; v.player.z = -45 + Math.sin(a) * 6;
      await frame();
    }
  });
  await expect(page.getByTestId('circ-pill')).toHaveText('🛕 Nhiễu tháp · vòng 1/3');
  await expect.poll(() => floatsSeen(page)).toContain('Nhiễu tháp vòng 1');
});
