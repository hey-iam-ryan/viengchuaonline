// Kiểm tra ngân sách tải: JS ≤ 250KB gzip, mọi file trong dist trừ audio/ ≤ 1.5MB.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = process.argv[2] ?? 'web/dist';
const JS_GZ_LIMIT = 250 * 1024;
const TOTAL_LIMIT = 1.5 * 1024 * 1024;

const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    statSync(p).isDirectory() ? walk(p) : files.push(p);
  }
};
walk(dist);

let jsGz = 0;
let total = 0;
for (const f of files) {
  const rel = relative(dist, f);
  if (rel.startsWith('audio/') || rel.startsWith('audio\\')) continue;
  const buf = readFileSync(f);
  total += buf.length;
  if (f.endsWith('.js')) jsGz += gzipSync(buf, { level: 9 }).length;
}
const kb = (n) => (n / 1024).toFixed(1) + 'KB';
console.log(`JS gzip: ${kb(jsGz)} / ${kb(JS_GZ_LIMIT)} · Tải đầu (trừ audio): ${kb(total)} / ${kb(TOTAL_LIMIT)}`);
if (jsGz > JS_GZ_LIMIT || total > TOTAL_LIMIT) {
  console.error('VƯỢT NGÂN SÁCH TẢI');
  process.exit(1);
}
