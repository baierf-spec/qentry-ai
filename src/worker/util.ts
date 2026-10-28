export const now = () => Date.now();

export function randomId(bytes = 12): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, bytes * 2);
}

export function randomDigits(n: number): string {
  const a = new Uint32Array(n);
  crypto.getRandomValues(a);
  return [...a].map((x) => String(x % 10)).join('');
}

export function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

export function slugify(text: string): string {
  const s = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return s || 'line';
}

/** "John Doe" -> "John D." — what other people see on the TV. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Guest';
  if (parts.length === 1) return parts[0].slice(0, 20);
  return `${parts[0].slice(0, 20)} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function clampText(v: unknown, max: number): string {
  return String(v ?? '').trim().slice(0, max);
}

export function dayKey(ts: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ts);
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}
