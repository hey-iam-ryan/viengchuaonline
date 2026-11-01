# Viếng Chùa Online — Design (v1)

*Ngày: 2026-11-01 · Trạng thái: chờ duyệt*

## 1. Ý định & lý do

Đón trend "chùa online" đang viral (khởi đầu từ Sansa — sansatemple.com, Hàn Quốc, ~600.000 lượt/3 ngày cuối 10/2026; người Việt, Đài Loan, Thái truy cập rất đông). Mục tiêu là **nhiều người dùng nhất có thể, ra mắt nhanh**, trong khi trend còn nóng. Người dùng tới chủ yếu từ link TikTok/Threads/Facebook/Zalo **trên điện thoại**, mở là muốn vào ngay.

Bài học từ Sansa đưa thẳng vào thiết kế:
- Không cài app, không đăng ký — mở link là ở trong chánh điện.
- Sansa phải nâng từ 20 lên 10.000 bồ đoàn và có lúc phải xếp hàng → **chịu tải khi viral là yêu cầu chính, không phải phần phụ**.
- Sansa không có chat (cố ý) → giữ không khí tĩnh lặng, không phải kiểm duyệt.
- Sansa bị clone hàng loạt trong vài ngày → điểm riêng của ta là **chùa Việt**.

## 2. Mục tiêu (v1)

1. Mở link → đứng trong sân chùa **≤ 5 giây trên 4G**, điện thoại tầm trung.
2. Không gian 3D chùa Việt low-poly: cổng tam quan, sân, hồ sen, chánh điện có tượng Phật, đại hồng chung, mõ, lư hương.
3. Nhân vật chibi (Phật tử áo lam / áo nâu / bạch y / áo vàng), đặt pháp danh tuỳ chọn. Điều khiển: joystick cảm ứng trên điện thoại, WASD/phím mũi tên và kéo chuột trên PC.
4. Hành động (bấm nút khi đến gần, hoặc nút cố định):
   - **Ngồi bồ đoàn & lạy** — có bộ đếm, mốc 3 lạy và 108 lạy.
   - **Lần tràng hạt** — 108 hạt, mỗi lần bấm hiện "Nam Mô A Di Đà Phật".
   - **Gõ mõ**, **thỉnh chuông**.
   - **Thắp hương** — 3 nén cắm vào lư hương, có khói; người khác cùng gian cũng nhìn thấy.
   - **Nghe niệm Phật** — bật/tắt nhạc nền niệm Phật. Không tự phát tiếng khi mở trang.
5. **Nhiều người cùng gian**: thấy nhân vật của người khác đi lại, ngồi, lạy, thắp hương. Mỗi gian tối đa **100 người**, có nhiều gian. Hệ thống tự xếp người mới vào gian còn chỗ, người dùng cũng có thể tự chọn gian.
6. **Hiển thị số người đang viếng** ("Đang có 1.234 người viếng chùa") để tạo hiệu ứng đám đông.
7. **Giờ lễ chung**: 5:00 và 18:00 giờ Việt Nam. Đến giờ, mọi người đang online cùng nghe một đoạn tụng, đồng bộ theo đồng hồ. Hiện đếm ngược tới giờ lễ kế tiếp.
8. **Chế độ một mình**: khi server realtime lỗi, quá tải hoặc hết quota, app **vẫn chạy đầy đủ** (chỉ không thấy người khác) và báo nhẹ "đang viếng một mình". Đây là lưới an toàn khi viral.
9. Nút **"Cúng dường duy trì chùa"** mở link ngoài (MoMo/Ko-fi… do chủ dự án cung cấp). Không thanh toán trong app.
10. Nút **chia sẻ** (Web Share API, có dự phòng copy link) và thẻ OG/ảnh preview đẹp cho Facebook/Zalo/Threads.
11. Ngôn ngữ: **tiếng Việt mặc định, có tiếng Anh**, tự nhận theo trình duyệt.

## 3. Ngoài phạm vi v1

Chat, tài khoản/đăng nhập, lưu tiến trình lên server, bảng xếp hạng công đức, xin xăm, kinh sách đầy đủ, thiền có hẹn giờ, AI, app native. (Bộ đếm cá nhân chỉ lưu `localStorage`.)

## 4. Những điều tuyệt đối tránh (thất bại dù chạy được)

- **Bán công đức** hoặc gắn công đức với tiền; nhang crypto như bản nhái "cyber-sansa".
- Bất kỳ thứ gì thiếu tôn kính: đùa cợt tượng Phật, quảng cáo chen vào chánh điện, cho nhân vật trèo lên bàn thờ hoặc tượng.
- Tải chậm, giật trên điện thoại, sập khi có nhiều người vào → mất trend.
- Sao chép code, asset, tên hoặc giao diện của Sansa hay các repo không có license.

## 5. Ràng buộc

- **Frontend tĩnh trên GitHub Pages**, repo `viengchuaonline`, base path `/viengchuaonline/`. Cấu hình base path dễ đổi để sau chuyển sang **Cloudflare Pages** hoặc tên miền riêng mà không phải sửa code.
- **Ngân sách băng thông** (GitHub Pages giới hạn mềm ~100GB/tháng):
  - JS ≤ 250KB gzip.
  - Lần tải đầu ≤ 1,5MB tổng.
  - Hình 3D **dựng bằng code** (procedural low-poly). Nếu cần glTF (vd. tượng Phật) thì nén Draco/meshopt, ≤ 300KB.
  - Âm thanh nén (Opus/AAC), **lazy-load** khi người dùng bật hoặc khi thao tác lần đầu.
  - Có cache-busting qua hash file từ Vite.
- **Hiệu năng**: 30fps+ trên điện thoại tầm trung với 100 nhân vật trong gian (instancing, hạn chế bóng đổ, giới hạn pixel ratio ≤ 2, giảm chất lượng tự động khi fps thấp).
- **Chi phí realtime**: dùng được ở gói miễn phí lúc đầu, và lên được gói $5/tháng của Cloudflare Workers khi viral.
- Asset & âm thanh chỉ dùng **CC0/CC-BY hoặc tự làm**. Ghi nguồn trong `ATTRIBUTION.md` và trong app.

## 6. Các hướng đã cân nhắc

| Hướng | Đánh đổi | Quyết định |
|---|---|---|
| **A. Three.js thuần + Vite** | Gói code nhỏ, tải nhanh, phải tự tổ chức code | ✅ **Chọn** — tốc độ tải trên điện thoại quyết định có giữ được người từ link viral hay không |
| B. React Three Fiber + Vite | Làm UI dễ, gói code nặng gấp ~2–3 lần | Loại — nặng hơn trên điện thoại |
| C. 2.5D PixiJS | Nhẹ nhất, nhưng mất cảm giác "bước vào chánh điện 3D" đang viral | Loại |

Phần realtime:

| Hướng | Đánh đổi | Quyết định |
|---|---|---|
| Supabase Realtime | Dễ dùng, nhưng free ~200 kết nối & ~2 triệu tin nhắn/tháng → một gian 100 người đang đi lại đốt hết trong vài giờ | Loại |
| Firebase RTDB | Free 100 kết nối cùng lúc | Loại |
| **Cloudflare Worker + Durable Object (mỗi gian một DO, WebSocket Hibernation)** | Tin nhắn gửi đi từ server không tính phí; gói $5/tháng chịu tải lớn; gần chỗ người dùng châu Á; tự viết server nhỏ | ✅ **Chọn** (Claude quyết định, người dùng uỷ quyền) |

*Hướng UI và realtime do Claude quyết định theo uỷ quyền của chủ dự án ("tự quyết định theo hướng tốt nhất").*

## 7. Kiến trúc (đã quyết)

```
[Điện thoại / PC]
   │  HTTPS (file tĩnh)            WebSocket (wss)
   ▼                               ▼
GitHub Pages  ──────────►  Cloudflare Worker  ──►  Durable Object "Lobby" (đếm người, xếp gian)
(Vite build: Three.js)                         └─►  Durable Object "Hall-N" (1 gian ≤ 100 người)
```

- **Frontend** (`/web`): Vite + TypeScript + Three.js. Cảnh dựng bằng code. UI là HTML/CSS overlay (không dùng framework).
- **Realtime** (`/realtime`): Cloudflare Worker + Durable Objects, deploy bằng `wrangler`.
- **Giao thức** (JSON gọn hoặc mảng số, builder tự chọn):
  - Client gửi trạng thái **chỉ khi thay đổi**, tối đa ~5 lần/giây khi đang di chuyển; hành động (lạy, thắp hương, gõ mõ, chuông) gửi dạng sự kiện.
  - Server **gộp thành snapshot** (chỉ phần thay đổi) và phát ~5 lần/giây cho cả gian. Client nội suy chuyển động cho mượt.
  - Server giới hạn tần suất mỗi kết nối, kiểm tra độ dài/ký tự pháp danh, lọc từ tục cơ bản, cắt kết nối spam.
- **Xếp gian**: client hỏi Lobby → nhận gian còn chỗ → kết nối Hall. Hall báo số người về Lobby. Gian đầy → chuyển gian khác. Tất cả đầy hoặc lỗi → chế độ một mình.
- **Lư hương**: mỗi Hall giữ danh sách nén hương đang cháy (tự tắt sau ~10 phút, giới hạn số lượng) để người mới vào cũng thấy.
- **Giờ lễ**: tính theo đồng hồ client, hiệu chỉnh bằng giờ server gửi kèm lúc kết nối. Không cần server điều phối.
- **Deploy**: GitHub Actions build `/web` → GitHub Pages. `wrangler deploy` cho `/realtime` (chạy tay hoặc qua Actions, kèm secret token Cloudflare). URL realtime cấu hình qua biến môi trường lúc build.
- **Đo lường**: Cloudflare Web Analytics (miễn phí, không cookie) gắn vào trang.

## 8. Kiểm thử & sẵn sàng viral

- Unit test cho logic thuần: bộ đếm, xếp gian, giới hạn tần suất, nội suy, tính giờ lễ.
- Playwright smoke test: mở trang, vào được sân chùa, lạy được, chế độ một mình chạy khi tắt server.
- **Script load test**: giả lập N client bot (vd. 100 trong 1 gian, 1.000 trên nhiều gian) đi lại & lạy. Đo CPU của DO, độ trễ, số tin nhắn/giây, để ước lượng chi phí trước khi chia sẻ link.
- Kiểm tra kích thước gói code trong CI (fail nếu vượt ngân sách).

## 9. Để builder tự quyết

- Cách dựng mái cong, cột, tượng (procedural hay một glTF nhẹ), bảng màu, ánh sáng.
- Thiết kế nhân vật chibi & animation lạy/ngồi (procedural tween được).
- Định dạng tin nhắn cụ thể, dùng `partyserver` hay viết DO trực tiếp.
- Nguồn âm thanh CC0 cụ thể (chuông, mõ, niệm Phật, tụng giờ lễ).
- Cấu trúc thư mục chi tiết, lib test.

## 10. Chủ dự án cần cung cấp (không chặn việc build — dùng placeholder)

- Tài khoản Cloudflare (để deploy realtime) và quyền tạo repo GitHub `viengchuaonline` (tài khoản `hey-iam-ryan`).
- Link cúng dường (MoMo/Ko-fi/…).
- Tên miền riêng (tuỳ chọn, về sau).
