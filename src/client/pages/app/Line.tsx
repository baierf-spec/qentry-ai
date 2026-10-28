import { useEffect, useState, type FormEvent } from 'react';
import { Shell, Spinner } from '../../components';
import { api, minutes, since, useLive } from '../../lib/api';
import { useSession } from '../../lib/session';

export default function Line() {
  const { me } = useSession();
  const { snap, connected } = useLive('/line/ws');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [walkIn, setWalkIn] = useState({ open: false, name: '', serviceId: '' });
  const [, tick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => tick((x) => x + 1), 30_000);
    return () => clearInterval(iv);
  }, []);

  async function act(action: string, body: Record<string, unknown> = {}, key = action) {
    setBusy(key);
    setError('');
    try {
      await api(`/line/${action}`, { body });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function addWalkIn(e: FormEvent) {
    e.preventDefault();
    await act('add', { name: walkIn.name || 'Walk-in', serviceId: walkIn.serviceId || undefined });
    setWalkIn({ open: false, name: '', serviceId: '' });
  }

  if (!snap) return <Shell><Spinner /></Shell>;
  const waiting = (snap.entries ?? []).filter((e) => e.status === 'waiting');
  const serviceName = (id: string | null) => snap.services.find((s) => s.id === id)?.name ?? '—';
  const slug = me?.businesses?.[0]?.slug;

  return (
    <Shell>
      <div className="row between gap-16" style={{ alignItems: 'flex-end' }}>
        <div className="stack gap-8">
          <span className="row gap-8 mono" style={{ fontSize: 12, letterSpacing: '.1em', color: snap.paused ? 'var(--red)' : 'var(--green)' }}>
            {connected ? <span className="dot-live" style={{ background: snap.paused ? 'var(--red)' : undefined }} /> : <span className="muted">● RECONNECTING</span>}
            {snap.paused ? 'PAUSED' : 'OPEN'} · {snap.count} WAITING · ~{snap.waitMinutes} MIN
          </span>
          <h1 className="page-title">Today’s line</h1>
        </div>
        <div className="row gap-8">
          {slug && (
            <a className="btn btn-ghost" href={`/q/${slug}`} target="_blank" rel="noreferrer">
              Customer page ↗
            </a>
          )}
          <button className="btn btn-ghost" onClick={() => act('pause', { paused: !snap.paused })} disabled={busy === 'pause'}>
            {snap.paused ? 'Resume line' : 'Pause line'}
          </button>
          <button className="btn btn-dark" onClick={() => setWalkIn({ ...walkIn, open: !walkIn.open })}>
            + Add walk-in
          </button>
        </div>
      </div>

      {walkIn.open && (
        <form onSubmit={addWalkIn} className="card row gap-12 rise" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '1 1 220px' }}>
            <span>Name</span>
            <input className="input" autoFocus value={walkIn.name} placeholder="Walk-in" onChange={(e) => setWalkIn({ ...walkIn, name: e.target.value })} />
          </label>
          <label className="field" style={{ flex: '1 1 200px' }}>
            <span>Service</span>
            <select className="input" value={walkIn.serviceId} onChange={(e) => setWalkIn({ ...walkIn, serviceId: e.target.value })}>
              {snap.services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" disabled={busy === 'add'}>Add to line</button>
        </form>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <div className="grid-auto" style={{ ['--min' as string]: '320px', ['--gap' as string]: '16px' }}>
        {snap.stations.map((st) => (
          <div key={st.id} className="card-dark stack gap-16">
            <div className="row between mono" style={{ fontSize: 12, letterSpacing: '.1em', color: 'var(--muted-dark)' }}>
              <span>{st.name.toUpperCase()}</span>
              <span>{st.staffName.toUpperCase()}</span>
            </div>
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <div className="stack gap-4">
                <span key={st.current?.ticket} className="mono rise" style={{ fontWeight: 700, fontSize: 56, lineHeight: 1, color: st.current ? 'var(--yellow)' : '#55534D' }}>
                  {st.current?.ticket ?? '— —'}
                </span>
                <span style={{ fontSize: 16, color: '#D8D5CC' }}>{st.current?.name ?? 'Free'}</span>
              </div>
              {st.current && <span className="mono" style={{ fontSize: 13, color: 'var(--muted-dark)' }}>{since(st.current.since)}</span>}
            </div>
            <div className="grid-auto" style={{ ['--min' as string]: '100px', ['--gap' as string]: '10px' }}>
              <button className="btn" style={{ background: 'var(--ink-2)', border: '1px solid #3A3934', color: '#fff' }} disabled={!st.current || !!busy} onClick={() => act('recall', { stationId: st.id }, `recall-${st.id}`)}>
                Call again
              </button>
              <button className="btn" style={{ background: 'var(--ink-2)', border: '1px solid #3A3934', color: '#fff' }} disabled={!st.current || !!busy} onClick={() => act('done', { stationId: st.id }, `done-${st.id}`)}>
                Done
              </button>
              <button className="btn btn-primary" disabled={!waiting.length || !!busy} onClick={() => act('call-next', { stationId: st.id }, `next-${st.id}`)}>
                {busy === `next-${st.id}` ? 'Calling…' : 'Call next'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="row between" style={{ padding: '18px 22px', gap: 8 }}>
          <h2 className="display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Waiting</h2>
          <span className="muted" style={{ fontSize: 13 }}>Customer names are deleted after 24 hours</span>
        </div>
        {waiting.length === 0 ? (
          <p className="muted" style={{ padding: '4px 22px 24px' }}>Nobody is waiting. Customers join by scanning your QR code.</p>
        ) : (
          <div className="scroll-x">
            <table className="tbl" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>TICKET</th><th>NAME</th><th>SERVICE</th><th>WAITING</th><th>EST.</th><th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {waiting.map((e) => (
                  <tr key={e.id} className="rise">
                    <td className="mono" style={{ fontWeight: 700 }}>{e.ticket}</td>
                    <td style={{ fontWeight: 500 }}>
                      {e.name} {!e.phone && <span className="muted" style={{ fontSize: 12 }}>· no phone</span>}
                    </td>
                    <td className="muted">{serviceName(e.serviceId)}</td>
                    <td className="mono muted" style={{ fontSize: 14 }}>{since(e.joinedAt)}</td>
                    <td className="mono muted" style={{ fontSize: 14 }}>{minutes(e.eta)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost" style={{ minHeight: 38, padding: '6px 14px', fontSize: 14 }} disabled={!!busy} onClick={() => act('noshow', { entryId: e.id }, `ns-${e.id}`)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
