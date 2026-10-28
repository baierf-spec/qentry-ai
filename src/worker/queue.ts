import { DurableObject } from 'cloudflare:workers';
import type { BusinessConfig, CallEvent, Entry, Snapshot } from '../shared/types';
import type { Env } from './env';
import { loadConfig } from './business';
import { dayKey, randomId, shortName } from './util';

/**
 * One QueueRoom per business. It owns the live line (who is waiting, who is being served)
 * and pushes a fresh snapshot to every connected screen on each change.
 * Finished visits are written to D1 for insights.
 */

interface State {
  businessId: string;
  day: string;
  counter: number;
  paused: boolean;
  entries: Entry[];
  serving: Record<string, string | null>; // stationId -> entryId
  lastCall: CallEvent | null;
}

type Role = 'staff' | 'tv' | 'customer';
interface Attachment {
  role: Role;
  token?: string;
}

const emptyState = (businessId: string): State => ({
  businessId,
  day: '',
  counter: 0,
  paused: false,
  entries: [],
  serving: {},
  lastCall: null
});

export class QueueRoom extends DurableObject<Env> {
  private state: State | null = null;
  private config: BusinessConfig | null = null;

  private async load(businessId: string): Promise<State> {
    if (!this.state) {
      this.state = (await this.ctx.storage.get<State>('state')) ?? emptyState(businessId);
      if (!this.state.businessId) this.state.businessId = businessId;
    }
    if (!this.config) this.config = await loadConfig(this.env.DB, this.state.businessId);
    return this.state;
  }

  private async save() {
    if (this.state) await this.ctx.storage.put('state', this.state);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const businessId = url.searchParams.get('b') ?? '';
    const st = await this.load(businessId);
    if (!this.config) return json({ error: 'Business not found' }, 404);

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected websocket', { status: 426 });
      const role = (url.searchParams.get('role') ?? 'customer') as Role;
      const token = url.searchParams.get('token') ?? undefined;
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server, [role]);
      server.serializeAttachment({ role, token } satisfies Attachment);
      server.send(JSON.stringify({ type: 'snapshot', data: this.snapshotFor({ role, token }) }));
      return new Response(null, { status: 101, webSocket: client });
    }

    const body = request.method === 'POST' ? ((await request.json().catch(() => ({}))) as Record<string, unknown>) : {};
    const action = url.pathname.slice(1);

    switch (action) {
      case 'reload': {
        this.config = await loadConfig(this.env.DB, st.businessId);
        // Drop serving pointers for stations that were removed.
        const ids = new Set(this.config?.stations.map((s) => s.id));
        for (const k of Object.keys(st.serving)) if (!ids.has(k)) delete st.serving[k];
        break;
      }
      case 'snapshot':
        return json(this.snapshotFor({ role: (body.role as Role) ?? 'customer', token: body.token as string | undefined }));
      case 'join': {
        const res = this.join(st, body, true);
        if ('error' in res) return json(res, 400);
        await this.commit();
        return json(res);
      }
      case 'add': {
        const res = this.join(st, body, false);
        if ('error' in res) return json(res, 400);
        await this.commit();
        return json(res);
      }
      case 'leave': {
        const e = st.entries.find((x) => x.token === body.token);
        if (e) await this.finish(st, e, 'left');
        break;
      }
      case 'late': {
        // "Running late – let one go ahead": swap with the next waiting person.
        const e = st.entries.find((x) => x.token === body.token);
        if (e && e.status === 'waiting') {
          const i = st.entries.indexOf(e);
          const j = st.entries.findIndex((x, k) => k > i && x.status === 'waiting');
          if (j > i) [st.entries[i], st.entries[j]] = [st.entries[j], st.entries[i]];
        }
        break;
      }
      case 'call-next': {
        const stationId = String(body.stationId ?? '');
        const station = this.config.stations.find((s) => s.id === stationId);
        if (!station) return json({ error: 'Unknown station' }, 400);
        const current = this.servingAt(st, stationId);
        if (current) await this.finish(st, current, 'served');
        const next = st.entries.find((x) => x.status === 'waiting' && (!body.entryId || x.id === body.entryId));
        if (next) {
          next.status = 'called';
          next.stationId = stationId;
          next.calledAt = Date.now();
          st.serving[stationId] = next.id;
          st.lastCall = { ticket: next.ticket, name: shortName(next.name), stationName: station.name, lang: next.lang, at: next.calledAt };
        }
        break;
      }
      case 'recall': {
        const current = this.servingAt(st, String(body.stationId ?? ''));
        const station = this.config.stations.find((s) => s.id === body.stationId);
        if (current && station) st.lastCall = { ticket: current.ticket, name: shortName(current.name), stationName: station.name, lang: current.lang, at: Date.now() };
        break;
      }
      case 'done': {
        const current = this.servingAt(st, String(body.stationId ?? ''));
        if (current) await this.finish(st, current, 'served');
        break;
      }
      case 'noshow': {
        const e = st.entries.find((x) => x.id === body.entryId);
        if (e) await this.finish(st, e, 'noshow');
        break;
      }
      case 'pause':
        st.paused = !!body.paused;
        break;
      default:
        return json({ error: 'Unknown action' }, 404);
    }
    await this.commit();
    return json({ ok: true });
  }

  private servingAt(st: State, stationId: string): Entry | undefined {
    const id = st.serving[stationId];
    return id ? st.entries.find((e) => e.id === id) : undefined;
  }

  private join(st: State, body: Record<string, unknown>, fromPhone: boolean): { error: string } | { id: string; token: string; ticket: string } {
    const cfg = this.config!;
    const waiting = st.entries.filter((e) => e.status === 'waiting').length;
    if (fromPhone && st.paused) return { error: 'The line is paused right now.' };
    if (fromPhone && waiting >= cfg.maxLen) return { error: 'The line is full for now. Please try again later.' };
    const name = String(body.name ?? '').trim().slice(0, 40);
    if (!name) return { error: 'Please enter your name.' };
    const serviceId = typeof body.serviceId === 'string' && cfg.services.some((s) => s.id === body.serviceId) ? body.serviceId : cfg.services[0]?.id ?? null;
    const lang = typeof body.lang === 'string' && cfg.languages.includes(body.lang) ? body.lang : cfg.languages[0] ?? 'en';

    const today = dayKey(Date.now(), cfg.timezone);
    if (st.day !== today) {
      st.day = today;
      st.counter = 0;
    }
    st.counter += 1;
    const entry: Entry = {
      id: randomId(8),
      ticket: `A-${String(st.counter).padStart(3, '0')}`,
      name,
      serviceId,
      lang,
      joinedAt: Date.now(),
      status: 'waiting',
      token: randomId(16),
      phone: fromPhone
    };
    st.entries.push(entry);
    return { id: entry.id, token: entry.token, ticket: entry.ticket };
  }

  private async finish(st: State, e: Entry, status: 'served' | 'left' | 'noshow') {
    st.entries = st.entries.filter((x) => x.id !== e.id);
    for (const [k, v] of Object.entries(st.serving)) if (v === e.id) st.serving[k] = null;
    try {
      await this.env.DB.prepare(
        `INSERT INTO visits (id, business_id, ticket, service_id, station_id, name, lang, joined_at, called_at, finished_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(e.id, st.businessId, e.ticket, e.serviceId, e.stationId ?? null, e.name, e.lang, e.joinedAt, e.calledAt ?? null, Date.now(), status)
        .run();
    } catch (err) {
      console.error('visit insert failed', err);
    }
  }

  private async commit() {
    await this.save();
    this.broadcast();
  }

  private broadcast() {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        const att = ws.deserializeAttachment() as Attachment;
        ws.send(JSON.stringify({ type: 'snapshot', data: this.snapshotFor(att) }));
      } catch {
        /* socket closing */
      }
    }
  }

  /** Estimated minutes until each waiting person is called. */
  private etas(st: State): Map<string, number> {
    const cfg = this.config!;
    const minutes = (id: string | null) => cfg.services.find((s) => s.id === id)?.minutes ?? cfg.services[0]?.minutes ?? 15;
    const stations = Math.max(1, cfg.stations.length);
    // Work still in progress at each station (assume half done on average).
    let busy = 0;
    for (const e of st.entries) if (e.status === 'called') busy += minutes(e.serviceId) / 2;
    const free = cfg.stations.filter((s) => !st.serving[s.id]).length;
    const out = new Map<string, number>();
    let acc = busy;
    let i = 0;
    for (const e of st.entries) {
      if (e.status !== 'waiting') continue;
      out.set(e.id, i < free ? 0 : Math.round(acc / stations));
      acc += minutes(e.serviceId);
      i++;
    }
    return out;
  }

  private snapshotFor(att: Attachment): Snapshot {
    const st = this.state!;
    const cfg = this.config!;
    const etas = this.etas(st);
    const waitingEntries = st.entries.filter((e) => e.status === 'waiting');
    const snap: Snapshot = {
      business: {
        name: cfg.name, slug: cfg.slug, address: cfg.address, color: cfg.color, layout: cfg.layout,
        languages: cfg.languages, greeting: cfg.greeting, voice: cfg.voice, headsUp: cfg.headsUp, holdMin: cfg.holdMin
      },
      services: cfg.services,
      stations: cfg.stations.map((s) => {
        const e = this.servingAt(st, s.id);
        return { id: s.id, name: s.name, staffName: s.staffName, current: e ? { ticket: e.ticket, name: shortName(e.name), since: e.calledAt ?? e.joinedAt } : null };
      }),
      waiting: waitingEntries.slice(0, 8).map((e) => ({ ticket: e.ticket, name: shortName(e.name), eta: etas.get(e.id) ?? 0 })),
      count: waitingEntries.length,
      waitMinutes: waitingEntries.length ? (etas.get(waitingEntries[waitingEntries.length - 1].id) ?? 0) + (cfg.services[0]?.minutes ?? 15) / Math.max(1, cfg.stations.length) : 0,
      paused: st.paused,
      full: waitingEntries.length >= cfg.maxLen,
      lastCall: st.lastCall
    };
    snap.waitMinutes = Math.round(snap.waitMinutes);
    if (att.role === 'staff') {
      snap.entries = st.entries.map(({ token: _t, ...rest }) => ({ ...rest, eta: etas.get(rest.id) ?? 0 }));
    }
    if (att.role === 'customer' && att.token) {
      const e = st.entries.find((x) => x.token === att.token);
      if (e) {
        snap.me = {
          id: e.id,
          ticket: e.ticket,
          name: e.name,
          status: e.status,
          position: e.status === 'waiting' ? waitingEntries.indexOf(e) : 0,
          eta: etas.get(e.id) ?? 0,
          stationName: e.stationId ? cfg.stations.find((s) => s.id === e.stationId)?.name : undefined,
          serviceId: e.serviceId,
          calledAt: e.calledAt
        };
      } else {
        snap.me = { id: '', ticket: '', name: '', status: 'gone', position: 0, eta: 0, serviceId: null };
      }
    }
    return snap;
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (message === 'ping') ws.send('pong');
  }

  async webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code, 'closing');
    } catch {
      /* already closed */
    }
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
