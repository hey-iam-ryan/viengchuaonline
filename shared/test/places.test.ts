import { test, expect } from 'vitest';
import { LINKS, PLACES, WAYPOINTS, canWalk, routeTo, type Pt } from '../src/places';
import { LAKE, ISLAND, SPAWN, nearestZone, resolveCollision } from '../src/world';

/** Đi lần lượt theo lộ trình bằng mô phỏng va chạm, trả về chỗ dừng cuối cùng. */
function follow(from: Pt, route: Pt[]): Pt {
  let p = from;
  for (const q of route) {
    expect(canWalk(p, q), `kẹt trên đoạn (${p.x},${p.z}) → (${q.x},${q.z})`).toBe(true);
    p = q;
  }
  return p;
}

test('mọi cạnh của đồ thị điểm mốc đi thẳng được cả hai chiều', () => {
  for (const [a, b] of LINKS) {
    expect(canWalk(WAYPOINTS[a], WAYPOINTS[b]), `${a} → ${b}`).toBe(true);
    expect(canWalk(WAYPOINTS[b], WAYPOINTS[a]), `${b} → ${a}`).toBe(true);
  }
});

test('điểm đứng của mỗi nơi đến tới được từ điểm mốc của nó', () => {
  for (const p of PLACES) expect(canWalk(WAYPOINTS[p.node], p), p.id).toBe(true);
});

test('từ chỗ xuất phát và từ mọi nơi đến, đi theo lộ trình đều tới mọi nơi đến khác', () => {
  const starts: Pt[] = [{ x: SPAWN.x, z: SPAWN.z }, ...PLACES];
  for (const s of starts) {
    for (const p of PLACES) {
      const end = follow(s, routeTo(s.x, s.z, p.id));
      expect(Math.hypot(end.x - p.x, end.z - p.z), `(${s.x},${s.z}) → ${p.id}`).toBeLessThan(0.5);
    }
  }
});

test('tới nơi là đứng trong vùng tương tác của khu đó', () => {
  const kind: Partial<Record<string, string>> = { bell: 'bell', drum: 'drum', wish: 'wish', zen: 'zen', quanam: 'quanam', lake: 'phongsinh', courtyard: 'burner' };
  for (const p of PLACES) if (kind[p.id]) expect(nearestZone(p.x, p.z)?.kind, p.id).toBe(kind[p.id]);
});

test('đang đứng tại nơi đến thì lộ trình chỉ còn một điểm', () => {
  for (const p of PLACES) expect(routeTo(p.x, p.z, p.id)).toEqual([{ x: p.x, z: p.z }]);
});

test('lộ trình qua cầu tới đảo Quan Âm không cắt ngang mặt hồ', () => {
  const r = routeTo(SPAWN.x, SPAWN.z, 'quanam');
  expect(r.length).toBeGreaterThan(1);
  expect(follow({ x: SPAWN.x, z: SPAWN.z }, r)).toEqual({ x: -34.2, z: 0 });
});

test('đứng ở chỗ bất kỳ trong khuôn viên: gần như luôn có điểm mốc đi thẳng tới được', () => {
  let free = 0;
  let ok = 0;
  for (let x = -48; x <= 48; x += 3) for (let z = -58; z <= 38; z += 3) {
    const q = resolveCollision(x, z);
    if (Math.hypot(q.x - x, q.z - z) > 0.01) continue; // đang ở trong vật cản
    const onWater = x > LAKE.minX && x < LAKE.maxX && z > LAKE.minZ && z < LAKE.maxZ && !(x > ISLAND.minX && x < ISLAND.maxX && z > ISLAND.minZ && z < ISLAND.maxZ);
    if (onWater) continue;
    free++;
    if (Object.values(WAYPOINTS).some((w) => canWalk({ x, z }, w))) ok++;
    expect(routeTo(x, z, 'hall').length, `(${x},${z})`).toBeGreaterThan(0);
  }
  expect(free).toBeGreaterThan(900);
  expect(ok / free).toBeGreaterThan(0.97); // phần còn lại là góc khuất (sau tượng, giữa khóm trúc): đi kiểu trượt dọc vật cản
});
