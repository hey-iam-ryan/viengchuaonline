type Attrs = { [k: string]: string | boolean | undefined | Record<string, (e: Event) => unknown>; on?: Record<string, (e: Event) => unknown> };

/** Tạo phần tử DOM an toàn (text qua textContent, không innerHTML). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: (Node | string | null | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'on') for (const [ev, fn] of Object.entries(v as Record<string, (e: Event) => void>)) el.addEventListener(ev, fn);
    else if (v === true) el.setAttribute(k, '');
    else if (typeof v === 'string') el.setAttribute(k, v);
  }
  for (const c of kids) if (c !== null && c !== false) el.append(c);
  return el;
}
