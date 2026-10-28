import { useEffect, useRef, useState } from 'react';
import type { Snapshot } from '../../shared/types';

export class ApiError extends Error {
  constructor(message: string, public status: number, public data: Record<string, unknown> = {}) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: opts.method ?? (opts.body === undefined ? 'GET' : 'POST'),
    headers: opts.body === undefined ? undefined : { 'content-type': 'application/json' },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    credentials: 'same-origin'
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(String(data.error ?? 'Something went wrong.'), res.status, data);
  return data as T;
}

/**
 * Live snapshot over a WebSocket, with automatic reconnect.
 * Returns null until the first snapshot arrives.
 */
export function useLive(path: string | null): { snap: Snapshot | null; connected: boolean } {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const retry = useRef(0);

  useEffect(() => {
    if (!path) return;
    let ws: WebSocket | null = null;
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ping: ReturnType<typeof setInterval> | undefined;

    const open = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/api${path}`);
      ws.onopen = () => {
        retry.current = 0;
        setConnected(true);
        ping = setInterval(() => ws?.readyState === 1 && ws.send('ping'), 25_000);
      };
      ws.onmessage = (ev) => {
        if (ev.data === 'pong') return;
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'snapshot') setSnap(msg.data);
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        clearInterval(ping);
        if (closed) return;
        const wait = Math.min(15_000, 500 * 2 ** retry.current++);
        timer = setTimeout(open, wait);
      };
    };
    open();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && ws && ws.readyState > 1) {
        clearTimeout(timer);
        open();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      closed = true;
      clearTimeout(timer);
      clearInterval(ping);
      document.removeEventListener('visibilitychange', onVisible);
      ws?.close();
    };
  }, [path]);

  return { snap, connected };
}

export function minutes(n: number): string {
  if (n <= 0) return 'now';
  if (n < 60) return `${n} min`;
  return `${Math.floor(n / 60)} h ${n % 60} min`;
}

export function since(ts: number): string {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  return m === 0 ? 'just now' : `${m} min`;
}
