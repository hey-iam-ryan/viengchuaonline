# Viếng Chùa Online v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một ngôi chùa Việt 3D chạy trên trình duyệt (GitHub Pages), không cần đăng ký, nhiều người cùng gian (≤100/gian) qua Cloudflare Durable Objects, có chế độ một mình khi realtime lỗi.

**Architecture:** npm workspaces gồm 3 gói: `shared` (giao thức, bản đồ thế giới, logic thuần dùng chung cho client & server), `realtime` (Cloudflare Worker + DO `Lobby` + DO `Hall`, WebSocket Hibernation), `web` (Vite + TypeScript + Three.js thuần, cảnh dựng bằng code, UI HTML/CSS overlay). Server chỉ phát snapshot khi có thay đổi, nên khi mọi người ngồi yên thì DO hibernate.

**Tech Stack:** TypeScript 5, Vite, three (r17x+), Vitest, @cloudflare/vitest-pool-workers, wrangler, Playwright, `ws` (load test).

**Spec:** `docs/superpowers/specs/2026-11-01-vieng-chua-online-design.md`

## Global Constraints

- Frontend tĩnh trên GitHub Pages, base path `/viengchuaonline/`, đổi được bằng biến `VITE_BASE` (mặc định `/viengchuaonline/`).
- JS ≤ **250KB gzip**; lần tải đầu (mọi file trong `dist` trừ `audio/`) ≤ **1,5MB**; âm thanh lazy-load; glTF (nếu có) ≤ 300KB.
- 30fps+ điện thoại tầm trung với 100 nhân vật; `pixelRatio ≤ 2`; tự hạ chất lượng khi fps thấp.
- Không tự phát âm thanh khi mở trang.
- Gian tối đa **100** người; **100** gian.
- Client gửi trạng thái chỉ khi thay đổi, ≤ **5 lần/giây**; server gộp snapshot phát ≤ **5 lần/giây**, chỉ khi có thay đổi.
- Giờ lễ **05:00 và 18:00 giờ Việt Nam (UTC+7, không DST)**.
- Không chat, không tài khoản, không thanh toán trong app, không gắn công đức với tiền. Cúng dường = link ngoài `VITE_DONATE_URL`.
- Tiếng Việt mặc định, có tiếng Anh. Mọi chuỗi UI đi qua `t()`.
- Asset/âm thanh chỉ CC0/CC-BY hoặc tự làm/tổng hợp; ghi nguồn trong `ATTRIBUTION.md`.
- Không sao chép code/asset/tên/giao diện của Sansa hay repo không license.
- Mỗi task kết thúc bằng commit; message dạng `feat:`/`test:`/`chore:`, kết thúc bằng dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **iOS Safari khoá âm thanh** cho tới cử chỉ đầu tiên → `AudioManager.unlock()` gọi trong handler chạm/bấm đầu tiên; mọi `play*()` trước đó là no-op, không ném lỗi. (Test trong Task 7.)
2. **Khoá màn hình / chuyển tab làm rớt WebSocket**, và DO khởi động lại làm mọi client reconnect cùng lúc → backoff có jitter (1s→30s), không bão reconnect. (Test trong Task 8.)
3. **Gian đầy do Lobby đếm trễ** → Hall trả `{t:'full'}` rồi đóng; client hỏi lại Lobby với `exclude`, tối đa 3 lần, sau đó chế độ một mình. (Test trong Task 4 và 8.)
4. **Client độc hại**: tin > 512 byte, JSON rác, toạ độ ngoài bản đồ hoặc trên bàn thờ, spam → server bỏ tin, kẹp toạ độ bằng `resolveCollision`, rate limit, cắt kết nối khi vi phạm lặp lại. (Test trong Task 3.)
5. **Pháp danh tiếng Việt có dấu/emoji/ký tự lạ**: chuẩn hoá NFC, đếm theo grapheme ≤ 16, bỏ ký tự điều khiển/zero-width, lọc từ tục cơ bản → thay bằng "Phật tử". (Test trong Task 1.)

---

## File Structure

```
package.json                 # workspaces: shared, realtime, web; scripts test/build/check
tsconfig.base.json
.gitignore
ATTRIBUTION.md  README.md
shared/src/protocol.ts       # kiểu tin nhắn, hằng số, encode/parse an toàn
shared/src/name.ts           # sanitizeName
shared/src/world.ts          # bản đồ: bounds, vật cản, zones, spawn; resolveCollision, nearestZone
shared/src/ceremony.ts       # ceremonyStatus
shared/src/rateLimit.ts      # TokenBucket
shared/test/*.test.ts
realtime/wrangler.jsonc
realtime/src/index.ts        # Worker router + CORS/origin
realtime/src/hall.ts         # DO Hall
realtime/src/lobby.ts        # DO Lobby
realtime/test/*.test.ts
web/index.html  web/vite.config.ts
web/src/main.ts  web/src/config.ts
web/src/scene/{renderer,temple,materials,quality}.ts
web/src/player/{avatar,controls,localPlayer}.ts
web/src/interact/{actions,incense,audio}.ts
web/src/net/{client,interpolation,remotePlayers}.ts
web/src/state/progress.ts
web/src/ui/{i18n,onboarding,hud,share}.ts  web/src/ui/styles.css
web/public/og.png  web/public/audio/   (lazy)
web/test/*.test.ts
e2e/smoke.spec.ts  playwright.config.ts
scripts/check-size.mjs  scripts/loadtest.mjs
.github/workflows/pages.yml
```

---

### Task 1: Monorepo + giao thức + pháp danh

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `.gitignore`, `shared/package.json`, `shared/src/protocol.ts`, `shared/src/name.ts`
- Test: `shared/test/protocol.test.ts`, `shared/test/name.test.ts`

**Interfaces:**
- Produces (`shared/src/protocol.ts`):
  ```ts
  export const HALL_CAPACITY = 100, HALL_COUNT = 100, NET_HZ = 5, MAX_MSG_BYTES = 512;
  export const INCENSE_TTL_MS = 600_000, INCENSE_MAX_PER_HALL = 60, INCENSE_COOLDOWN_MS = 10_000;
  export type Robe = 'lam' | 'nau' | 'trang' | 'vang';
  export type Action = 'bow' | 'mo' | 'chuong' | 'beads';
  export const enum Pose { Stand = 0, Walk = 1, Sit = 2, Bow = 3 }
  export type BurnerId = 'hall' | 'yard';
  export interface PlayerState { id: string; n: string; r: Robe; x: number; z: number; ry: number; p: Pose }
  export interface Incense { b: BurnerId; at: number }
  export type ClientMsg =
    | { t: 'hello'; name: string; robe: Robe }
    | { t: 's'; x: number; z: number; ry: number; p: Pose }
    | { t: 'a'; a: Action }
    | { t: 'inc'; b: BurnerId };
  export type ServerMsg =
    | { t: 'welcome'; id: string; hall: number; now: number; players: PlayerState[]; incense: Incense[] }
    | { t: 'snap'; u: PlayerState[]; gone: string[] }
    | { t: 'act'; id: string; a: Action }
    | { t: 'inc'; i: Incense }
    | { t: 'full' };
  export function parseClientMsg(raw: string | ArrayBuffer): ClientMsg | null; // null nếu quá MAX_MSG_BYTES, JSON hỏng, sai kiểu, số không hữu hạn
  ```
- Produces (`shared/src/name.ts`): `export function sanitizeName(raw: unknown): string` — trả `'Phật tử'` khi rỗng/tục.

- [ ] **Step 1:** `git init`; tạo workspaces root (`"workspaces": ["shared","realtime","web"]`, script `"test": "npm test -ws --if-present"`), `.gitignore` (`node_modules`, `dist`, `.wrangler`, `test-results`), cài `typescript vitest` ở root.
- [ ] **Step 2: Viết test thất bại**

```ts
// shared/test/protocol.test.ts
test('parse hợp lệ', () => {
  expect(parseClientMsg('{"t":"s","x":1,"z":2,"ry":0.5,"p":1}')).toEqual({ t: 's', x: 1, z: 2, ry: 0.5, p: 1 });
  expect(parseClientMsg('{"t":"inc","b":"yard"}')).toEqual({ t: 'inc', b: 'yard' });
});
test('loại tin rác', () => {
  expect(parseClientMsg('x'.repeat(513))).toBeNull();
  expect(parseClientMsg('{not json')).toBeNull();
  expect(parseClientMsg('{"t":"s","x":"1","z":2,"ry":0,"p":1}')).toBeNull();
  expect(parseClientMsg('{"t":"s","x":1e999,"z":2,"ry":0,"p":1}')).toBeNull();
  expect(parseClientMsg('{"t":"s","x":1,"z":2,"ry":0,"p":9}')).toBeNull();
  expect(parseClientMsg('{"t":"a","a":"dance"}')).toBeNull();
  expect(parseClientMsg('{"t":"hello","name":"A","robe":"do"}')).toBeNull();
});
// shared/test/name.test.ts
test('giữ tiếng Việt, chuẩn hoá NFC', () => expect(sanitizeName('Minh Tâm'.normalize('NFD'))).toBe('Minh Tâm'));
test('cắt 16 grapheme', () => expect([...new Intl.Segmenter().segment(sanitizeName('🙏'.repeat(30)))].length).toBe(16));
test('bỏ ký tự điều khiển & zero-width, trim', () => expect(sanitizeName('  An​\u0007 ')).toBe('An'));
test('rỗng/không phải chuỗi/tục → Phật tử', () => {
  expect(sanitizeName('')).toBe('Phật tử'); expect(sanitizeName(42)).toBe('Phật tử'); expect(sanitizeName('đ.m')).toBe('Phật tử');
});
```

- [ ] **Step 3:** Chạy `npx vitest run shared` → FAIL (module chưa có).
- [ ] **Step 4:** Cài đặt `protocol.ts` và `name.ts`. Danh sách từ tục là mảng nhỏ vi+en, so khớp sau khi bỏ dấu và bỏ ký tự không phải chữ (`đ.m` → `dm`).
- [ ] **Step 5:** `npx vitest run shared` → PASS.
- [ ] **Step 6:** Commit `chore: scaffold monorepo; feat(shared): protocol + sanitizeName`.

### Task 2: Bản đồ thế giới, giờ lễ, rate limit

**Files:**
- Create: `shared/src/world.ts`, `shared/src/ceremony.ts`, `shared/src/rateLimit.ts`
- Test: `shared/test/world.test.ts`, `shared/test/ceremony.test.ts`, `shared/test/rateLimit.test.ts`

**Interfaces:**
- Produces (`world.ts`; đơn vị mét, mặt đất y=0, cổng ở +z, chánh điện ở −z):
  ```ts
  export interface Box { minX: number; maxX: number; minZ: number; maxZ: number }
  export type ZoneKind = 'cushion' | 'burner' | 'bell' | 'mo';
  export interface Zone { id: string; kind: ZoneKind; x: number; z: number; r: number; burner?: BurnerId }
  export const BOUNDS: Box;            // { minX:-20, maxX:20, minZ:-30, maxZ:20 }
  export const OBSTACLES: Box[];       // tường chánh điện (chừa cửa x∈[-3,3] tại z=-10), bàn thờ+tượng {-2.5,2.5,-27,-23}, hồ sen {-10,-4,0,8}, lư hương sân, tháp chuông
  export const ZONES: Zone[];          // 20 bồ đoàn (4 cột × 5 hàng, x∈[-4.5,4.5], z∈[-20,-12]), 'burner-hall' (0,-21,b:'hall'), 'burner-yard' (0,4,b:'yard'), 'bell' (12,-2), 'mo' (3.5,-22)
  export const SPAWN: { x: number; z: number; ry: number }; // (0,15, quay về −z)
  export const PLAYER_RADIUS = 0.35;
  export function resolveCollision(x: number, z: number): { x: number; z: number }; // kẹp vào BOUNDS rồi đẩy ra khỏi OBSTACLES (hình tròn bán kính PLAYER_RADIUS vs AABB)
  export function nearestZone(x: number, z: number): Zone | null; // zone gần nhất mà khoảng cách ≤ r
  ```
  Builder được chỉnh toạ độ khi dựng cảnh; test phải tham chiếu hằng số, không dùng số cứng ngoài các mốc nêu ở test.
- Produces (`ceremony.ts`):
  ```ts
  export const CEREMONY_HOURS_VN = [5, 18], CEREMONY_DURATION_MS = 15 * 60_000;
  export function ceremonyStatus(nowMs: number): { active: boolean; startMs: number; endMs: number; nextStartMs: number };
  // active: [startMs,endMs) là phiên đang diễn ra; nếu không active thì startMs/endMs là phiên kế tiếp. nextStartMs luôn là lần bắt đầu kế tiếp > nowMs.
  ```
- Produces (`rateLimit.ts`): `export class TokenBucket { constructor(ratePerSec: number, burst: number, now?: number); take(now: number, cost?: number): boolean }`

- [ ] **Step 1: Viết test thất bại**

```ts
// world.test.ts
test('kẹp ngoài bản đồ', () => expect(resolveCollision(999, -999)).toEqual({ x: BOUNDS.maxX - PLAYER_RADIUS, z: BOUNDS.minZ + PLAYER_RADIUS }));
test('không đứng trong bàn thờ', () => {
  const p = resolveCollision(0, -25);
  const altar = OBSTACLES.find(b => b.minZ <= -25 && b.maxZ >= -25 && b.minX <= 0 && b.maxX >= 0)!;
  expect(p.x < altar.minX - PLAYER_RADIUS + 1e-6 || p.x > altar.maxX + PLAYER_RADIUS - 1e-6 || p.z < altar.minZ - PLAYER_RADIUS + 1e-6 || p.z > altar.maxZ + PLAYER_RADIUS - 1e-6).toBe(true);
});
test('đi qua cửa chánh điện được', () => expect(resolveCollision(0, -10)).toEqual({ x: 0, z: -10 }));
test('spawn hợp lệ', () => expect(resolveCollision(SPAWN.x, SPAWN.z)).toEqual({ x: SPAWN.x, z: SPAWN.z }));
test('có 20 bồ đoàn, zone gần', () => {
  expect(ZONES.filter(z => z.kind === 'cushion')).toHaveLength(20);
  const bell = ZONES.find(z => z.kind === 'bell')!;
  expect(nearestZone(bell.x + 0.1, bell.z)?.id).toBe(bell.id);
  expect(nearestZone(SPAWN.x, SPAWN.z)).toBeNull();
});
// ceremony.test.ts  (05:00 VN = 22:00 UTC hôm trước; 18:00 VN = 11:00 UTC)
const utc = (s: string) => Date.parse(s);
test('đang lễ sáng', () => expect(ceremonyStatus(utc('2026-11-01T22:05:00Z'))).toMatchObject({ active: true, startMs: utc('2026-11-01T22:00:00Z'), nextStartMs: utc('2026-11-02T11:00:00Z') }));
test('ngay trước lễ chiều', () => expect(ceremonyStatus(utc('2026-11-02T10:59:59Z'))).toMatchObject({ active: false, startMs: utc('2026-11-02T11:00:00Z') }));
test('vừa hết lễ', () => expect(ceremonyStatus(utc('2026-11-02T11:15:00Z')).active).toBe(false));
// rateLimit.test.ts
test('burst rồi chặn, hồi theo thời gian', () => {
  const b = new TokenBucket(10, 3, 0);
  expect([b.take(0), b.take(0), b.take(0), b.take(0)]).toEqual([true, true, true, false]);
  expect(b.take(100)).toBe(true);
});
```

- [ ] **Step 2:** `npx vitest run shared` → FAIL.
- [ ] **Step 3:** Cài đặt ba module.
- [ ] **Step 4:** `npx vitest run shared` → PASS.
- [ ] **Step 5:** Commit `feat(shared): world map, ceremony schedule, token bucket`.

### Task 3: DO Hall

**Files:**
- Create: `realtime/package.json`, `realtime/wrangler.jsonc`, `realtime/vitest.config.ts`, `realtime/src/hall.ts`, `realtime/src/index.ts` (bản tối thiểu: định tuyến `/hall/:n` tới DO)
- Test: `realtime/test/hall.test.ts`

**Interfaces:**
- Consumes: mọi thứ trong `shared/src/protocol.ts`, `resolveCollision`, `TokenBucket`, `sanitizeName`.
- Produces: `export class Hall extends DurableObject<Env>`, nhận WebSocket upgrade tại `GET /hall/:n` (n ∈ [0, HALL_COUNT)); `Env` có `HALL: DurableObjectNamespace<Hall>`, `LOBBY: DurableObjectNamespace<Lobby>` (Task 4), `ALLOWED_ORIGINS: string`.
- Hành vi:
  - Dùng `ctx.acceptWebSocket` + `serializeAttachment({ id, state: PlayerState | null, lastIncense })`.
  - Ngay khi số socket đã accept ≥ `HALL_CAPACITY`: accept, gửi `{t:'full'}`, đóng code `4001`.
  - Sau `hello` → gửi `welcome` (gồm `now`, người chơi hiện tại, nén hương còn hạn).
  - Tin `s` → `resolveCollision` rồi đánh dấu dirty; chỉ tin `s` sau `hello` mới hợp lệ.
  - Lịch flush ≤ 5Hz (`setTimeout` 200ms, chỉ khi có dirty) → một `snap` cho mọi socket.
  - `a` → phát `act` ngay cho người khác.
  - `inc` → bị chặn nếu chưa qua `INCENSE_COOLDOWN_MS` kể từ lần trước của người đó; giữ tối đa `INCENSE_MAX_PER_HALL`, bỏ nén cũ nhất; lọc hết hạn `INCENSE_TTL_MS` khi đọc.
  - Rate limit mỗi kết nối `TokenBucket(15, 30)`; tin bị `parseClientMsg` loại hoặc vượt rate tính là vi phạm; 20 vi phạm → đóng `4008`.
  - Đóng/lỗi → thêm vào `gone`.
  - Mỗi lần join/leave gọi `env.LOBBY.get(idFromName('lobby')).report(hall, count)` (RPC; throttle ≤ 1 lần/giây/hall, luôn báo khi count về 0).
  - Nén hương lưu trong `ctx.storage` để còn sau khi hibernate.

- [ ] **Step 1:** Cài `wrangler @cloudflare/vitest-pool-workers @cloudflare/workers-types`; `wrangler.jsonc` với `compatibility_date: "2026-10-01"`, hai DO binding, migration `new_sqlite_classes: ["Hall","Lobby"]`, var `ALLOWED_ORIGINS`. Tạo stub `Lobby` có `report()` rỗng để Task 3 chạy độc lập.
- [ ] **Step 2: Viết test thất bại** (helper `connect(n)` dùng `SELF.fetch('http://x/hall/0', {headers:{Upgrade:'websocket', Origin:'http://localhost:5173'}})`, `ws.accept()`, gom tin vào mảng; `next(t)` chờ tin loại `t`):

```ts
test('hello → welcome có id & now', async () => { const a = await connect(0); a.send({ t: 'hello', name: 'An', robe: 'lam' }); expect(await a.next('welcome')).toMatchObject({ hall: 0, players: [] }); });
test('người thứ hai thấy người thứ nhất qua snap', async () => { /* a hello + s(1,10); b hello; b nhận snap/welcome chứa a với x=1,z=10 */ });
test('toạ độ trên bàn thờ bị đẩy ra', async () => { /* a gửi s(0,-25); b nhận snap: vị trí a ≠ (0,-25) và == resolveCollision(0,-25) */ });
test('gộp snapshot ≤ 5Hz', async () => { /* a gửi 50 tin s trong 1s; b nhận ≤ 6 snap */ });
test('hành động phát cho người khác', async () => { /* a gửi a:'bow' → b nhận {t:'act', id:a.id, a:'bow'} */ });
test('thắp hương có cooldown & còn khi người mới vào', async () => { /* a inc yard 2 lần liền → b nhận đúng 1 'inc'; c vào → welcome.incense dài 1 */ });
test('đầy 100 → full + đóng 4001', async () => { /* mở 100 kết nối; kết nối 101 nhận {t:'full'} và close code 4001 */ });
test('spam rác → đóng 4008', async () => { /* gửi 25 tin '{bad' → close code 4008 */ });
test('rời đi → gone', async () => { /* a đóng → b nhận snap.gone chứa a.id */ });
```

- [ ] **Step 3:** `npm test -w realtime` → FAIL.
- [ ] **Step 4:** Cài đặt `hall.ts` và router tối thiểu.
- [ ] **Step 5:** `npm test -w realtime` → PASS.
- [ ] **Step 6:** Commit `feat(realtime): Hall durable object with batched snapshots`.

### Task 4: DO Lobby + router đầy đủ

**Files:**
- Create: `realtime/src/lobby.ts`
- Modify: `realtime/src/index.ts`
- Test: `realtime/test/lobby.test.ts`

**Interfaces:**
- Produces: `export class Lobby extends DurableObject<Env> { report(hall: number, count: number): Promise<void>; assign(exclude: number[]): Promise<{ hall: number; total: number }> }`, lưu counts trong `ctx.storage`.
  - Thuật toán `assign`: hall số nhỏ nhất có count < 90 (`SOFT_CAP`) và không nằm trong `exclude`; nếu không có thì hall ít người nhất có count < 100; nếu không có thì `hall: -1`.
- Router HTTP (Worker `fetch`):
  - `GET /lobby?exclude=1,2` → JSON `{hall,total}`.
  - `GET /stats` → `{total}`, `Cache-Control: max-age=5`.
  - `GET /hall/:n` (WebSocket) → DO `Hall` tên `hall-${n}`; n ngoài khoảng → 404.
  - Header `Origin` không thuộc `ALLOWED_ORIGINS` (danh sách phân tách dấu phẩy) → 403. CORS header cho origin hợp lệ.

- [ ] **Step 1: Viết test thất bại**

```ts
test('xếp vào gian 0 khi trống', async () => expect(await getJson('/lobby')).toEqual({ hall: 0, total: 0 }));
test('gian 0 đạt 90 → gian 1; exclude được tôn trọng', async () => {
  await lobby.report(0, 90); expect((await getJson('/lobby')).hall).toBe(1);
  expect((await getJson('/lobby?exclude=1')).hall).toBe(2);
});
test('tất cả đầy → -1', async () => { for (let h = 0; h < 100; h++) await lobby.report(h, 100); expect((await getJson('/lobby')).hall).toBe(-1); });
test('total = tổng counts', async () => { await lobby.report(3, 7); await lobby.report(4, 5); expect((await getJson('/stats')).total).toBe(12); });
test('origin lạ → 403; hall 100 → 404', async () => { /* ... */ });
test('Hall join thật làm tăng total', async () => { /* connect hall 0 + hello; chờ ≤1.5s; /stats total ≥ 1 */ });
```

- [ ] **Step 2:** FAIL → **Step 3:** cài đặt → **Step 4:** `npm test -w realtime` PASS.
- [ ] **Step 5:** Commit `feat(realtime): Lobby assignment, stats, origin check`.

### Task 5: Web — khung Vite + cảnh chùa + chất lượng

**Files:**
- Create: `web/package.json`, `web/vite.config.ts`, `web/index.html`, `web/src/main.ts`, `web/src/config.ts`, `web/src/scene/{renderer,temple,materials,quality}.ts`, `scripts/check-size.mjs`
- Test: `web/test/quality.test.ts`

**Interfaces:**
- Consumes: `BOUNDS, OBSTACLES, ZONES` (dựng vật thể đúng chỗ va chạm).
- Produces:
  - `config.ts`: `export const REALTIME_URL: string | null` (từ `VITE_REALTIME_URL`, rỗng → null), `export const DONATE_URL: string`.
  - `renderer.ts`: `export function createRenderer(canvas: HTMLCanvasElement): { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; onFrame(cb: (dt: number) => void): void } | null` — trả `null` khi không có WebGL.
  - `temple.ts`: `export function buildTemple(scene: THREE.Scene): { burners: Record<BurnerId, THREE.Vector3>; bell: THREE.Object3D; mo: THREE.Object3D }` — procedural low-poly: cổng tam quan, sân gạch, hồ sen, chánh điện mái cong đỏ/ngói, cột son, tượng Phật vàng ngồi trên toà sen, bồ đoàn, lư hương, tháp chuông. Hình học lặp lại dùng `InstancedMesh`/geometry gộp. Phải tôn kính: tượng ở vị trí cao, không có thứ gì đè lên.
  - `quality.ts`: `export class QualityGovernor { constructor(setLevel: (lvl: 0|1|2) => void); sample(fps: number): void }` — bắt đầu ở mức 2; 3 giây liên tiếp < 28fps → giảm 1 mức; không tự tăng lại trong phiên. Mức quy định pixelRatio (2 / 1.5 / 1) và bật/tắt bóng.
- `index.html`: thẻ OG/Twitter (title "Viếng Chùa Online", mô tả tiếng Việt, `og.png` 1200×630), `<meta viewport>` chặn zoom khi chạm hai lần, Cloudflare Web Analytics beacon (token qua `VITE_CF_BEACON`, bỏ qua khi rỗng). Không có WebGL → hiện thông báo thân thiện bằng tiếng Việt.
- `check-size.mjs`: sau `vite build`, fail nếu tổng gzip `*.js` > 250KB hoặc tổng byte mọi file trong `dist` trừ `audio/` > 1,5MB. In ra số liệu.

- [ ] **Step 1: Viết test thất bại**

```ts
test('giảm mức sau 3s fps thấp, không tăng lại', () => {
  const lv: number[] = []; const q = new QualityGovernor(l => lv.push(l));
  for (let i = 0; i < 3; i++) q.sample(20);
  for (let i = 0; i < 10; i++) q.sample(60);
  for (let i = 0; i < 3; i++) q.sample(20);
  expect(lv).toEqual([1, 0]);
});
test('fps chập chờn không giảm', () => { const lv: number[] = []; const q = new QualityGovernor(l => lv.push(l)); [20, 20, 40, 20, 20, 40].forEach(f => q.sample(f)); expect(lv).toEqual([]); });
```
(`sample` được gọi mỗi giây một lần với fps trung bình của giây đó.)

- [ ] **Step 2:** FAIL → **Step 3:** cài đặt các module; `main.ts` dựng cảnh, camera nhìn từ SPAWN.
- [ ] **Step 4:** `npm test -w web` PASS; `npm run build -w web && node scripts/check-size.mjs` PASS; `npm run dev -w web` và mở trên trình duyệt thấy chùa (chụp ảnh màn hình bằng Playwright MCP để tự kiểm tra bằng mắt).
- [ ] **Step 5:** Commit `feat(web): procedural Vietnamese temple scene + quality governor + size budget`.

### Task 6: Web — nhân vật & điều khiển

**Files:**
- Create: `web/src/player/{avatar,controls,localPlayer}.ts`
- Test: `web/test/localPlayer.test.ts`, `web/test/controls.test.ts`

**Interfaces:**
- Consumes: `resolveCollision, nearestZone, SPAWN, Zone`, `Pose`, `Robe`.
- Produces:
  - `avatar.ts`: `export function createAvatar(robe: Robe, name: string): { root: THREE.Object3D; setPose(p: Pose, t: number): void; dispose(): void }` — chibi (đầu to, áo theo màu robe, nhãn tên dạng sprite). Bow = tween cúi gập 1,6s; Sit = ngồi xếp bằng.
  - `controls.ts`: `export class Controls { constructor(el: HTMLElement); readonly move: { x: number; z: number } /* |v| ≤ 1, hệ camera */; readonly camYaw: number; dispose(): void }` — WASD/mũi tên, kéo chuột/vuốt ở nửa phải để xoay camera, joystick ảo ở góc dưới trái khi chạm.
  - `localPlayer.ts`: `export class LocalPlayer { x: number; z: number; ry: number; pose: Pose; constructor(); update(dt: number, move: {x:number;z:number}, camYaw: number): void; sitAt(zone: Zone): void; standUp(): void; bow(): boolean /* chỉ khi Sit */; get changed(): boolean /* có thay đổi kể từ lần takeChanged */; takeChanged(): void }` — tốc độ 3 m/s; di chuyển khi đang ngồi → đứng dậy; mọi bước qua `resolveCollision`.
  - Camera góc nhìn thứ ba theo sau, có giới hạn zoom (lăn chuột/chụm hai ngón).

- [ ] **Step 1: Viết test thất bại**

```ts
test('đi 1s về phía trước ≈ 3m', () => { const p = new LocalPlayer(); p.update(1, { x: 0, z: -1 }, 0); expect(SPAWN.z - p.z).toBeCloseTo(3, 1); expect(p.pose).toBe(Pose.Walk); });
test('không xuyên bàn thờ', () => { const p = new LocalPlayer(); p.x = 0; p.z = -22.5; p.update(1, { x: 0, z: -1 }, 0); expect(p.z).toBeGreaterThan(-23); });
test('lạy chỉ khi ngồi; đi thì đứng dậy', () => {
  const p = new LocalPlayer(); expect(p.bow()).toBe(false);
  p.sitAt(ZONES.find(z => z.kind === 'cushion')!); expect(p.pose).toBe(Pose.Sit); expect(p.bow()).toBe(true);
  p.update(0.1, { x: 1, z: 0 }, 0); expect(p.pose).toBe(Pose.Walk);
});
test('changed chỉ bật khi có thay đổi', () => { const p = new LocalPlayer(); p.takeChanged(); p.update(0.1, { x: 0, z: 0 }, 0); expect(p.changed).toBe(false); });
// controls.test.ts (jsdom): nhấn 'KeyW' → move.z === -1; nhấn W+D → |move| ≤ 1
```

- [ ] **Step 2:** FAIL → **Step 3:** cài đặt; gắn vào `main.ts` (nút "Ngồi" hiện khi `nearestZone` là cushion).
- [ ] **Step 4:** `npm test -w web` PASS; kiểm tra tay trên viewport điện thoại (Playwright resize 390×844) rằng joystick chạy.
- [ ] **Step 5:** Commit `feat(web): chibi avatar, touch/keyboard controls, local movement`.

### Task 7: Web — hành động, hương, âm thanh, tiến trình

**Files:**
- Create: `web/src/interact/{actions,incense,audio}.ts`, `web/src/state/progress.ts`, `ATTRIBUTION.md`
- Test: `web/test/progress.test.ts`, `web/test/audio.test.ts`, `web/test/actions.test.ts`

**Interfaces:**
- Consumes: `LocalPlayer`, `nearestZone`, `INCENSE_TTL_MS`, `INCENSE_COOLDOWN_MS`, `BurnerId`, `Action`.
- Produces:
  - `progress.ts`: `export interface Progress { bowsTotal: number; bowsToday: number; day: string /* YYYY-MM-DD giờ VN */; beadIndex: number /* 0..107 */; beadRounds: number; incenseTotal: number; name: string; robe: Robe; lang: 'vi'|'en' | null }`; `export function loadProgress(storage?: Storage, now?: number): Progress`; `export function saveProgress(p: Progress, storage?: Storage): void`; `export function addBow(p: Progress, now: number): { p: Progress; milestone: 3 | 108 | null }`; `export function nextBead(p: Progress): { p: Progress; roundDone: boolean }`. Key `vco.progress.v1`; JSON hỏng hoặc storage ném lỗi (Safari private) → mặc định, không crash.
  - `audio.ts`: `export class AudioManager { unlock(): void; playBell(): void; playMo(): void; playBead(): void; setChant(on: boolean): Promise<void>; seekChant(offsetSec: number): void; setVolume(ch: 'sfx'|'chant', v: number): void }` — chuông/mõ/hạt tổng hợp bằng Web Audio (0 byte tải). Niệm Phật tải lazy từ `audio/niem-phat.m4a` (lặp lại); thiếu file → dùng âm drone tổng hợp. Trước `unlock()` mọi lệnh phát là no-op.
  - `incense.ts`: `export class IncenseField { constructor(scene: THREE.Scene, burners: Record<BurnerId, THREE.Vector3>); add(i: Incense): void; sync(list: Incense[], now: number): void; update(dt: number, now: number): void }` — 3 nén/lần thắp, khói bằng points/sprite instanced, tự tắt sau TTL, tối đa 60 bó.
  - `actions.ts`: `export class Actions { constructor(deps: { player: LocalPlayer; audio: AudioManager; incense: IncenseField; send: (m: ClientMsg) => void; now: () => number }); available(): { sit: boolean; bow: boolean; bell: boolean; mo: boolean; incense: BurnerId | null }; bow(): void; bell(): void; mo(): void; bead(): void; lightIncense(): boolean /* false khi đang cooldown */; onRemoteAction(id: string, a: Action): void }` — mỗi hành động cập nhật progress, phát âm thanh và gửi tin.
  - `ATTRIBUTION.md`: liệt kê mọi asset/âm thanh kèm license. Nếu chưa tìm được bản thu niệm Phật CC0 chắc chắn, ghi "đang dùng âm tổng hợp" và để file trống.

- [ ] **Step 1: Viết test thất bại**

```ts
test('mốc 3 và 108 lạy', () => { let p = loadProgress(memStorage(), 0); const ms: (number|null)[] = []; for (let i = 0; i < 108; i++) { const r = addBow(p, 0); p = r.p; ms.push(r.milestone); } expect(ms[2]).toBe(3); expect(ms[107]).toBe(108); expect(ms.filter(Boolean)).toHaveLength(2); });
test('bowsToday reset theo ngày VN', () => { let p = addBow(loadProgress(memStorage(), Date.parse('2026-11-01T16:00:00Z')), Date.parse('2026-11-01T16:00:00Z')).p; p = addBow(p, Date.parse('2026-11-01T17:30:00Z')).p; expect(p.bowsToday).toBe(1); expect(p.bowsTotal).toBe(2); }); // 17:00Z = 00:00 VN
test('hạt thứ 108 xong vòng, quay về 0', () => { let p = { ...loadProgress(memStorage(), 0), beadIndex: 107 }; const r = nextBead(p); expect(r.roundDone).toBe(true); expect(r.p.beadIndex).toBe(0); expect(r.p.beadRounds).toBe(1); });
test('storage hỏng/ném lỗi không crash', () => { expect(loadProgress(throwingStorage(), 0).bowsTotal).toBe(0); expect(() => saveProgress(loadProgress(throwingStorage(), 0), throwingStorage())).not.toThrow(); });
test('audio trước unlock là no-op, không tạo AudioContext', () => { const spy = vi.fn(); (globalThis as any).AudioContext = spy; const a = new AudioManager(); a.playBell(); expect(spy).not.toHaveBeenCalled(); });
test('thắp hương cooldown 10s', () => { /* actions với player đứng tại burner-yard, now=0 → true; now=5000 → false; now=10001 → true; send nhận 2 tin {t:'inc',b:'yard'} */ });
test('không lạy khi đứng', () => { /* player Stand → actions.available().bow === false; actions.bow() không gửi tin */ });
```

- [ ] **Step 2:** FAIL → **Step 3:** cài đặt; nối vào `main.ts` (handler `pointerdown` đầu tiên gọi `audio.unlock()`).
- [ ] **Step 4:** `npm test -w web` PASS; build + check-size PASS.
- [ ] **Step 5:** Commit `feat(web): bow/beads/bell/mo/incense with synthesized audio and local progress`.

### Task 8: Web — mạng, người chơi khác, chế độ một mình

**Files:**
- Create: `web/src/net/{client,interpolation,remotePlayers}.ts`
- Test: `web/test/netClient.test.ts`, `web/test/interpolation.test.ts`

**Interfaces:**
- Consumes: `REALTIME_URL`, `ServerMsg/ClientMsg`, `NET_HZ`, `LocalPlayer.changed/takeChanged`, `Actions.onRemoteAction`, `IncenseField`, `createAvatar`.
- Produces:
  - `interpolation.ts`: `export class Interp { push(t: number, x: number, z: number, ry: number): void; sample(t: number): { x: number; z: number; ry: number } }` — hiển thị trễ 200ms, nội suy tuyến tính, ry theo đường ngắn nhất, chỉ giữ 10 mẫu.
  - `client.ts`:
    ```ts
    export type NetStatus = 'connecting' | 'online' | 'solo';
    export class NetClient {
      constructor(opts: { url: string | null; fetchFn?: typeof fetch; WS?: typeof WebSocket; now?: () => number; random?: () => number; setTimer?: typeof setTimeout });
      start(hello: { name: string; robe: Robe }): void;
      sendState(s: { x: number; z: number; ry: number; p: Pose }): void; // ghép thành ≤ NET_HZ
      send(m: ClientMsg): void;          // offline → bỏ qua
      changeHall(): void;                // gọi /lobby?exclude=<hiện tại>
      on(ev: 'status', cb: (s: NetStatus, hall: number | null) => void): void;
      on(ev: 'msg', cb: (m: ServerMsg) => void): void;
      readonly serverOffsetMs: number;   // now_server - now_client, lấy từ welcome
      readonly hall: number | null;
    }
    ```
  - Luồng:
    - `url` null → `solo` ngay.
    - `GET {url}/lobby` → `hall`. Nếu `-1` hoặc lỗi → `solo` rồi thử lại nền sau backoff.
    - Mở `wss {url}/hall/{n}` → gửi `hello` → nhận `welcome` → `online`.
    - Nhận `full` hoặc close `4001` → hỏi lại lobby với `exclude` tích luỹ, tối đa 3 lần, sau đó `solo`.
    - Rớt kết nối → `solo` + reconnect với backoff `min(30s, 1s·2^k) · (0.5 + random())`.
    - `document.visibilitychange` sang visible → thử reconnect ngay nếu đang solo.
  - `remotePlayers.ts`: `export class RemotePlayers { constructor(scene: THREE.Scene); apply(m: ServerMsg, now: number): void; update(now: number): void; count(): number; clear(): void }` — mỗi người một avatar, nhãn tên; quá 60 người thì ẩn nhãn tên của người ở xa để giữ fps.

- [ ] **Step 1: Viết test thất bại** (FakeWS + fake fetch + fake timers):

```ts
test('không có URL → solo', () => { const c = new NetClient({ url: null }); const s = vi.fn(); c.on('status', s); c.start(h); expect(s).toHaveBeenLastCalledWith('solo', null); });
test('lobby → hall → welcome → online, offset đồng hồ', async () => { /* fetch trả {hall:3}; FakeWS mở tại .../hall/3; server gửi welcome now=client+5000 → status online,3; serverOffsetMs≈5000; tin đầu tiên client gửi là hello */ });
test('full → thử gian khác tối đa 3 lần rồi solo', async () => { /* lobby trả 0,1,2,3; mỗi WS nhận full; fetch được gọi với exclude=0, exclude=0,1, exclude=0,1,2; sau lần thứ 3 status solo */ });
test('rớt kết nối → backoff có jitter, không quá 30s', async () => { /* random=()=>0.5 → các delay 1000,2000,4000,…,30000 (chặn trần) */ });
test('sendState gộp ≤ 5Hz', () => { /* 20 lần sendState trong 1s (fake time) → FakeWS.sent có ≤ 5 tin 's', tin cuối mang trạng thái mới nhất */ });
// interpolation.test.ts
test('nội suy giữa hai mẫu với độ trễ 200ms', () => { const i = new Interp(); i.push(0, 0, 0, 0); i.push(200, 2, 0, 0); expect(i.sample(300).x).toBeCloseTo(1); });
test('ry đi đường ngắn nhất qua ±π', () => { const i = new Interp(); i.push(0, 0, 0, 3.0); i.push(200, 0, 0, -3.0); expect(Math.abs(i.sample(300).ry)).toBeGreaterThan(3.0); });
```

- [ ] **Step 2:** FAIL → **Step 3:** cài đặt; nối vào `main.ts`: mỗi frame `if (player.changed) { net.sendState(...); player.takeChanged() }`; `msg` → remotePlayers/actions/incense.
- [ ] **Step 4:** `npm test -w web` PASS. Chạy thử tích hợp: `npx wrangler dev` trong `realtime` + `VITE_REALTIME_URL=http://localhost:8787 npm run dev -w web`, mở 2 tab, thấy nhau đi lại và lạy. Tắt wrangler → cả hai chuyển "viếng một mình", không lỗi; bật lại → tự online.
- [ ] **Step 5:** Commit `feat(web): realtime client, remote avatars, solo fallback`.

### Task 9: Web — UI, i18n, giờ lễ, chia sẻ, cúng dường

**Files:**
- Create: `web/src/ui/{i18n,onboarding,hud,share}.ts`, `web/src/ui/styles.css`, `web/public/og.png`
- Test: `web/test/i18n.test.ts`, `web/test/hud.test.ts`

**Interfaces:**
- Consumes: `Progress`, `Actions.available()`, `NetClient.on('status')`, `ceremonyStatus`, `serverOffsetMs`, `AudioManager.setChant/seekChant`, `DONATE_URL`, `REALTIME_URL` (`/stats`).
- Produces:
  - `i18n.ts`: `export type Lang = 'vi' | 'en'; export function detectLang(navLangs: readonly string[], saved: Lang | null): Lang; export function t(key: keyof typeof vi, vars?: Record<string, string | number>): string; export function setLang(l: Lang): void`. Từ điển `vi` là nguồn chuẩn; `en` phải đủ key (kiểm bằng kiểu TS).
  - `onboarding.ts`: màn đầu gồm ô pháp danh (tuỳ chọn), 4 màu áo, nút "Vào chùa". Nút này là cử chỉ đầu tiên → `audio.unlock()`. Lần sau nhớ lựa chọn và có nút "Vào chùa" một chạm.
  - `hud.ts`:
    - Nút hành động theo `available()`: Ngồi, Lạy, Thỉnh chuông, Gõ mõ, Thắp hương, Lần chuỗi; nút "Đứng dậy" khi đang ngồi.
    - Bộ đếm lạy/hạt, toast mốc 3/108.
    - Trạng thái mạng ("Gian 12 · đang có 1.234 người viếng chùa" hoặc "Đang viếng một mình"), nút đổi gian.
    - Đếm ngược "Lễ chung lúc 18:00 — còn 1:23:45", khi đang lễ hiện "Đang tụng niệm chung" và tự bật chant tại `seekChant((now+offset-startMs)/1000)` nếu người dùng chưa tắt.
    - Nút niệm Phật bật/tắt, đổi ngôn ngữ, chia sẻ, "Cúng dường duy trì chùa" (mở `DONATE_URL` tab mới, chỉ hiện khi có URL), "Nguồn & giấy phép" (hiện ATTRIBUTION).
    - Poll `/stats` mỗi 30s khi online.
  - Export thuần để test: `export function formatCountdown(ms: number): string` (`h:mm:ss`), `export function formatCount(n: number, lang: Lang): string` (vi `1.234`, en `1,234`).
  - `share.ts`: `export async function share(url: string, text: string): Promise<'shared' | 'copied' | 'failed'>` — dùng `navigator.share`, không có thì clipboard.
  - CSS: ưu tiên điện thoại, chừa safe-area, nút ≥ 44px, tông nâu/vàng/đỏ son trang nhã, không che tượng Phật.

- [ ] **Step 1: Viết test thất bại**

```ts
test('detectLang', () => { expect(detectLang(['vi-VN'], null)).toBe('vi'); expect(detectLang(['zh-TW', 'en'], null)).toBe('en'); expect(detectLang(['vi'], 'en')).toBe('en'); });
test('t có biến', () => { setLang('vi'); expect(t('hall.status', { hall: 12, count: '1.234' })).toContain('12'); });
test('format', () => { expect(formatCountdown(5025_000)).toBe('1:23:45'); expect(formatCount(1234, 'vi')).toBe('1.234'); expect(formatCount(1234, 'en')).toBe('1,234'); });
test('share fallback copy', async () => { /* navigator.share undefined, clipboard.writeText mock → 'copied' */ });
```

- [ ] **Step 2:** FAIL → **Step 3:** cài đặt; tạo `og.png` (render cảnh chùa bằng Playwright screenshot 1200×630 kèm chữ "Viếng Chùa Online", nén ≤ 150KB).
- [ ] **Step 4:** `npm test -w web` PASS; build + check-size PASS; xem tay ở 390×844 và 1440×900 (chụp màn hình), UI không che tượng.
- [ ] **Step 5:** Commit `feat(web): onboarding, HUD, i18n vi/en, ceremony countdown, share & donate`.

### Task 10: Deploy, smoke test, load test, tài liệu

**Files:**
- Create: `.github/workflows/pages.yml`, `playwright.config.ts`, `e2e/smoke.spec.ts`, `scripts/loadtest.mjs`, `README.md`

**Interfaces:**
- Consumes: mọi thứ phía trên.
- Produces:
  - `pages.yml`: khi push `main`: `npm ci` → `npm test` → `npm run build -w web` (env `VITE_REALTIME_URL`, `VITE_DONATE_URL`, `VITE_CF_BEACON` từ repo variables) → `node scripts/check-size.mjs` → `actions/upload-pages-artifact` (`web/dist`) → `actions/deploy-pages`.
  - `scripts/loadtest.mjs`: `node scripts/loadtest.mjs --url <realtime> --bots 100 --halls 1 --seconds 60` mở N bot `ws`, mỗi bot đi vòng quanh 5Hz, thỉnh thoảng lạy/thắp hương. In ra số kết nối thành công/bị full, p50/p95 độ trễ snapshot, số tin nhận/giây.
  - `README.md` (tiếng Việt): chạy local, deploy realtime (`npx wrangler login && npm run deploy -w realtime`), bật GitHub Pages (Source: GitHub Actions), các biến cần đặt, chuyển sang Cloudflare Pages bằng `VITE_BASE=/`, checklist trước khi chia sẻ link (chạy loadtest 100 và 1.000 bot).

- [ ] **Step 1: Viết smoke test**

```ts
test('vào chùa & lạy ở chế độ một mình', async ({ page }) => {
  await page.goto('/'); // preview build, không có VITE_REALTIME_URL
  await page.getByRole('button', { name: 'Vào chùa' }).click();
  await expect(page.getByText('Đang viếng một mình')).toBeVisible();
  await page.evaluate(() => (window as any).__vco.teleportToCushion(0)); // hook chỉ có khi import.meta.env.MODE !== 'production'
  await page.getByRole('button', { name: 'Lạy' }).click();
  await expect(page.getByTestId('bow-count')).toHaveText('1');
});
test('không có lỗi console khi tải', async ({ page }) => { /* thu console 'error' khi vào trang → mảng rỗng */ });
test('viewport điện thoại có joystick', async ({ page }) => { /* 390×844, hasTouch → [data-testid=joystick] hiển thị */ });
```

- [ ] **Step 2:** `npx playwright test` → FAIL nếu thiếu hook/testid; thêm `__vco` (build `--mode e2e`) và `data-testid` → PASS.
- [ ] **Step 3:** Chạy `wrangler dev` + `node scripts/loadtest.mjs --url http://localhost:8787 --bots 100 --halls 1 --seconds 30` → 100 kết nối thành công, bot 101 bị full nếu chạy `--bots 101`; ghi số liệu vào README.
- [ ] **Step 4:** Tạo repo `hey-iam-ryan/viengchuaonline`, push `main`, xác nhận workflow xanh và trang chạy ở `https://hey-iam-ryan.github.io/viengchuaonline/` (chế độ một mình cho tới khi chủ dự án deploy realtime bằng tài khoản Cloudflare). *Tạo repo public và push là hành động ra ngoài → hỏi chủ dự án trước khi làm.*
- [ ] **Step 5:** Commit `chore: CI deploy to Pages, smoke + load tests, README`.
