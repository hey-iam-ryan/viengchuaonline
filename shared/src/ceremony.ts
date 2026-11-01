export const CEREMONY_HOURS_VN = [5, 18];
export const CEREMONY_DURATION_MS = 15 * 60_000;
const DAY = 86_400_000;
const HOUR = 3_600_000;
const VN_OFFSET = 7 * HOUR; // UTC+7, không DST

export function ceremonyStatus(nowMs: number): { active: boolean; startMs: number; endMs: number; nextStartMs: number } {
  const vnDay = Math.floor((nowMs + VN_OFFSET) / DAY);
  const starts: number[] = [];
  for (let d = vnDay - 1; d <= vnDay + 1; d++) for (const h of CEREMONY_HOURS_VN) starts.push(d * DAY + h * HOUR - VN_OFFSET);
  starts.sort((a, b) => a - b);
  const nextStartMs = starts.find((s) => s > nowMs)!;
  const current = starts.find((s) => s <= nowMs && nowMs < s + CEREMONY_DURATION_MS);
  const startMs = current ?? nextStartMs;
  return { active: current !== undefined, startMs, endMs: startMs + CEREMONY_DURATION_MS, nextStartMs };
}
