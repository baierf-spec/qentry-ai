import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Flap, Logo } from '../components';
import { api } from '../lib/api';
import { useSession } from '../lib/session';

export function AuthLayout({ children, side }: { children: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="row" style={{ minHeight: '100vh', alignItems: 'stretch' }}>
      <div className="stack" style={{ flex: '1 1 520px', minWidth: 0, padding: '32px 40px', gap: 32 }}>
        <Logo />
        <div style={{ width: '100%', maxWidth: 420, margin: 'auto' }}>{children}</div>
      </div>
      {side}
    </div>
  );
}

export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { refresh } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/auth/login', { body: { email, password } });
      await refresh();
      nav(params.get('next') || '/app');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      side={
        <div className="stack" style={{ flex: '1 1 480px', minWidth: 0, background: 'var(--ink)', color: '#fff', padding: 48, justifyContent: 'center', gap: 28, minHeight: 420 }}>
          <span className="eyebrow" style={{ color: 'var(--muted-dark)' }}>Now serving</span>
          <div style={{ maxWidth: 420 }}>
            <Flap value="YOU" height={128} size={88} gap={10} />
          </div>
          <p className="display" style={{ fontSize: 44, maxWidth: 460 }}>Your line, minus the standing.</p>
        </div>
      }
    >
      <form onSubmit={submit} className="stack gap-16">
        <div className="stack gap-8" style={{ marginBottom: 8 }}>
          <h1 className="display" style={{ fontSize: 48 }}>Welcome back.</h1>
          <p className="muted">Log in to run today’s line.</p>
        </div>
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <p className="muted" style={{ textAlign: 'center', fontSize: 15 }}>
          New to Qentry? <Link to="/signup" style={{ color: 'var(--ink)', fontWeight: 600 }}>Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
