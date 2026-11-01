# 🪷 Viếng Chùa Online

Ngôi chùa Việt 3D chạy ngay trên trình duyệt: lạy Phật, thắp hương, gõ mõ, thỉnh chuông, lần chuỗi 108 hạt cùng mọi người. Không cần cài đặt, không cần đăng ký.

- **Web** (`web/`): Vite + TypeScript + Three.js. Cảnh chùa dựng hoàn toàn bằng code, âm thanh tổng hợp bằng Web Audio → tải đầu ~0,75MB.
- **Realtime** (`realtime/`): Cloudflare Worker + Durable Objects. Mỗi gian chánh điện tối đa 100 người, có 100 gian.
- **Shared** (`shared/`): giao thức, bản đồ & va chạm, lịch lễ, dùng chung cho client và server.

Nếu server realtime lỗi, quá tải hoặc chưa deploy, web tự chuyển sang **chế độ viếng một mình**: vẫn dùng đầy đủ, chỉ không thấy người khác.

## Chạy trên máy

```bash
npm install
npm test                      # unit test: shared + realtime + web
npm run e2e                   # Playwright smoke test (lần đầu: npx playwright install chromium)

# Terminal 1: server realtime local
npm run dev -w @vco/realtime  # http://localhost:8787

# Terminal 2: web, trỏ tới realtime local
VITE_REALTIME_URL=http://localhost:8787 npm run dev -w @vco/web
# mở http://localhost:5173/viengchuaonline/
```

## Deploy

### 1. Realtime (Cloudflare, cần tài khoản)
```bash
npx wrangler login
npm run deploy -w @vco/realtime
# → https://viengchua-realtime.<tài-khoản>.workers.dev
```
Sửa `ALLOWED_ORIGINS` trong `realtime/wrangler.jsonc` nếu đổi tên miền web.

Gói Workers Free dùng được lúc đầu. Khi đông người, nên lên **Workers Paid ($5/tháng)**: tin nhắn server gửi đi không tính phí, và giới hạn request cao hơn nhiều.

### 2. Web (GitHub Pages)
1. Repo → Settings → Pages → Source: **GitHub Actions**.
2. Repo → Settings → Secrets and variables → Actions → **Variables**:
   - `VITE_REALTIME_URL` = URL worker ở bước 1 (để trống → chỉ chế độ một mình)
   - `VITE_DONATE_URL` = link cúng dường (MoMo/Ko-fi…; để trống → ẩn nút)
   - `VITE_CF_BEACON` = token Cloudflare Web Analytics (tuỳ chọn)
3. Push lên `main` → workflow test, build, kiểm tra dung lượng, deploy.

### Chuyển sang Cloudflare Pages / tên miền riêng
Build với `VITE_BASE=/`, sửa `VITE_SITE_URL` trong `web/.env` (ảnh xem trước khi chia sẻ) và `ALLOWED_ORIGINS`.

## Trước khi chia sẻ link rộng rãi

```bash
node scripts/loadtest.mjs --url <realtime-url> --bots 100 --halls 1 --seconds 60 --origin <web-origin>
node scripts/loadtest.mjs --url <realtime-url> --bots 1000 --halls 10 --seconds 60 --origin <web-origin>
```

Kết quả đo trên máy (wrangler dev, 2026-11-01):

| Kịch bản | Kết nối | Tin nhận/giây | Độ trễ snapshot p50 / p95 |
|---|---|---|---|
| 101 bot, 1 gian | 100 vào, 1 bị báo đầy | ~1.100 | 98ms / 184ms |
| 1.000 bot, 10 gian | 1.000 vào | ~10.800 | 102ms / 190ms |

## Nguyên tắc
- Không chat, không tài khoản, không bán công đức. Cúng dường chỉ là link ngoài để duy trì server.
- Tiến trình (số lạy, chuỗi, pháp danh) chỉ lưu trên máy người dùng (`localStorage`).
- Nguồn & giấy phép: xem [ATTRIBUTION.md](ATTRIBUTION.md).
