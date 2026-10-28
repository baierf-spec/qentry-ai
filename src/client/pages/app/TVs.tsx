import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Shell } from '../../components';
import { api } from '../../lib/api';

interface Tv {
  id: string;
  name: string;
  lang_mode: string;
  last_seen: number | null;
}

export default function TVs() {
  const [tvs, setTvs] = useState<Tv[]>([]);
  const [form, setForm] = useState({ code: '', name: 'Front TV', langMode: 'rotate' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api<{ tvs: Tv[] }>('/tvs').then((r) => setTvs(r.tvs)), []);
  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [load]);

  async function pair(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/tvs/pair', { body: form });
      setForm({ ...form, code: '' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const online = (t: Tv) => !!t.last_seen && Date.now() - t.last_seen < 2 * 60_000;

  return (
    <Shell>
      <div className="stack gap-8">
        <h1 className="page-title">TV boards</h1>
        <p className="muted">Any screen with a browser can show your line — a smart TV, a Fire TV stick or an old tablet.</p>
      </div>
      <div className="row gap-16" style={{ alignItems: 'flex-start' }}>
        <div className="stack gap-12" style={{ flex: '2 1 440px', minWidth: 0 }}>
          {tvs.length === 0 && <div className="card muted">No screens yet. Pair your first TV on the right.</div>}
          {tvs.map((t) => (
            <div key={t.id} className="card row gap-16">
              <div aria-hidden style={{ width: 150, height: 86, flex: 'none', background: 'var(--ink)', borderRadius: 10, padding: 8, display: 'flex', gap: 5 }}>
                <span className="mono" style={{ flex: 2, background: 'var(--ink-2)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--yellow)' }}>A-001</span>
                <span style={{ flex: 1, background: 'var(--ink-2)', borderRadius: 4 }} />
              </div>
              <div className="stack gap-4" style={{ flex: '1 1 200px' }}>
                <b style={{ fontWeight: 600, fontSize: 17 }}>{t.name}</b>
                <span className="muted" style={{ fontSize: 14 }}>{t.lang_mode === 'rotate' ? 'Rotates your languages' : 'Primary language only'}</span>
                <span className="mono" style={{ fontSize: 12, letterSpacing: '.06em', color: online(t) ? 'var(--green)' : 'var(--red)' }}>● {online(t) ? 'Online now' : t.last_seen ? `Last seen ${new Date(t.last_seen).toLocaleString()}` : 'Not connected yet'}</span>
              </div>
              <button className="btn btn-ghost" onClick={async () => { await api(`/tvs/${t.id}`, { method: 'DELETE' }); load(); }}>Unpair</button>
            </div>
          ))}
        </div>

        <form onSubmit={pair} className="card-dark stack gap-16" style={{ flex: '1 1 320px', minWidth: 0 }}>
          <h2 className="display" style={{ fontSize: 24, fontWeight: 700 }}>Pair a new screen</h2>
          <ol className="stack gap-8" style={{ margin: 0, paddingInlineStart: 20, color: '#D8D5CC', lineHeight: 1.5 }}>
            <li>On the TV, open <b className="mono" style={{ color: 'var(--yellow)' }}>{location.host}/tv</b></li>
            <li>Type the 6-digit code it shows</li>
          </ol>
          <label className="field">
            <span>Pairing code</span>
            <input className="input mono" inputMode="numeric" autoComplete="off" maxLength={7} required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.replace(/[^\d ]/g, '') })} placeholder="482 913" style={{ background: 'var(--ink-2)', border: 0, color: 'var(--yellow)', fontSize: 28, fontWeight: 700, letterSpacing: '.2em', textAlign: 'center' }} />
          </label>
          <label className="field">
            <span>Screen name</span>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ background: 'var(--ink-2)', border: 0, color: '#fff' }} />
          </label>
          <label className="field">
            <span>Languages on screen</span>
            <select className="input" value={form.langMode} onChange={(e) => setForm({ ...form, langMode: e.target.value })} style={{ background: 'var(--ink-2)', border: 0, color: '#fff' }}>
              <option value="rotate">Rotate all my languages</option>
              <option value="primary">Primary language only</option>
            </select>
          </label>
          {error && <p style={{ color: '#FFB39A' }} role="alert">{error}</p>}
          <button className="btn btn-yellow btn-lg" disabled={busy || form.code.replace(/\D/g, '').length !== 6}>{busy ? 'Pairing…' : 'Pair screen'}</button>
        </form>
      </div>
    </Shell>
  );
}
