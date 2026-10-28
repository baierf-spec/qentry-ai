import { useEffect, useState } from 'react';
import type { BusinessConfig } from '../../../shared/types';
import { Shell, Spinner, Toggle } from '../../components';
import { LanguagePicker, ServicesEditor, StationsEditor } from '../../ConfigFields';
import { api } from '../../lib/api';
import { langLabel } from '../../lib/i18n';
import { useSession } from '../../lib/session';

const COLORS = [
  ['Signal yellow', '#FFD23F'],
  ['Mint', '#3DDC97'],
  ['Coral', '#FF8A5C'],
  ['Sky', '#7CC4FF'],
  ['White', '#FFFFFF']
];
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const TZS = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Vilnius'];

type Cfg = BusinessConfig & { role: string };

export default function Settings() {
  const { refresh } = useSession();
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<Cfg>('/business').then(setCfg).catch((e) => setError(e.message));
  }, []);

  if (!cfg) return <Shell>{error ? <p className="error">{error}</p> : <Spinner />}</Shell>;
  const set = (patch: Partial<Cfg>) => {
    setCfg({ ...cfg, ...patch });
    setMsg('');
  };
  const primary = cfg.languages[0] ?? 'en';

  async function saveAll() {
    if (!cfg) return;
    setSaving(true);
    setError('');
    try {
      const next = await api<BusinessConfig>('/business', { method: 'PUT', body: cfg });
      setCfg({ ...cfg, ...next });
      setMsg('Saved. Every screen updates right away.');
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const owner = cfg.role === 'owner';
  return (
    <Shell>
      <div className="row between gap-16" style={{ alignItems: 'flex-end' }}>
        <h1 className="page-title">Settings</h1>
        <button className="btn btn-primary" onClick={saveAll} disabled={saving || !owner}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>
      {!owner && <p className="notice">Only the owner can change settings.</p>}
      {msg && <p className="notice rise" role="status" style={{ color: 'var(--green)' }}>{msg}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <section className="card stack gap-16" style={{ maxWidth: 960 }}>
        <h2 className="display" style={{ fontSize: 24, fontWeight: 700 }}>Business</h2>
        <div className="grid-auto">
          <label className="field"><span>Business name</span><input className="input" value={cfg.name} onChange={(e) => set({ name: e.target.value })} /></label>
          <label className="field"><span>Address</span><input className="input" value={cfg.address} onChange={(e) => set({ address: e.target.value })} /></label>
          <label className="field">
            <span>Time zone</span>
            <select className="input" value={cfg.timezone} onChange={(e) => set({ timezone: e.target.value })}>
              {[...new Set([cfg.timezone, ...TZS])].map((tz) => <option key={tz}>{tz}</option>)}
            </select>
          </label>
        </div>
        <div className="field">
          <span>Opening hours</span>
          <div className="grid-auto" style={{ ['--min' as string]: '120px', ['--gap' as string]: '8px' }}>
            {DAYS.map((d) => (
              <label key={d} className="stack gap-4" style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>
                {d}
                <input className="input mono" style={{ minHeight: 42, fontSize: 14 }} placeholder="10-19" value={cfg.hours[d] ?? ''} onChange={(e) => set({ hours: { ...cfg.hours, [d]: e.target.value } })} />
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="card stack gap-12" style={{ maxWidth: 960 }}>
        <h2 className="display" style={{ fontSize: 24, fontWeight: 700 }}>Services</h2>
        <p className="muted" style={{ fontSize: 14 }}>Durations power the wait-time estimate shown to customers.</p>
        <ServicesEditor value={cfg.services} onChange={(services) => set({ services: services.map((s) => ({ id: s.id ?? '', names: s.names ?? {}, name: s.name, minutes: s.minutes })) })} />
      </section>

      <section className="card stack gap-12" style={{ maxWidth: 960 }}>
        <h2 className="display" style={{ fontSize: 24, fontWeight: 700 }}>Stations</h2>
        <p className="muted" style={{ fontSize: 14 }}>Each station gets its own “Call next” button. Name them the way customers will hear them: “Chair 2”, “Bay 1”, “Window 3”.</p>
        <StationsEditor value={cfg.stations} onChange={(stations) => set({ stations: stations.map((s) => ({ id: s.id ?? '', name: s.name, staffName: s.staffName ?? '' })) })} />
      </section>

      <section className="card stack gap-16" style={{ maxWidth: 960 }}>
        <h2 className="display" style={{ fontSize: 24, fontWeight: 700 }}>Languages &amp; greeting</h2>
        <div className="field"><span>Languages shown to customers</span><LanguagePicker value={cfg.languages} onChange={(languages) => set({ languages })} /></div>
        <label className="field">
          <span>Greeting on the join page · {langLabel(primary)}</span>
          <textarea className="input" rows={3} maxLength={400} value={cfg.greeting[primary] ?? ''} onChange={(e) => set({ greeting: { ...cfg.greeting, [primary]: e.target.value } })} placeholder="Welcome! Join the line and we’ll ping you when your chair is almost ready." />
          <span className="hint">Other languages are translated automatically when you save.</span>
        </label>
        {cfg.languages.slice(1).map((l) =>
          cfg.greeting[l] ? (
            <label key={l} className="field">
              <span>{langLabel(l)} <span className="mono" style={{ fontSize: 11, background: '#E3E7FE', color: '#1A2FB8', padding: '3px 7px', borderRadius: 6, marginInlineStart: 6 }}>TRANSLATED</span></span>
              <textarea className="input" rows={2} maxLength={400} value={cfg.greeting[l]} onChange={(e) => set({ greeting: { ...cfg.greeting, [l]: e.target.value } })} />
            </label>
          ) : null
        )}
      </section>

      <section className="card stack gap-16" style={{ maxWidth: 960 }}>
        <h2 className="display" style={{ fontSize: 24, fontWeight: 700 }}>Look</h2>
        <div className="row gap-24" style={{ alignItems: 'flex-start' }}>
          <div className="stack gap-16" style={{ flex: '1 1 300px' }}>
            <fieldset className="stack gap-8" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="label" style={{ marginBottom: 8 }}>Accent color</legend>
              <div className="row gap-8">
                {COLORS.map(([name, hex]) => (
                  <button key={hex} type="button" aria-label={name} aria-pressed={cfg.color === hex} onClick={() => set({ color: hex })} style={{ width: 44, height: 44, borderRadius: 999, cursor: 'pointer', background: hex, border: cfg.color === hex ? '3px solid var(--ink)' : '1px solid #CFCBBF' }} />
                ))}
              </div>
            </fieldset>
          </div>
          <div className="card-dark stack gap-12" style={{ flex: '1 1 280px', padding: 18 }}>
            <span className="mono" style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--muted-dark)' }}>PREVIEW · NOW SERVING</span>
            <span className="mono" style={{ fontWeight: 700, fontSize: 56, lineHeight: 1, color: cfg.color }}>A-023</span>
            <span style={{ background: cfg.color, color: 'var(--ink)', borderRadius: 10, padding: '10px 12px', fontWeight: 600, fontSize: 14 }}>John, please come to {cfg.stations[0]?.name ?? 'Station 1'}</span>
          </div>
        </div>
      </section>

      <section className="card stack" style={{ maxWidth: 960 }}>
        <h2 className="display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Line rules</h2>
        {[
          ['Heads-up alert', 'Ping customers when this many people are ahead of them', 'headsUp', 1, 10],
          ['Hold a called spot for (minutes)', 'Shown to the customer when they are called', 'holdMin', 1, 30],
          ['Maximum line length', 'New customers see “The line is full for now”', 'maxLen', 1, 500]
        ].map(([title, desc, key, min, max]) => (
          <div key={key as string} className="row between gap-12" style={{ padding: '14px 0', borderTop: '1px solid var(--line-soft)' }}>
            <span className="stack gap-4"><b style={{ fontWeight: 600 }}>{title}</b><span className="muted" style={{ fontSize: 14 }}>{desc}</span></span>
            <input
              className="input mono"
              aria-label={title as string}
              type="number"
              min={min as number}
              max={max as number}
              style={{ width: 96, textAlign: 'center' }}
              value={cfg[key as 'headsUp'] as number}
              onChange={(e) => set({ [key as string]: Number(e.target.value) } as Partial<Cfg>)}
            />
          </div>
        ))}
        <div className="row between gap-12" style={{ padding: '14px 0', borderTop: '1px solid var(--line-soft)' }}>
          <span className="stack gap-4"><b style={{ fontWeight: 600 }}>Voice calling on TV</b><span className="muted" style={{ fontSize: 14 }}>The TV reads each call out loud in the customer’s language</span></span>
          <Toggle on={cfg.voice} onChange={(voice) => set({ voice })} label="Voice calling on TV" />
        </div>
      </section>

      <section className="card stack gap-12" style={{ maxWidth: 960 }}>
        <h2 className="display" style={{ fontSize: 24, fontWeight: 700 }}>Privacy</h2>
        <div className="row between gap-12" style={{ background: 'var(--paper)', borderRadius: 14, padding: 16 }}>
          <span className="stack gap-4"><b style={{ fontWeight: 600 }}>Customer names are deleted after 24 hours</b><span className="muted" style={{ fontSize: 14 }}>Always on. Insights keep only anonymous counts.</span></span>
          <span className="mono" style={{ fontSize: 12, letterSpacing: '.08em', color: 'var(--green)' }}>ALWAYS ON</span>
        </div>
      </section>

      <div style={{ maxWidth: 960 }}>
        <button className="btn btn-primary btn-lg" onClick={saveAll} disabled={saving || !owner}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </Shell>
  );
}
