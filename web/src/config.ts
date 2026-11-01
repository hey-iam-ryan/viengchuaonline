const env = import.meta.env;
const clean = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().replace(/\/+$/, '') : null);

/** URL gốc của Cloudflare Worker realtime (https://…). null → chỉ chế độ một mình. */
export const REALTIME_URL: string | null = clean(env.VITE_REALTIME_URL);
/** Link cúng dường bên ngoài (MoMo/Ko-fi…). Rỗng → ẩn nút. */
export const DONATE_URL: string = clean(env.VITE_DONATE_URL) ?? '';
export const CF_BEACON: string = clean(env.VITE_CF_BEACON) ?? '';
