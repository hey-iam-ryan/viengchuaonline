import { occasionOf, type LunarDate } from '@vco/shared/lunar';
import { t } from './i18n';

export function occasionLabel(l: LunarDate): string | null {
  const o = occasionOf(l);
  return o ? t(`occ.${o}`, { m: l.month }) : null;
}

export function lunarShort(l: LunarDate): string {
  return t(l.leap ? 'lunar.shortLeap' : 'lunar.short', { d: l.day, m: l.month });
}
