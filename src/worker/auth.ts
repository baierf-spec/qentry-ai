import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Env, SessionUser } from './env';
import { now, randomId, sha256, toHex } from './util';

const COOKIE = 'qs';
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000; // Workers' WebCrypto maximum

export async function hashPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const salt: Uint8Array<ArrayBuffer> = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS }, key, 256);
  return { hash: toHex(bits), salt: toHex(salt.buffer as ArrayBuffer) };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const { hash: candidate } = await hashPassword(password, salt);
  if (candidate.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= candidate.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

type Ctx = Context<{ Bindings: Env; Variables: { user: SessionUser | null } }>;

export async function startSession(c: Ctx, userId: string) {
  const token = randomId(24);
  const expires = now() + SESSION_DAYS * 86_400_000;
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256(token), userId, expires)
    .run();
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_DAYS * 86_400
  });
}

export async function endSession(c: Ctx) {
  const token = getCookie(c, COOKIE);
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256(token)).run();
  deleteCookie(c, COOKIE, { path: '/' });
}

export async function currentUser(c: Ctx): Promise<SessionUser | null> {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  const row = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`
  )
    .bind(await sha256(token), now())
    .first<SessionUser>();
  return row ?? null;
}

export function isAdmin(env: Env, user: SessionUser | null): boolean {
  if (!user) return false;
  return env.ADMIN_EMAILS.split(',').map((s) => s.trim().toLowerCase()).includes(user.email.toLowerCase());
}
