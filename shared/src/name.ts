export const DEFAULT_NAME = 'Phật tử';
const MAX_GRAPHEMES = 16;

// Từ cấm ngắn: chỉ khớp trọn từ hoặc trọn tên đã nén. Từ dài: khớp chuỗi con.
const BAD_WORDS = new Set([
  'dm', 'dcm', 'dmm', 'vcl', 'vkl', 'cc', 'loz', 'buoi', 'dit', 'dume',
  'fuck', 'shit', 'bitch', 'dick', 'cock', 'pussy', 'cunt', 'nigger', 'nigga', 'fck', 'wtf',
]);
const BAD_SUBSTR = ['fuck', 'dmm', 'dcm', 'dume', 'ditme', 'dumeo', 'concac', 'nigg', 'cunt', 'pussy'];

const deaccent = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase();

function isBad(name: string): boolean {
  const plain = deaccent(name);
  const words = plain.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const compact = words.join('');
  if (BAD_WORDS.has(compact) || words.some((w) => BAD_WORDS.has(w))) return true;
  return BAD_SUBSTR.some((b) => compact.includes(b));
}

export function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_NAME;
  let s = raw
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  const graphemes = [...new Intl.Segmenter().segment(s)].map((g) => g.segment);
  if (graphemes.length > MAX_GRAPHEMES) s = graphemes.slice(0, MAX_GRAPHEMES).join('').trim();
  if (!s || isBad(s)) return DEFAULT_NAME;
  return s;
}
