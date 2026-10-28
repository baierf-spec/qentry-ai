import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useSession } from './lib/session';

export function Logo({ to = '/', light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className="logo" aria-label="Qentry home">
      <span className="logo-mark" style={light ? { background: 'var(--yellow)', color: 'var(--ink)' } : undefined}>Q·01</span>
      <span className="logo-word">qentry</span>
    </Link>
  );
}

/** Split-flap style characters that flip when the value changes. */
export function Flap({ value, height = 96, size = 64, gap = 8, color, tile }: { value: string; height?: number; size?: number; gap?: number; color?: string; tile?: string }) {
  const [key, setKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setKey((k) => k + 1);
    }
  }, [value]);
  return (
    <div
      key={key}
      className={`flap ${key ? 'flip' : ''}`}
      aria-label={value}
      style={{ ['--flap-h' as string]: `${height}px`, ['--flap-size' as string]: `${size}px`, ['--flap-gap' as string]: `${gap}px`, ['--flap-color' as string]: color, ['--flap-tile' as string]: tile }}
    >
      {value.split('').map((ch, i) => (
        <span key={i} aria-hidden="true">
          {ch}
        </span>
      ))}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="center-page">
      <div className="spinner" role="status" aria-label="Loading" />
    </div>
  );
}

/** Gate for signed-in owner pages. Sends people without a business to /setup. */
export function RequireAuth({ children, needBusiness = true }: { children: ReactNode; needBusiness?: boolean }) {
  const { me } = useSession();
  const loc = useLocation();
  if (!me) return <Spinner />;
  if (!me.user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (needBusiness && !me.businesses?.length) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

const NAV = [
  ['/app', 'Line'],
  ['/app/insights', 'Insights'],
  ['/app/tv', 'TV boards'],
  ['/app/poster', 'QR poster'],
  ['/app/settings', 'Settings'],
  ['/app/billing', 'Billing']
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { me } = useSession();
  const biz = me?.businesses?.[0];
  return (
    <div className="shell">
      <aside className="side">
        <div className="row between">
          <Logo to="/app" />
        </div>
        <nav aria-label="Panel">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/app'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {label}
            </NavLink>
          ))}
          {me?.isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')}>
              Admin
            </NavLink>
          )}
        </nav>
        <div className="side-extra card stack gap-4" style={{ marginTop: 'auto', padding: 14, borderRadius: 16 }}>
          <span className="eyebrow" style={{ fontSize: 11 }}>
            Location
          </span>
          <b style={{ fontWeight: 600 }}>{biz?.name}</b>
          {biz && (
            <a href={`/q/${biz.slug}`} target="_blank" rel="noreferrer" className="muted" style={{ fontSize: 13 }}>
              qentry.ai/q/{biz.slug}
            </a>
          )}
          <button
            className="btn btn-soft"
            style={{ minHeight: 36, padding: '6px 12px', fontSize: 13, marginTop: 8 }}
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              location.href = '/';
            }}
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className="switch" onClick={() => onChange(!on)} />;
}

/** Deterministic QR code rendered as an <img> data URL. */
export function QrImage({ text, size = 240, dark = '#121212', light = '#FFFFFF' }: { text: string; size?: number; dark?: string; light?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    import('qrcode').then((QR) =>
      QR.toDataURL(text, { margin: 1, width: size * 2, color: { dark, light }, errorCorrectionLevel: 'M' }).then((url) => alive && setSrc(url))
    );
    return () => {
      alive = false;
    };
  }, [text, size, dark, light]);
  return src ? <img src={src} width={size} height={size} alt={`QR code for ${text}`} style={{ width: size, height: size, maxWidth: '100%' }} /> : <div style={{ width: size, height: size }} />;
}
