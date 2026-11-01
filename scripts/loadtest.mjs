// Giả lập N người: node scripts/loadtest.mjs --url http://localhost:8787 --bots 100 --halls 1 --seconds 60
// Mỗi bot: vào gian, đi vòng 5Hz, thỉnh thoảng lạy/thắp hương. In số kết nối, bị full, độ trễ snapshot, tin nhận/giây.
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const url = arg('url', 'http://localhost:8787').replace(/\/$/, '');
const bots = Number(arg('bots', 100));
const halls = Number(arg('halls', 1));
const seconds = Number(arg('seconds', 30));
const origin = arg('origin', 'http://localhost:5173');
const wsBase = url.replace(/^http/, 'ws');

let ok = 0, full = 0, failed = 0, recv = 0;
const lat = [];
const socks = [];
const sentAt = new Map(); // id → thời điểm gửi tin s gần nhất

function bot(i) {
  return new Promise((resolve) => {
    const hall = i % halls;
    const ws = new WebSocket(`${wsBase}/hall/${hall}`, { headers: { Origin: origin } });
    let me = null, t = Math.random() * 10, timer;
    ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', name: `Bot ${i}`, robe: ['lam', 'nau', 'trang', 'vang'][i % 4] }));
    ws.onmessage = (e) => {
      recv++;
      const m = JSON.parse(e.data);
      if (m.t === 'full') { full++; resolve(); return; }
      if (m.t === 'welcome') {
        me = m.id; ok++; resolve();
        timer = setInterval(() => {
          t += 0.2;
          const r = 3 + (i % 7);
          sentAt.set(me, Date.now());
          ws.send(JSON.stringify({ t: 's', x: Math.sin(t) * r * 0.5, z: 4 + Math.cos(t) * r, ry: t, p: 1 }));
          if (Math.random() < 0.01) ws.send(JSON.stringify({ t: 'a', a: 'mo' }));
          if (Math.random() < 0.002) ws.send(JSON.stringify({ t: 'inc', b: 'yard' }));
        }, 200);
      }
      if (m.t === 'snap' && m.u) for (const p of m.u) if (p.id === me && sentAt.has(me)) lat.push(Date.now() - sentAt.get(me));
    };
    ws.onerror = () => { failed++; resolve(); };
    ws.onclose = () => clearInterval(timer);
    socks.push(ws);
  });
}

const start = Date.now();
for (let i = 0; i < bots; i++) { await bot(i); }
console.log(`Kết nối xong sau ${Date.now() - start}ms: ok=${ok} full=${full} lỗi=${failed}`);
const r0 = recv;
await new Promise((r) => setTimeout(r, seconds * 1000));
lat.sort((a, b) => a - b);
const pct = (p) => lat.length ? lat[Math.min(lat.length - 1, Math.floor(lat.length * p))] : NaN;
console.log(`Trong ${seconds}s: tin nhận/giây (tổng mọi bot) = ${Math.round((recv - r0) / seconds)}; độ trễ snapshot p50=${pct(0.5)}ms p95=${pct(0.95)}ms (n=${lat.length})`);
for (const s of socks) try { s.close(); } catch {}
setTimeout(() => process.exit(0), 300);
