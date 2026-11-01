export type Lang = 'vi' | 'en';

export const vi = {
  'title': 'Viếng Chùa Online',
  'enter': 'Vào chùa',
  'onboard.sub': 'Bước vào chánh điện, lạy Phật, thắp hương, lần chuỗi cùng mọi người. Miễn phí, không cần đăng ký.',
  'onboard.name': 'Pháp danh (không bắt buộc)',
  'onboard.robe': 'Màu áo',
  'robe.lam': 'Áo lam', 'robe.nau': 'Áo nâu', 'robe.trang': 'Bạch y', 'robe.vang': 'Áo vàng',
  'me': 'Bạn',
  'act.sit': 'Ngồi', 'act.stand': 'Đứng dậy', 'act.bow': 'Lạy', 'act.bell': 'Thỉnh chuông', 'act.mo': 'Gõ mõ',
  'act.incense': 'Thắp hương', 'act.beads': 'Lần chuỗi',
  'hall.status': 'Gian {hall} · {count} người đang viếng chùa',
  'hall.connecting': 'Đang vào chánh điện…',
  'hall.solo': 'Đang viếng một mình',
  'hall.change': 'Đổi gian',
  'ceremony.next': 'Lễ chung lúc {time} — còn {left}',
  'ceremony.active': 'Đang tụng niệm chung 🙏',
  'chant': 'Niệm Phật',
  'share': 'Chia sẻ', 'share.copied': 'Đã sao chép link 🙏', 'share.text': 'Mình đang viếng chùa online, vào cùng nhé 🙏',
  'donate': 'Cúng dường duy trì chùa',
  'credits': 'Nguồn & giấy phép',
  'credits.body': 'Cảnh chùa, tượng, nhân vật được dựng bằng code. Âm chuông, mõ, niệm Phật được tổng hợp bằng Web Audio. Thư viện three.js (MIT). Không thu thập dữ liệu cá nhân; tiến trình chỉ lưu trên máy bạn.',
  'close': 'Đóng',
  'menu': 'Thêm',
  'stats.bows': 'Lạy hôm nay', 'stats.beads': 'Chuỗi', 'stats.rounds': 'vòng',
  'milestone.3': 'Đã lạy đủ 3 lạy 🙏', 'milestone.108': 'Viên mãn 108 lạy 🙏',
  'round.done': 'Xong một vòng chuỗi 108 hạt 🙏',
  'incense.wait': 'Hương vừa thắp, đợi {s} giây nhé',
  'incense.done': 'Đã dâng hương 🙏',
  'hint.desktop': 'W A S D / phím mũi tên để đi · kéo chuột để xoay · lăn chuột để phóng to',
  'hint.mobile': 'Chạm & kéo bên trái để đi · vuốt bên phải để xoay',
  'hint.cushion': 'Đến bồ đoàn trong chánh điện để ngồi lạy Phật',
  'lang': 'English',
  'webgl': 'Thiết bị hoặc trình duyệt của bạn chưa hỗ trợ đồ hoạ 3D (WebGL). Hãy thử Chrome hoặc Safari mới nhất. 🙏',
};
export type Key = keyof typeof vi;

export const en: Record<Key, string> = {
  'title': 'Online Temple Visit',
  'enter': 'Enter the temple',
  'onboard.sub': 'Step into a Vietnamese Buddhist temple: bow, offer incense and count prayer beads together with others. Free, no sign-up.',
  'onboard.name': 'Your name (optional)',
  'onboard.robe': 'Robe colour',
  'robe.lam': 'Blue', 'robe.nau': 'Brown', 'robe.trang': 'White', 'robe.vang': 'Saffron',
  'me': 'You',
  'act.sit': 'Sit', 'act.stand': 'Stand up', 'act.bow': 'Bow', 'act.bell': 'Ring bell', 'act.mo': 'Wooden fish',
  'act.incense': 'Offer incense', 'act.beads': 'Prayer beads',
  'hall.status': 'Hall {hall} · {count} people visiting',
  'hall.connecting': 'Entering the main hall…',
  'hall.solo': 'Visiting on your own',
  'hall.change': 'Change hall',
  'ceremony.next': 'Group chanting at {time} (Vietnam) — in {left}',
  'ceremony.active': 'Group chanting now 🙏',
  'chant': 'Chanting',
  'share': 'Share', 'share.copied': 'Link copied 🙏', 'share.text': "I'm visiting an online temple — come join 🙏",
  'donate': 'Support the temple',
  'credits': 'Credits & licenses',
  'credits.body': 'The temple, statue and characters are built in code. Bell, wooden fish and chanting sounds are synthesized with Web Audio. three.js (MIT). No personal data collected; progress stays on your device.',
  'close': 'Close',
  'menu': 'More',
  'stats.bows': 'Bows today', 'stats.beads': 'Beads', 'stats.rounds': 'rounds',
  'milestone.3': 'Three bows completed 🙏', 'milestone.108': '108 bows completed 🙏',
  'round.done': 'A full round of 108 beads 🙏',
  'incense.wait': 'Incense just offered, wait {s}s',
  'incense.done': 'Incense offered 🙏',
  'hint.desktop': 'WASD / arrow keys to walk · drag to look · scroll to zoom',
  'hint.mobile': 'Touch & drag on the left to walk · swipe right side to look',
  'hint.cushion': 'Go to a cushion in the main hall to sit and bow',
  'lang': 'Tiếng Việt',
  'webgl': 'Your device or browser does not support 3D graphics (WebGL). Please try the latest Chrome or Safari. 🙏',
};

let lang: Lang = 'vi';
const listeners: (() => void)[] = [];

export function detectLang(navLangs: readonly string[], saved: Lang | null): Lang {
  if (saved) return saved;
  if (!navLangs.length) return 'vi';
  return navLangs[0].toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function getLang(): Lang { return lang; }
export function setLang(l: Lang): void {
  lang = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  listeners.forEach((f) => f());
}
export function onLangChange(f: () => void): void { listeners.push(f); }

export function t(key: Key, vars?: Record<string, string | number>): string {
  let s = (lang === 'en' ? en : vi)[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
