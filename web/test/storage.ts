export function memStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}
export function throwingStorage(): Storage {
  const boom = () => { throw new Error('SecurityError'); };
  return { length: 0, clear: boom, getItem: boom, key: boom, removeItem: boom, setItem: boom } as unknown as Storage;
}
