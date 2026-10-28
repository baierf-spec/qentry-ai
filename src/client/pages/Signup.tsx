import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { AuthLayout } from './Login';

export default function Signup() {
  const nav = useNavigate();
  const { refresh } = useSession();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!agree) return setError('Please accept the terms to continue.');
    setError('');
    setBusy(true);
    try {
      await api('/auth/signup', { body: f });
      await refresh();
      nav('/setup');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      side={
        <div className="stack" style={{ flex: '1 1 480px', minWidth: 0, background: 'var(--cobalt)', color: '#fff', padding: 48, justifyContent: 'center', gap: 32, minHeight: 420 }}>
          <h2 className="display" style={{ fontSize: 44, maxWidth: 440 }}>What happens next</h2>
          <ol className="stack" style={{ margin: 0, padding: 0, listStyle: 'none', maxWidth: 460 }}>
            {['Tell the assistant about your shop in one sentence.', 'Print your QR poster and open the board on a TV.', 'Call your first customer. That’s it.'].map((s, i) => (
              <li key={s} className="row gap-16" style={{ padding: '18px 0', borderTop: '1px solid rgba(255,255,255,.3)', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <b className="mono" style={{ color: 'var(--yellow)' }}>0{i + 1}</b>
                <span style={{ fontSize: 17, lineHeight: 1.5 }}>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      }
    >
      <form onSubmit={submit} className="stack gap-16">
        <div className="stack gap-8" style={{ marginBottom: 6 }}>
          <span className="eyebrow" style={{ color: 'var(--cobalt)' }}>Step 1 of 2 · Account</span>
          <h1 className="display" style={{ fontSize: 48 }}>Create your line.</h1>
          <p className="muted">Free for one location. No card needed.</p>
        </div>
        <label className="field">
          <span>Your name</span>
          <input className="input" autoComplete="name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </label>
        <label className="field">
          <span>Work email</span>
          <input className="input" type="email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="input" type="password" autoComplete="new-password" minLength={8} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <span className="hint">At least 8 characters.</span>
        </label>
        <label className="row gap-8" style={{ fontSize: 14, color: 'var(--muted)', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 20, height: 20, margin: 0, accentColor: 'var(--cobalt)', flex: 'none' }} />
          I agree to the Terms and Privacy Policy.
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Continue — set up my line'}
        </button>
        <p className="muted" style={{ textAlign: 'center', fontSize: 15 }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--ink)', fontWeight: 600 }}>Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
