import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Logo, Spinner } from '../components';
import { api } from '../lib/api';
import { useSession } from '../lib/session';

interface Overview {
  users: number;
  plans: Record<string, number>;
  mrr: number;
  tickets30d: number;
  signupsByDay: Record<string, number>;
  businesses: { id: string; name: string; slug: string; plan: string; created_at: number; email: string; tickets: number; last_active: number | null }[];
}

export default function Admin() {
  const { me } = useSession();
  const [data, setData] = useState<Overview | null>(null);
  const [q, setQ] = useState('');
  const [plan, setPlan] = useState('all');
  useEffect(() => {
    if (me?.isAdmin) api<Overview>('/admin/overview').then(setData);
  }, [me?.isAdmin]);

  const days = useMemo(() => {
    const out: { d: string; n: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      out.push({ d, n: data?.signupsByDay[d] ?? 0 });
    }
    return out;
  }, [data]);

  if (me && !me.isAdmin) return <Navigate to="/app" replace />;
  if (!data) return <div style={{ background: 'var(--ink)', minHeight: '100vh' }}><Spinner /></div>;
  const maxDay = Math.max(1, ...days.map((x) => x.n));
  const rows = data.businesses.filter((b) => (plan === 'all' || b.plan === plan) && (`${b.name} ${b.email} ${b.slug}`.toLowerCase().includes(q.toLowerCase())));
  const total = Object.values(data.plans).reduce((a, b) => a + b, 0);

  return (
    <div style={{ background: 'var(--ink)', color: '#fff', minHeight: '100vh' }}>
      <div className="stack gap-20" style={{ maxWidth: 1300, margin: '0 auto', padding: '28px 32px 64px' }}>
        <div className="row between gap-16">
          <span className="row gap-12" style={{ color: '#fff' }}>
            <Logo to="/app" light />
            <span className="mono" style={{ fontSize: 12, letterSpacing: '.1em', color: 'var(--muted-dark)' }}>ADMIN</span>
          </span>
          <a href="/app" className="btn btn-white">Back to my line</a>
        </div>
        <h1 className="page-title">Overview</h1>
        <div className="grid-auto" style={{ ['--min' as string]: '190px', ['--gap' as string]: '12px' }}>
          {[
            ['MRR (est.)', `$${data.mrr.toLocaleString()}`, true],
            ['Businesses', String(total), false],
            ['Pro', String(data.plans.pro ?? 0), false],
            ['Users', String(data.users), false],
            ['Tickets · 30 days', data.tickets30d.toLocaleString(), false]
          ].map(([label, v, hi]) => (
            <div key={label as string} className="stack gap-4" style={{ background: hi ? 'var(--yellow)' : 'var(--ink-2)', color: hi ? 'var(--ink)' : '#fff', borderRadius: 20, padding: 20 }}>
              <span style={{ fontSize: 14, opacity: 0.8 }}>{label}</span>
              <span className="mono" style={{ fontWeight: 700, fontSize: 34 }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="stack gap-12" style={{ background: 'var(--ink-2)', borderRadius: 22, padding: 22 }}>
          <h2 className="display" style={{ fontSize: 22, fontWeight: 700 }}>New businesses · last 30 days</h2>
          <div className="row" style={{ height: 140, alignItems: 'flex-end', gap: 6, flexWrap: 'nowrap' }}>
            {days.map((x) => (
              <span key={x.d} title={`${x.d}: ${x.n}`} style={{ flex: 1, height: Math.max(3, (x.n / maxDay) * 130), background: x.n ? 'var(--yellow)' : 'var(--ink-3)', borderRadius: '4px 4px 2px 2px' }} />
            ))}
          </div>
        </div>
        <div style={{ background: 'var(--ink-2)', borderRadius: 22, overflow: 'hidden' }}>
          <div className="row between gap-12" style={{ padding: '18px 22px' }}>
            <h2 className="display" style={{ fontSize: 22, fontWeight: 700 }}>Businesses</h2>
            <div className="row gap-8">
              <label className="sr-only" htmlFor="q">Search</label>
              <input id="q" className="input" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} style={{ minHeight: 42, width: 240, background: 'var(--ink)', color: '#fff', borderColor: '#3A3934', borderRadius: 999 }} />
              {['all', 'free', 'pro'].map((p) => (
                <button key={p} className="btn" onClick={() => setPlan(p)} aria-pressed={plan === p} style={{ minHeight: 40, padding: '6px 14px', background: plan === p ? '#fff' : 'transparent', color: plan === p ? 'var(--ink)' : '#fff' }}>
                  {p[0].toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="scroll-x">
            <table className="tbl" style={{ minWidth: 760, color: '#fff' }}>
              <thead><tr><th>BUSINESS</th><th>OWNER</th><th>PLAN</th><th>TICKETS · 30D</th><th>LAST ACTIVE</th><th>CREATED</th></tr></thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} style={{ borderColor: 'var(--ink-3)' }}>
                    <td style={{ borderColor: 'var(--ink-3)' }}><b style={{ fontWeight: 600 }}>{b.name}</b><br /><a href={`/q/${b.slug}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--muted-dark)' }}>/q/{b.slug}</a></td>
                    <td style={{ borderColor: 'var(--ink-3)', color: '#D8D5CC' }}>{b.email}</td>
                    <td style={{ borderColor: 'var(--ink-3)' }}><span className="mono" style={{ fontSize: 12, fontWeight: 700, padding: '5px 9px', borderRadius: 6, background: b.plan === 'pro' ? 'var(--yellow)' : 'var(--ink-3)', color: b.plan === 'pro' ? 'var(--ink)' : '#fff' }}>{b.plan.toUpperCase()}</span></td>
                    <td className="mono" style={{ borderColor: 'var(--ink-3)' }}>{b.tickets}</td>
                    <td style={{ borderColor: 'var(--ink-3)', color: '#D8D5CC' }}>{b.last_active ? new Date(b.last_active).toLocaleString() : '—'}</td>
                    <td style={{ borderColor: 'var(--ink-3)', color: '#D8D5CC' }}>{new Date(b.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
