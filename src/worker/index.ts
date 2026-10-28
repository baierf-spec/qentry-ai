import { Hono, type Context } from 'hono';
import type { Env, SessionUser } from './env';
import { currentUser, endSession, hashPassword, isAdmin, startSession, verifyPassword } from './auth';
import { businessIdBySlug, businessesForUser, createBusiness, loadConfig, roleFor, updateBusiness, type ConfigInput } from './business';
import { setupTurn, translate } from './ai';
import { clampText, dayKey, now, randomDigits, randomId } from './util';

export { QueueRoom } from './queue';

type App = { Bindings: Env; Variables: { user: SessionUser | null } };
type C = Context<App>;

const app = new Hono<App>().basePath('/api');

app.use('*', async (c, next) => {
  c.set('user', await currentUser(c));
  await next();
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Something went wrong. Please try again.' }, 500);
});

// ---------- helpers ----------

function room(env: Env, businessId: string) {
  return env.QUEUE.get(env.QUEUE.idFromName(businessId));
}

async function callRoom(env: Env, businessId: string, path: string, body?: unknown, init?: RequestInit) {
  return room(env, businessId).fetch(`https://room/${path}?b=${encodeURIComponent(businessId)}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init
  });
}

function requireUser(c: C): SessionUser | Response {
  const u = c.get('user');
  return u ?? c.json({ error: 'Please log in.' }, 401);
}

/** The business the signed-in user is working on (first one they belong to, or ?b=). */
async function currentBusiness(c: C): Promise<{ user: SessionUser; businessId: string; role: string } | Response> {
  const u = requireUser(c);
  if (u instanceof Response) return u;
  const wanted = c.req.query('b');
  const list = await businessesForUser(c.env.DB, u.id);
  const pick = wanted ? list.find((b) => b.id === wanted) : list[0];
  if (!pick) return c.json({ error: 'No business yet.', needsSetup: true }, 404);
  return { user: u, businessId: pick.id, role: pick.role };
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// ---------- auth ----------

app.post('/auth/signup', async (c) => {
  const body = await c.req.json<{ name?: string; email?: string; password?: string }>().catch(() => ({}) as Record<string, string>);
  const name = clampText(body.name, 60);
  const email = clampText(body.email, 120).toLowerCase();
  const password = String(body.password ?? '');
  if (!name) return c.json({ error: 'Please enter your name.' }, 400);
  if (!isEmail(email)) return c.json({ error: 'Please enter a valid email.' }, 400);
  if (password.length < 8) return c.json({ error: 'Password must be at least 8 characters.' }, 400);
  const exists = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (exists) return c.json({ error: 'An account with this email already exists. Try logging in.' }, 409);
  const { hash, salt } = await hashPassword(password);
  const id = randomId(10);
  await c.env.DB.prepare('INSERT INTO users (id, email, name, pw_hash, pw_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, email, name, hash, salt, now()).run();
  await startSession(c, id);
  return c.json({ ok: true });
});

app.post('/auth/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({}) as Record<string, string>);
  const email = clampText(body.email, 120).toLowerCase();
  const row = await c.env.DB.prepare('SELECT id, pw_hash, pw_salt FROM users WHERE email = ?').bind(email).first<{ id: string; pw_hash: string; pw_salt: string }>();
  if (!row || !(await verifyPassword(String(body.password ?? ''), row.pw_hash, row.pw_salt))) {
    return c.json({ error: 'Wrong email or password.' }, 401);
  }
  await startSession(c, row.id);
  return c.json({ ok: true });
});

app.post('/auth/logout', async (c) => {
  await endSession(c);
  return c.json({ ok: true });
});

app.get('/me', async (c) => {
  const u = c.get('user');
  if (!u) return c.json({ user: null });
  const businesses = await businessesForUser(c.env.DB, u.id);
  return c.json({ user: u, businesses, isAdmin: isAdmin(c.env, u), aiEnabled: !!c.env.ANTHROPIC_API_KEY });
});

// ---------- setup & settings ----------

app.post('/ai/setup', async (c) => {
  const u = requireUser(c);
  if (u instanceof Response) return u;
  if (!c.env.ANTHROPIC_API_KEY) return c.json({ error: 'AI is not configured on this server.' }, 503);
  const body = await c.req.json<{ messages?: { role: string; content: string }[] }>().catch(() => ({ messages: [] }));
  const messages = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, 1500) }));
  if (!messages.length || messages[0].role !== 'user') return c.json({ error: 'Say something first.' }, 400);
  try {
    return c.json(await setupTurn(c.env, messages));
  } catch (err) {
    console.error(err);
    return c.json({ error: 'The assistant is unavailable right now. You can fill in the form instead.' }, 502);
  }
});

/** Fill in translations for the greeting and service names. Best effort: never blocks saving. */
async function withTranslations(env: Env, input: ConfigInput, previous?: Awaited<ReturnType<typeof loadConfig>>): Promise<ConfigInput> {
  const languages = input.languages ?? previous?.languages ?? ['en'];
  const primary = languages[0];
  const others = languages.slice(1);
  if (!env.ANTHROPIC_API_KEY || !others.length) return input;
  const strings: Record<string, string> = {};
  const greeting = input.greeting?.[primary] ?? previous?.greeting[primary];
  if (greeting) strings.greeting = greeting;
  const services = input.services ?? previous?.services ?? [];
  services.forEach((s, i) => (strings[`s${i}`] = s.name));
  try {
    const t = await translate(env, strings, others);
    const out: ConfigInput = { ...input };
    const g: Record<string, string> = { ...(previous?.greeting ?? {}), ...(input.greeting ?? {}) };
    for (const l of others) if (t[l]?.greeting && !(input.greeting && input.greeting[l])) g[l] = t[l].greeting;
    out.greeting = g;
    out.services = services.map((s, i) => {
      const names: Record<string, string> = { ...(s.names ?? {}) };
      for (const l of others) if (t[l]?.[`s${i}`]) names[l] = t[l][`s${i}`];
      return { ...s, names };
    });
    return out;
  } catch (err) {
    console.error('translate failed', err);
    return input;
  }
}

app.post('/business', async (c) => {
  const u = requireUser(c);
  if (u instanceof Response) return u;
  const input = await c.req.json<ConfigInput>().catch(() => ({}) as ConfigInput);
  if (!clampText(input.name, 80)) return c.json({ error: 'Please give your business a name.' }, 400);
  const id = await createBusiness(c.env.DB, u.id, await withTranslations(c.env, input));
  const cfg = await loadConfig(c.env.DB, id);
  return c.json({ id, slug: cfg?.slug });
});

app.get('/business', async (c) => {
  const cur = await currentBusiness(c);
  if (cur instanceof Response) return cur;
  return c.json({ ...(await loadConfig(c.env.DB, cur.businessId)), role: cur.role });
});

app.put('/business', async (c) => {
  const cur = await currentBusiness(c);
  if (cur instanceof Response) return cur;
  if (cur.role !== 'owner') return c.json({ error: 'Only the owner can change settings.' }, 403);
  const input = await c.req.json<ConfigInput>().catch(() => ({}) as ConfigInput);
  const prev = await loadConfig(c.env.DB, cur.businessId);
  await updateBusiness(c.env.DB, cur.businessId, await withTranslations(c.env, input, prev));
  await callRoom(c.env, cur.businessId, 'reload', {});
  return c.json(await loadConfig(c.env.DB, cur.businessId));
});

// ---------- the line (staff) ----------

app.get('/line/ws', async (c) => {
  const cur = await currentBusiness(c);
  if (cur instanceof Response) return cur;
  return room(c.env, cur.businessId).fetch(`https://room/ws?b=${cur.businessId}&role=staff`, c.req.raw);
});

const STAFF_ACTIONS = new Set(['call-next', 'done', 'noshow', 'add', 'pause', 'recall']);
app.post('/line/:action', async (c) => {
  const cur = await currentBusiness(c);
  if (cur instanceof Response) return cur;
  const action = c.req.param('action');
  if (!STAFF_ACTIONS.has(action)) return c.json({ error: 'Unknown action' }, 404);
  const res = await callRoom(c.env, cur.businessId, action, await c.req.json().catch(() => ({})));
  return new Response(res.body, res);
});

// ---------- the line (customers, public) ----------

async function publicBusiness(c: C) {
  const id = await businessIdBySlug(c.env.DB, c.req.param('slug') ?? '');
  return id;
}

app.get('/q/:slug', async (c) => {
  const id = await publicBusiness(c);
  if (!id) return c.json({ error: 'This line does not exist.' }, 404);
  const res = await callRoom(c.env, id, 'snapshot', { role: 'customer', token: c.req.query('token') });
  return new Response(res.body, res);
});

app.get('/q/:slug/ws', async (c) => {
  const id = await publicBusiness(c);
  if (!id) return c.json({ error: 'This line does not exist.' }, 404);
  const token = encodeURIComponent(c.req.query('token') ?? '');
  return room(c.env, id).fetch(`https://room/ws?b=${id}&role=customer&token=${token}`, c.req.raw);
});

for (const action of ['join', 'leave', 'late'] as const) {
  app.post(`/q/:slug/${action}`, async (c) => {
    const id = await publicBusiness(c);
    if (!id) return c.json({ error: 'This line does not exist.' }, 404);
    const res = await callRoom(c.env, id, action, await c.req.json().catch(() => ({})));
    return new Response(res.body, res);
  });
}

// ---------- TV boards ----------

app.post('/tv/code', async (c) => {
  const token = randomId(20);
  let code = randomDigits(6);
  for (let i = 0; i < 5; i++) {
    const clash = await c.env.DB.prepare('SELECT id FROM tvs WHERE code = ? AND code_expires > ?').bind(code, now()).first();
    if (!clash) break;
    code = randomDigits(6);
  }
  await c.env.DB.prepare('INSERT INTO tvs (id, business_id, token, code, code_expires, created_at) VALUES (?, NULL, ?, ?, ?, ?)')
    .bind(randomId(8), token, code, now() + 10 * 60_000, now())
    .run();
  return c.json({ token, code, expiresAt: now() + 10 * 60_000 });
});

app.get('/tv/me', async (c) => {
  const token = c.req.query('token') ?? '';
  const tv = await c.env.DB.prepare(
    'SELECT t.id, t.code, t.code_expires, t.lang_mode, b.slug FROM tvs t LEFT JOIN businesses b ON b.id = t.business_id WHERE t.token = ?'
  )
    .bind(token)
    .first<{ id: string; code: string | null; code_expires: number | null; lang_mode: string; slug: string | null }>();
  if (!tv) return c.json({ paired: false, valid: false });
  if (tv.slug) {
    await c.env.DB.prepare('UPDATE tvs SET last_seen = ? WHERE id = ?').bind(now(), tv.id).run();
    return c.json({ paired: true, valid: true, slug: tv.slug, langMode: tv.lang_mode });
  }
  return c.json({ paired: false, valid: (tv.code_expires ?? 0) > now(), code: tv.code, expiresAt: tv.code_expires });
});

app.get('/tv/ws', async (c) => {
  const token = c.req.query('token') ?? '';
  const tv = await c.env.DB.prepare('SELECT id, business_id FROM tvs WHERE token = ? AND business_id IS NOT NULL').bind(token).first<{ id: string; business_id: string }>();
  if (!tv) return c.json({ error: 'Screen not paired.' }, 401);
  await c.env.DB.prepare('UPDATE tvs SET last_seen = ? WHERE id = ?').bind(now(), tv.id).run();
  return room(c.env, tv.business_id).fetch(`https://room/ws?b=${tv.business_id}&role=tv`, c.req.raw);
});

app.get('/tvs', async (c) => {
  const cur = await currentBusiness(c);
  if (cur instanceof Response) return cur;
  const rows = await c.env.DB.prepare('SELECT id, name, lang_mode, last_seen, created_at FROM tvs WHERE business_id = ? ORDER BY created_at').bind(cur.businessId).all();
  return c.json({ tvs: rows.results });
});

app.post('/tvs/pair', async (c) => {
  const cur = await currentBusiness(c);
  if (cur instanceof Response) return cur;
  const body = await c.req.json<{ code?: string; name?: string; langMode?: string }>().catch(() => ({}) as Record<string, string>);
  const code = String(body.code ?? '').replace(/\D/g, '');
  const tv = await c.env.DB.prepare('SELECT id FROM tvs WHERE code = ? AND code_expires > ? AND business_id IS NULL').bind(code, now()).first<{ id: string }>();
  if (!tv) return c.json({ error: 'That code is not valid. Check the TV and try again.' }, 400);
  await c.env.DB.prepare('UPDATE tvs SET business_id = ?, code = NULL, code_expires = NULL, name = ?, lang_mode = ? WHERE id = ?')
    .bind(cur.businessId, clampText(body.name, 40) || 'TV', body.langMode === 'primary' ? 'primary' : 'rotate', tv.id)
    .run();
  return c.json({ ok: true });
});

app.delete('/tvs/:id', async (c) => {
  const cur = await currentBusiness(c);
  if (cur instanceof Response) return cur;
  await c.env.DB.prepare('DELETE FROM tvs WHERE id = ? AND business_id = ?').bind(c.req.param('id'), cur.businessId).run();
  return c.json({ ok: true });
});

// ---------- insights ----------

app.get('/insights', async (c) => {
  const cur = await currentBusiness(c);
  if (cur instanceof Response) return cur;
  const cfg = await loadConfig(c.env.DB, cur.businessId);
  if (!cfg) return c.json({ error: 'Not found' }, 404);
  const range = c.req.query('range') ?? '30d';
  const days = range === 'today' ? 1 : range === '7d' ? 7 : 30;
  const since = range === 'today' ? startOfDay(cfg.timezone) : now() - days * 86_400_000;
  const rows = await c.env.DB.prepare('SELECT station_id, joined_at, called_at, finished_at, status FROM visits WHERE business_id = ? AND joined_at >= ?')
    .bind(cur.businessId, since)
    .all<{ station_id: string | null; joined_at: number; called_at: number | null; finished_at: number; status: string }>();
  const v = rows.results;
  const served = v.filter((r) => r.status === 'served');
  const waits = served.filter((r) => r.called_at).map((r) => (r.called_at! - r.joined_at) / 60_000);
  const avg = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
  const pct = (n: number) => (v.length ? Math.round((n / v.length) * 100) : 0);
  const hourFmt = new Intl.DateTimeFormat('en-US', { timeZone: cfg.timezone, hour: 'numeric', hour12: false });
  const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: cfg.timezone, weekday: 'short' });
  const byHour: Record<number, number[]> = {};
  const byDay: Record<string, number> = {};
  for (const r of served) {
    const h = Number(hourFmt.format(r.joined_at)) % 24;
    (byHour[h] ??= []).push(r.called_at ? (r.called_at - r.joined_at) / 60_000 : 0);
  }
  for (const r of v) {
    const d = dayFmt.format(r.joined_at);
    byDay[d] = (byDay[d] ?? 0) + 1;
  }
  const stations = cfg.stations.map((s) => {
    const mine = served.filter((r) => r.station_id === s.id);
    return {
      name: s.name,
      staffName: s.staffName,
      served: mine.length,
      avgService: avg(mine.filter((r) => r.called_at).map((r) => (r.finished_at - r.called_at!) / 60_000)),
      noshow: v.filter((r) => r.station_id === s.id && r.status === 'noshow').length
    };
  });
  const peakHour = Object.entries(byHour).sort((a, b) => avg(b[1]) - avg(a[1]))[0];
  return c.json({
    range,
    served: served.length,
    avgWait: avg(waits),
    leftPct: pct(v.filter((r) => r.status === 'left').length),
    noshowPct: pct(v.filter((r) => r.status === 'noshow').length),
    byHour: Object.fromEntries(Object.entries(byHour).map(([h, a]) => [h, avg(a)])),
    byDay,
    stations,
    tip: peakHour && avg(peakHour[1]) >= 20 ? `Around ${fmtHour(Number(peakHour[0]))}, waits average ${avg(peakHour[1])} minutes. That is the hour where an extra pair of hands would help most.` : null
  });
});

function startOfDay(tz: string) {
  const today = dayKey(now(), tz);
  // Search back up to 26h for the first timestamp that falls on "today" in tz (DST-safe enough for stats).
  let t = now();
  while (dayKey(t - 15 * 60_000, tz) === today) t -= 15 * 60_000;
  return t;
}
const fmtHour = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

// ---------- platform admin ----------

app.get('/admin/overview', async (c) => {
  const u = c.get('user');
  if (!isAdmin(c.env, u)) return c.json({ error: 'Not allowed' }, 403);
  const since = now() - 30 * 86_400_000;
  const [users, plans, visits, signups, list] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>(),
    c.env.DB.prepare('SELECT plan, COUNT(*) AS n FROM businesses GROUP BY plan').all<{ plan: string; n: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM visits WHERE joined_at >= ?').bind(since).first<{ n: number }>(),
    c.env.DB.prepare('SELECT created_at FROM businesses WHERE created_at >= ?').bind(since).all<{ created_at: number }>(),
    c.env.DB.prepare(
      `SELECT b.id, b.name, b.slug, b.plan, b.created_at, u.email,
         (SELECT COUNT(*) FROM visits v WHERE v.business_id = b.id AND v.joined_at >= ?) AS tickets,
         (SELECT MAX(joined_at) FROM visits v WHERE v.business_id = b.id) AS last_active
       FROM businesses b JOIN users u ON u.id = b.owner_id ORDER BY b.created_at DESC LIMIT 200`
    )
      .bind(since)
      .all()
  ]);
  const signupsByDay: Record<string, number> = {};
  for (const r of signups.results) {
    const d = new Date(r.created_at).toISOString().slice(0, 10);
    signupsByDay[d] = (signupsByDay[d] ?? 0) + 1;
  }
  const planCounts = Object.fromEntries(plans.results.map((p) => [p.plan, p.n]));
  return c.json({
    users: users?.n ?? 0,
    plans: planCounts,
    mrr: (planCounts.pro ?? 0) * 19,
    tickets30d: visits?.n ?? 0,
    signupsByDay,
    businesses: list.results
  });
});

app.all('*', (c) => c.json({ error: 'Not found' }, 404));

export default {
  fetch: app.fetch,
  /** Hourly: wipe customer names after 24h, clear expired sessions and stale pairing codes. */
  async scheduled(_event: ScheduledController, env: Env) {
    const dayAgo = now() - 86_400_000;
    await env.DB.batch([
      env.DB.prepare('UPDATE visits SET name = NULL WHERE joined_at < ? AND name IS NOT NULL').bind(dayAgo),
      env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now()),
      env.DB.prepare('DELETE FROM tvs WHERE business_id IS NULL AND created_at < ?').bind(dayAgo)
    ]);
  }
} satisfies ExportedHandler<Env>;
