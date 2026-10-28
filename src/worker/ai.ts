import type { Env } from './env';

const API = 'https://api.anthropic.com/v1/messages';

async function claude(env: Env, system: string, messages: { role: 'user' | 'assistant'; content: string }[], maxTokens = 1200): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) throw new Error('AI is not configured');
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({ model: env.AI_MODEL || 'claude-haiku-5-5', max_tokens: maxTokens, system, messages })
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  return data.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

function extractJson<T>(text: string): T {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('AI returned no JSON');
  return JSON.parse(text.slice(start, end + 1)) as T;
}

const SETUP_SYSTEM = `You are the setup assistant for Qentry, a virtual walk-in line (customers scan a QR code, wait anywhere, get called on their phone and on a TV).
Your job: in a short, friendly chat, learn enough about the user's business to configure their line. Ask at most one short question per turn.
You need: business name, type, address (optional), services with typical durations in minutes, how many people serve customers at once (stations, e.g. "Chair 1", "Bay 2", "Window 1") and their names (optional), opening hours (optional), and which languages their customers speak besides English.
Infer sensible defaults instead of asking when you can (e.g. a barbershop's stations are chairs). Never ask more than 4 questions in total; after that, finish with defaults.

ALWAYS reply with a single JSON object and nothing else:
{
  "reply": "your short message to the user (max 2 sentences)",
  "done": true | false,
  "config": {
    "name": string, "address": string, "timezone": IANA tz guess or "America/New_York",
    "languages": ["en", ...two-letter codes],
    "greeting": { "en": "one welcoming sentence for the join page" },
    "hours": { "mon": "10-19", ... "sun": "closed" },
    "services": [{ "name": string, "minutes": number }],
    "stations": [{ "name": string, "staffName": string }]
  }
}
Always include your best current "config", even when not done. Set "done": true once you have name, services and stations.`;

export interface SetupConfig {
  name?: string;
  address?: string;
  timezone?: string;
  languages?: string[];
  greeting?: Record<string, string>;
  hours?: Record<string, string>;
  services?: { name: string; minutes: number }[];
  stations?: { name: string; staffName?: string }[];
}

export async function setupTurn(env: Env, messages: { role: 'user' | 'assistant'; content: string }[]) {
  const text = await claude(env, SETUP_SYSTEM, messages.slice(-16));
  return extractJson<{ reply: string; done: boolean; config: SetupConfig }>(text);
}

/** Translate short UI strings from English (or the primary language) into each target language. */
export async function translate(env: Env, strings: Record<string, string>, targets: string[]): Promise<Record<string, Record<string, string>>> {
  if (!targets.length || !Object.keys(strings).length) return {};
  const system = `Translate the values of the JSON object into each target language. Keep them short, natural and friendly, suitable for signs and a phone screen at a local business. Keep names of people and brands unchanged.
Reply with only JSON in the shape {"<lang>": {"<key>": "<translation>"}} for every target language.`;
  const text = await claude(env, system, [{ role: 'user', content: JSON.stringify({ targets, strings }) }], 2000);
  return extractJson(text);
}
