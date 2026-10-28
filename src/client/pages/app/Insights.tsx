import { useEffect, useState } from 'react';
import { Shell, Spinner } from '../../components';
import { api } from '../../lib/api';

interface Data {
  served: number;
  avgWait: number;
  leftPct: number;
  noshowPct: number;
  byHour: Record<string, number>;
  byDay: Record<string, number>;
  stations: { name: string; staffName: string; served: number; avgService: number; noshow: number }[];
  tip: string | null;
}

const RANGES = [
  ['today', 'Today'],
  ['7d', '7 days'],
  ['30d', '30 days']
] as const;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;

export default function Insights() {
  const [range, setRange] = useState<string>('30d');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setData(null);
    api<Data>(`/insights?range=${range}`).then(setData).catch((e) => setError(e.message));
  }, [range]);

  const hours = data ? Object.keys(data.byHour).map(Number).sort((a, b) => a - b) : [];
  const maxH = Math.max(1, ...Object.values(data?.byHour ?? {}));
  const maxD = Math.max(1, ...Object.values(data?.byDay ?? {}));

  return (
    <Shell>
      <div className="row between gap-16" style={{ alignItems: 'flex-end' }}>
        <h1 className="page-title">Insights</h1>
        <div role="group" aria-label="Date range" className="row" style={{ background: '#fff', borderRadius: 999, padding: 4, gap: 2 }}>
          {RANGES.map(([id, label]) => (
            <button key={id} className="btn" style={{ minHeight: 40, padding: '8px 16px', background: range === id ? 'var(--ink)' : 'transparent', color: range === id ? '#fff' : 'var(--ink)' }} onClick={() => setRange(id)} aria-pressed={range === id}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {!data ? (
        <Spinner />
      ) : (
        <>
          {data.tip && (
            <div className="row gap-16 rise" style={{ background: 'var(--yellow)', borderRadius: 22, padding: '24px 26px' }}>
              <span className="mono" style={{ background: 'var(--ink)', color: 'var(--yellow)', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', padding: '8px 10px', borderRadius: 6 }}>TIP</span>
              <p className="display" style={{ flex: '1 1 420px', fontSize: 24, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' }}>{data.tip}</p>
            </div>
          )}
          <div className="grid-auto" style={{ ['--min' as string]: '200px' }}>
            {[
              ['Customers served', String(data.served)],
              ['Average wait', `${data.avgWait} min`],
              ['Left before their turn', `${data.leftPct}%`],
              ['No-shows when called', `${data.noshowPct}%`]
            ].map(([label, v]) => (
              <div key={label} className="card stack gap-4" style={{ padding: 20, borderRadius: 20 }}>
                <span className="muted" style={{ fontSize: 14 }}>{label}</span>
                <span className="mono" style={{ fontWeight: 700, fontSize: 36 }}>{v}</span>
              </div>
            ))}
          </div>
          {data.served === 0 ? (
            <div className="card muted">No finished visits in this period yet. Insights fill in as you call customers.</div>
          ) : (
            <div className="row gap-16" style={{ alignItems: 'stretch' }}>
              <div className="card stack gap-16" style={{ flex: '2 1 480px', minWidth: 0 }}>
                <h2 className="display" style={{ fontSize: 22, fontWeight: 700 }}>Average wait by hour</h2>
                <div className="row" style={{ height: 220, alignItems: 'flex-end', gap: 10, flexWrap: 'nowrap', borderBottom: '1px solid var(--line)' }}>
                  {hours.map((h) => {
                    const v = data.byHour[h];
                    return (
                      <div key={h} className="stack" style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                        <span className="mono muted" style={{ fontSize: 12 }}>{v}m</span>
                        <span style={{ width: '100%', height: Math.max(4, Math.round((v / maxH) * 170)), borderRadius: '8px 8px 3px 3px', background: v === maxH ? 'var(--cobalt)' : '#CFCBBF' }} />
                      </div>
                    );
                  })}
                </div>
                <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                  {hours.map((h) => (
                    <span key={h} className="mono muted" style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>{fmtHour(h)}</span>
                  ))}
                </div>
              </div>
              <div className="card stack gap-12" style={{ flex: '1 1 300px', minWidth: 0 }}>
                <h2 className="display" style={{ fontSize: 22, fontWeight: 700 }}>Visits by day</h2>
                {DAYS.map((d) => {
                  const v = data.byDay[d] ?? 0;
                  return (
                    <div key={d} className="row gap-12" style={{ flexWrap: 'nowrap' }}>
                      <span className="mono" style={{ width: 36, fontSize: 13 }}>{d}</span>
                      <span style={{ flex: 1, height: 14, background: 'var(--paper)', borderRadius: 999, overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: `${(v / maxD) * 100}%`, background: v === maxD ? 'var(--cobalt)' : 'var(--ink)', borderRadius: 999 }} />
                      </span>
                      <span className="mono muted" style={{ width: 34, textAlign: 'right', fontSize: 13 }}>{v}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <h2 className="display" style={{ fontSize: 22, fontWeight: 700, padding: '18px 22px' }}>By station</h2>
            <div className="scroll-x">
              <table className="tbl" style={{ minWidth: 520 }}>
                <thead>
                  <tr><th>STATION</th><th>SERVED</th><th>AVG. SERVICE</th><th>NO-SHOWS</th></tr>
                </thead>
                <tbody>
                  {data.stations.map((s) => (
                    <tr key={s.name}>
                      <td style={{ fontWeight: 600 }}>{s.name}{s.staffName ? ` · ${s.staffName}` : ''}</td>
                      <td className="mono">{s.served}</td>
                      <td className="mono">{s.avgService} min</td>
                      <td className="mono">{s.noshow}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
