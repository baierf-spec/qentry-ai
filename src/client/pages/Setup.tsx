import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { LanguagePicker, ServicesEditor, StationsEditor, type EditService, type EditStation } from '../ConfigFields';

interface Draft {
  name: string;
  address: string;
  timezone: string;
  languages: string[];
  greeting: Record<string, string>;
  hours: Record<string, string>;
  services: EditService[];
  stations: EditStation[];
}

const guessTz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  } catch {
    return 'America/New_York';
  }
};

const emptyDraft = (): Draft => ({
  name: '',
  address: '',
  timezone: guessTz(),
  languages: ['en'],
  greeting: {},
  hours: {},
  services: [{ name: 'Service', minutes: 20 }],
  stations: [{ name: 'Station 1', staffName: '' }]
});

type Msg = { role: 'user' | 'assistant'; content: string };

export default function Setup() {
  const { me, refresh } = useSession();
  const nav = useNavigate();
  const ai = !!me?.aiEnabled;
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: 'Hi! What kind of business is it, and how many people serve customers at the same time?' }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, thinking]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;
    const next: Msg[] = [...msgs, { role: 'user', content: text }];
    setMsgs(next);
    setInput('');
    setThinking(true);
    setError('');
    try {
      // The API wants the conversation to start with the user, so drop our opening line.
      const res = await api<{ reply: string; done: boolean; config: Partial<Draft> }>('/ai/setup', { body: { messages: next.slice(1) } });
      setMsgs([...next, { role: 'assistant', content: res.reply }]);
      const c = res.config ?? {};
      setDraft((d) => ({
        ...d,
        name: c.name || d.name,
        address: c.address ?? d.address,
        timezone: c.timezone || d.timezone,
        languages: c.languages?.length ? [...new Set(['en', ...c.languages])].filter((l) => /^[a-z]{2}$/.test(l)) : d.languages,
        greeting: c.greeting ?? d.greeting,
        hours: c.hours ?? d.hours,
        services: c.services?.length ? c.services.map((s) => ({ name: s.name, minutes: Number(s.minutes) || 20 })) : d.services,
        stations: c.stations?.length ? c.stations.map((s) => ({ name: s.name, staffName: s.staffName ?? '' })) : d.stations
      }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setThinking(false);
    }
  }

  async function create() {
    if (!draft.name.trim()) return setError('Give your business a name first.');
    setSaving(true);
    setError('');
    try {
      await api('/business', {
        body: {
          ...draft,
          services: draft.services.filter((s) => s.name.trim()),
          stations: draft.stations.filter((s) => s.name.trim())
        }
      });
      await refresh();
      nav('/app/poster?welcome=1');
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="stack" style={{ minHeight: '100vh' }}>
      <header className="row between" style={{ padding: '20px 28px', gap: 12 }}>
        <Logo to="/" />
        <span className="eyebrow">Setup · about 2 minutes</span>
      </header>
      <div className="row" style={{ flex: 1, maxWidth: 1240, width: '100%', margin: '0 auto', padding: '8px 28px 28px', gap: 24, alignItems: 'flex-start' }}>
        {ai && (
          <section aria-label="Chat with the setup assistant" className="card stack gap-16" style={{ flex: '999 1 520px', minWidth: 0, minHeight: 600, padding: 28 }}>
            <div className="stack gap-8">
              <h1 className="display" style={{ fontSize: 40 }}>Tell me about your shop.</h1>
              <p className="muted">Use your own words. I’ll fill in everything on the right.</p>
            </div>
            <div ref={listRef} className="stack gap-12" style={{ flex: 1, overflowY: 'auto', maxHeight: 460, paddingRight: 4 }} aria-live="polite">
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className="rise"
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                    background: m.role === 'user' ? 'var(--cobalt)' : 'var(--paper)',
                    color: m.role === 'user' ? '#fff' : 'var(--ink)',
                    borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '13px 16px',
                    fontSize: 15,
                    lineHeight: 1.5
                  }}
                >
                  {m.content}
                </div>
              ))}
              {thinking && <div className="muted rise" style={{ fontSize: 14 }}>Setting things up…</div>}
            </div>
            {error && <p className="error">{error}</p>}
            <form onSubmit={send} className="row gap-8" style={{ flexWrap: 'nowrap' }}>
              <label className="sr-only" htmlFor="msg">Your message</label>
              <input id="msg" className="input" style={{ borderRadius: 999 }} placeholder="e.g. Barbershop on Main St, 2 barbers, haircuts 30 min" value={input} onChange={(e) => setInput(e.target.value)} autoFocus />
              <button className="btn btn-dark" aria-label="Send" disabled={thinking || !input.trim()} style={{ minWidth: 52, padding: 0 }}>
                →
              </button>
            </form>
          </section>
        )}

        <aside aria-label="Your line" className="stack gap-16" style={{ flex: ai ? '1 1 400px' : '1 1 640px', minWidth: 0, maxWidth: ai ? undefined : 720, margin: ai ? undefined : '0 auto' }}>
          {!ai && <h1 className="display" style={{ fontSize: 40 }}>Set up your line.</h1>}
          <div className="card stack gap-20">
            <label className="field">
              <span>Business name</span>
              <input className="input" value={draft.name} placeholder="Northside Barbers" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="field">
              <span>Address (optional)</span>
              <input className="input" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </label>
            <div className="field">
              <span>Services and how long they take</span>
              <ServicesEditor value={draft.services} onChange={(services) => setDraft({ ...draft, services })} />
            </div>
            <div className="field">
              <span>Stations (chairs, bays, windows)</span>
              <StationsEditor value={draft.stations} onChange={(stations) => setDraft({ ...draft, stations })} />
            </div>
            <div className="field">
              <span>Languages your customers speak</span>
              <LanguagePicker value={draft.languages} onChange={(languages) => setDraft({ ...draft, languages })} />
            </div>
          </div>
          {!ai && error && <p className="error">{error}</p>}
          <button className="btn btn-primary btn-lg btn-block" onClick={create} disabled={saving}>
            {saving ? 'Creating your line…' : 'Create my line'}
          </button>
        </aside>
      </div>
    </div>
  );
}
