# Nguồn & giấy phép

## Hình ảnh 3D
Toàn bộ cảnh chùa, tượng Phật, nhân vật, lư hương, hồ sen… được **dựng bằng code** (Three.js primitives) trong `web/src/scene/` và `web/src/player/`. Không dùng mô hình 3D bên ngoài.

## Âm thanh
- Đại hồng chung, mõ, chuông gia trì, tiếng hạt chuỗi: **tổng hợp bằng Web Audio API** trong `web/src/interact/audio.ts`.
- Niệm Phật (giờ lễ chung): hiện **đang dùng âm tổng hợp** (nền trầm + mõ). Có thể đặt bản thu tại `web/public/audio/niem-phat.m4a` — chỉ dùng bản thu CC0/CC-BY hoặc tự thu, và ghi nguồn tại đây.

## Thư viện
- [three.js](https://threejs.org) — MIT License.
