# Qentry.ai

A virtual walk-in line. Customers scan a QR code at the door, watch their place in line on their phone, and get called by name on the shop's TV.

## What's inside

| Part | Where | Notes |
|---|---|---|
| Landing page | `/` | Animated hero and feature cards |
| Sign up / log in | `/signup`, `/login` | Email + password, PBKDF2 hashes, HTTP-only session cookie |
| AI setup | `/setup` | Chat with Claude to configure the line (falls back to a plain form without an API key) |
| Staff panel | `/app` | Live line, "Call next" per station, walk-ins, pause, remove |
| Insights | `/app/insights` | Served, wait times, walk-outs, no-shows, busy hours, per-station stats |
| TV boards | `/app/tv` + `/tv` | Pair any screen with a 6-digit code, voice calling via the browser's speech engine |
| QR poster | `/app/poster` | 3 templates, print / save as PDF |
| Settings | `/app/settings` | Business, hours, services, stations, languages (auto-translated), color, line rules |
| Billing | `/app/billing` | Plan display (card payments not wired up yet) |
| Customer page | `/q/:slug` | Join, live ticket, alerts (vibrate + sound + notification), "running late", leave, 12 languages |
| Platform admin | `/admin` | MRR estimate, businesses, signups. Access via `ADMIN_EMAILS` |

### Architecture

- **One Cloudflare Worker** (`src/worker`) serves the API (Hono) and the React app (static assets, SPA fallback).
- **Durable Object `QueueRoom`** – one per business. Holds the live line and pushes snapshots over WebSockets (hibernation API) to the staff panel, the TVs and every customer's phone.
- **D1** – users, sessions, businesses, services, stations, TVs, finished visits (for insights).
- **Cron (hourly)** – wipes customer names after 24 hours, clears expired sessions and stale pairing codes.
- **Claude API** (optional) – setup chat and translations of the greeting and service names.

## Run locally

```bash
npm install
npm run db:migrate:local
npm run dev            # builds the app and starts wrangler dev on http://localhost:8787
```

Optional: put `ANTHROPIC_API_KEY=sk-ant-...` in a `.dev.vars` file to enable the AI setup chat.

## Deploy to Cloudflare

```bash
npx wrangler login
npx wrangler d1 create qentry          # copy the database_id into wrangler.jsonc
npm run db:migrate:remote
npx wrangler secret put ANTHROPIC_API_KEY   # optional, for the AI setup chat
npm run deploy
```

Then attach the domain: Cloudflare dashboard → Workers & Pages → `qentry` → Settings → Domains & Routes → add `qentry.ai` as a Custom Domain.

## Not built yet

- Card payments (Stripe) – Billing shows the plan; upgrades by email for now.
- Push notifications when the phone's browser is fully closed (Web Push / Telegram). Alerts work while the ticket page is open or in a background tab.
- Inviting staff accounts – staff can log in with the owner's account for now.
- Password reset by email.
