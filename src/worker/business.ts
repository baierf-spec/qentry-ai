import type { BusinessConfig, Service, Station } from '../shared/types';
import { clampText, randomId, slugify } from './util';

interface BusinessRow {
  id: string;
  slug: string;
  name: string;
  address: string;
  timezone: string;
  color: string;
  layout: string;
  languages: string;
  greeting: string;
  hours: string;
  heads_up: number;
  hold_min: number;
  max_len: number;
  voice: number;
  plan: string;
}

function parse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export async function loadConfig(db: D1Database, businessId: string): Promise<BusinessConfig | null> {
  const b = await db.prepare('SELECT * FROM businesses WHERE id = ?').bind(businessId).first<BusinessRow>();
  if (!b) return null;
  const [services, stations] = await Promise.all([
    db.prepare('SELECT id, name, names, minutes FROM services WHERE business_id = ? ORDER BY sort').bind(businessId).all<{ id: string; name: string; names: string; minutes: number }>(),
    db.prepare('SELECT id, name, staff_name FROM stations WHERE business_id = ? ORDER BY sort').bind(businessId).all<{ id: string; name: string; staff_name: string }>()
  ]);
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    address: b.address,
    timezone: b.timezone,
    color: b.color,
    layout: (['split', 'big', 'list'].includes(b.layout) ? b.layout : 'split') as BusinessConfig['layout'],
    languages: parse<string[]>(b.languages, ['en']),
    greeting: parse<Record<string, string>>(b.greeting, {}),
    hours: parse(b.hours, {}),
    headsUp: b.heads_up,
    holdMin: b.hold_min,
    maxLen: b.max_len,
    voice: !!b.voice,
    plan: b.plan,
    services: services.results.map((s) => ({ id: s.id, name: s.name, names: parse(s.names, {}), minutes: s.minutes })),
    stations: stations.results.map((s) => ({ id: s.id, name: s.name, staffName: s.staff_name }))
  };
}

export async function businessIdBySlug(db: D1Database, slug: string): Promise<string | null> {
  const row = await db.prepare('SELECT id FROM businesses WHERE slug = ?').bind(slug).first<{ id: string }>();
  return row?.id ?? null;
}

/** Businesses this user can run (owner or staff). */
export async function businessesForUser(db: D1Database, userId: string) {
  const rows = await db
    .prepare(
      `SELECT b.id, b.name, b.slug, m.role FROM members m JOIN businesses b ON b.id = m.business_id
       WHERE m.user_id = ? ORDER BY b.created_at`
    )
    .bind(userId)
    .all<{ id: string; name: string; slug: string; role: string }>();
  return rows.results;
}

export async function roleFor(db: D1Database, userId: string, businessId: string): Promise<string | null> {
  const row = await db.prepare('SELECT role FROM members WHERE user_id = ? AND business_id = ?').bind(userId, businessId).first<{ role: string }>();
  return row?.role ?? null;
}

async function uniqueSlug(db: D1Database, name: string, exceptId?: string): Promise<string> {
  const base = slugify(name);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const row = await db.prepare('SELECT id FROM businesses WHERE slug = ?').bind(candidate).first<{ id: string }>();
    if (!row || row.id === exceptId) return candidate;
  }
  return `${base}-${randomId(3)}`;
}

/** Input from the setup chat or the settings page. Everything is validated here. */
export interface ConfigInput {
  name?: string;
  address?: string;
  timezone?: string;
  color?: string;
  layout?: string;
  languages?: string[];
  greeting?: Record<string, string>;
  hours?: Record<string, string>;
  headsUp?: number;
  holdMin?: number;
  maxLen?: number;
  voice?: boolean;
  services?: { id?: string; name: string; names?: Record<string, string>; minutes: number }[];
  stations?: { id?: string; name: string; staffName?: string }[];
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const LANG = /^[a-z]{2}$/;

function cleanInput(input: ConfigInput) {
  const languages = Array.isArray(input.languages)
    ? [...new Set(input.languages.map((l) => String(l).toLowerCase()).filter((l) => LANG.test(l)))].slice(0, 8)
    : undefined;
  const services = Array.isArray(input.services)
    ? input.services
        .filter((s) => s && clampText(s.name, 60))
        .slice(0, 30)
        .map((s) => ({
          id: typeof s.id === 'string' && /^[a-z0-9]{4,40}$/i.test(s.id) ? s.id : randomId(8),
          name: clampText(s.name, 60),
          names: Object.fromEntries(Object.entries(s.names ?? {}).filter(([k]) => LANG.test(k)).map(([k, v]) => [k, clampText(v, 60)])),
          minutes: Math.min(480, Math.max(1, Math.round(Number(s.minutes) || 20)))
        }))
    : undefined;
  const stations = Array.isArray(input.stations)
    ? input.stations
        .filter((s) => s && clampText(s.name, 40))
        .slice(0, 30)
        .map((s) => ({
          id: typeof s.id === 'string' && /^[a-z0-9]{4,40}$/i.test(s.id) ? s.id : randomId(8),
          name: clampText(s.name, 40),
          staffName: clampText(s.staffName, 40)
        }))
    : undefined;
  return {
    name: input.name !== undefined ? clampText(input.name, 80) : undefined,
    address: input.address !== undefined ? clampText(input.address, 120) : undefined,
    timezone: input.timezone && isTimeZone(input.timezone) ? input.timezone : undefined,
    color: input.color && HEX.test(input.color) ? input.color.toUpperCase() : undefined,
    layout: input.layout && ['split', 'big', 'list'].includes(input.layout) ? input.layout : undefined,
    languages: languages && languages.length ? languages : undefined,
    greeting: input.greeting
      ? Object.fromEntries(Object.entries(input.greeting).filter(([k]) => LANG.test(k)).map(([k, v]) => [k, clampText(v, 400)]))
      : undefined,
    hours: input.hours
      ? Object.fromEntries(Object.entries(input.hours).filter(([k]) => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(k)).map(([k, v]) => [k, clampText(v, 30)]))
      : undefined,
    headsUp: input.headsUp !== undefined ? Math.min(10, Math.max(1, Math.round(Number(input.headsUp) || 2))) : undefined,
    holdMin: input.holdMin !== undefined ? Math.min(30, Math.max(1, Math.round(Number(input.holdMin) || 3))) : undefined,
    maxLen: input.maxLen !== undefined ? Math.min(500, Math.max(1, Math.round(Number(input.maxLen) || 30))) : undefined,
    voice: input.voice !== undefined ? !!input.voice : undefined,
    services,
    stations
  };
}

function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function createBusiness(db: D1Database, ownerId: string, input: ConfigInput): Promise<string> {
  const c = cleanInput(input);
  const id = randomId(10);
  const name = c.name || 'My business';
  const slug = await uniqueSlug(db, name);
  const stmts = [
    db
      .prepare(
        `INSERT INTO businesses (id, owner_id, name, slug, address, timezone, color, layout, languages, greeting, hours,
         heads_up, hold_min, max_len, voice, plan, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'free', ?)`
      )
      .bind(
        id, ownerId, name, slug, c.address ?? '', c.timezone ?? 'America/New_York', c.color ?? '#FFD23F', c.layout ?? 'split',
        JSON.stringify(c.languages ?? ['en']), JSON.stringify(c.greeting ?? {}), JSON.stringify(c.hours ?? {}),
        c.headsUp ?? 2, c.holdMin ?? 3, c.maxLen ?? 30, c.voice === false ? 0 : 1, Date.now()
      ),
    db.prepare(`INSERT INTO members (business_id, user_id, role) VALUES (?, ?, 'owner')`).bind(id, ownerId)
  ];
  const services: Service[] = (c.services?.length ? c.services : [{ id: randomId(8), name: 'Service', names: {}, minutes: 20 }]) as Service[];
  const stations: Station[] = (c.stations?.length ? c.stations : [{ id: randomId(8), name: 'Station 1', staffName: '' }]) as Station[];
  services.forEach((s, i) => stmts.push(db.prepare('INSERT INTO services (id, business_id, name, names, minutes, sort) VALUES (?, ?, ?, ?, ?, ?)').bind(randomId(8), id, s.name, JSON.stringify(s.names ?? {}), s.minutes, i)));
  stations.forEach((s, i) => stmts.push(db.prepare('INSERT INTO stations (id, business_id, name, staff_name, sort) VALUES (?, ?, ?, ?, ?)').bind(randomId(8), id, s.name, s.staffName ?? '', i)));
  await db.batch(stmts);
  return id;
}

export async function updateBusiness(db: D1Database, businessId: string, input: ConfigInput): Promise<void> {
  const c = cleanInput(input);
  const sets: string[] = [];
  const vals: unknown[] = [];
  const put = (col: string, v: unknown) => {
    sets.push(`${col} = ?`);
    vals.push(v);
  };
  if (c.name) {
    put('name', c.name);
  }
  if (c.address !== undefined) put('address', c.address);
  if (c.timezone) put('timezone', c.timezone);
  if (c.color) put('color', c.color);
  if (c.layout) put('layout', c.layout);
  if (c.languages) put('languages', JSON.stringify(c.languages));
  if (c.greeting) put('greeting', JSON.stringify(c.greeting));
  if (c.hours) put('hours', JSON.stringify(c.hours));
  if (c.headsUp !== undefined) put('heads_up', c.headsUp);
  if (c.holdMin !== undefined) put('hold_min', c.holdMin);
  if (c.maxLen !== undefined) put('max_len', c.maxLen);
  if (c.voice !== undefined) put('voice', c.voice ? 1 : 0);

  const stmts: D1PreparedStatement[] = [];
  if (sets.length) stmts.push(db.prepare(`UPDATE businesses SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, businessId));
  if (c.services) {
    stmts.push(db.prepare('DELETE FROM services WHERE business_id = ?').bind(businessId));
    c.services.forEach((s, i) =>
      stmts.push(db.prepare('INSERT INTO services (id, business_id, name, names, minutes, sort) VALUES (?, ?, ?, ?, ?, ?)').bind(s.id, businessId, s.name, JSON.stringify(s.names), s.minutes, i))
    );
  }
  if (c.stations) {
    stmts.push(db.prepare('DELETE FROM stations WHERE business_id = ?').bind(businessId));
    c.stations.forEach((s, i) =>
      stmts.push(db.prepare('INSERT INTO stations (id, business_id, name, staff_name, sort) VALUES (?, ?, ?, ?, ?)').bind(s.id, businessId, s.name, s.staffName, i))
    );
  }
  if (stmts.length) await db.batch(stmts);
}
