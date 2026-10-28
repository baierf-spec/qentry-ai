import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { BusinessConfig } from '../../../shared/types';
import { QrImage, Shell, Spinner } from '../../components';
import { api } from '../../lib/api';
import { t } from '../../lib/i18n';

const THEMES = {
  bold: { name: 'Bold', bg: '#FFD23F', fg: '#121212', qrBg: '#FFFFFF' },
  minimal: { name: 'Minimal', bg: '#FFFFFF', fg: '#121212', qrBg: '#F3F1EA' },
  night: { name: 'Night', bg: '#121212', fg: '#FFFFFF', qrBg: '#FFFFFF' }
};
type Theme = keyof typeof THEMES;

export default function Poster() {
  const [params] = useSearchParams();
  const [cfg, setCfg] = useState<BusinessConfig | null>(null);
  const [theme, setTheme] = useState<Theme>('bold');
  const [headline, setHeadline] = useState('Skip the line.');
  useEffect(() => {
    api<BusinessConfig>('/business').then(setCfg);
  }, []);
  if (!cfg) return <Shell><Spinner /></Shell>;

  const th = THEMES[theme];
  const url = `${location.origin}/q/${cfg.slug}`;
  const second = cfg.languages.find((l) => l !== cfg.languages[0]);

  return (
    <Shell>
      <style>{`@media print { @page { size: letter; margin: 0 } .shell > .side, .poster-controls { display: none !important } .main { padding: 0 !important } .poster-stage { background: none !important; padding: 0 !important } .poster { width: 100vw !important; height: 100vh !important; max-width: none !important; border-radius: 0 !important; box-shadow: none !important } }`}</style>
      {params.get('welcome') && (
        <div className="rise" style={{ background: 'var(--yellow)', borderRadius: 22, padding: '20px 24px' }}>
          <b className="display" style={{ fontSize: 26, fontWeight: 700 }}>Your line is live.</b>
          <p style={{ marginTop: 6 }}>Print this poster, put it by the door, and open the <a href="/app">Line</a> page to start calling customers.</p>
        </div>
      )}
      <div className="row gap-24" style={{ alignItems: 'flex-start' }}>
        <div className="poster-controls stack gap-20" style={{ flex: '1 1 320px', minWidth: 0 }}>
          <div className="stack gap-8">
            <h1 className="page-title">QR poster</h1>
            <p className="muted">Print it, tape it to the door, done. The code never changes.</p>
          </div>
          <fieldset className="stack gap-8" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="label" style={{ marginBottom: 8 }}>Template</legend>
            <div className="grid-auto" style={{ ['--min' as string]: '90px', ['--gap' as string]: '10px' }}>
              {(Object.keys(THEMES) as Theme[]).map((k) => (
                <button key={k} type="button" aria-pressed={theme === k} onClick={() => setTheme(k)} className="stack gap-8" style={{ alignItems: 'center', padding: 10, borderRadius: 14, background: '#fff', cursor: 'pointer', border: theme === k ? '2px solid var(--ink)' : '2px solid transparent' }}>
                  <span style={{ width: '100%', aspectRatio: '8.5 / 11', borderRadius: 4, border: '1px solid var(--line)', background: THEMES[k].bg }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{THEMES[k].name}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span>Headline</span>
            <input className="input" maxLength={40} value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </label>
          <div className="row gap-8">
            <button className="btn btn-primary btn-lg" onClick={() => window.print()}>Print or save as PDF</button>
            <a className="btn btn-ghost btn-lg" href={url} target="_blank" rel="noreferrer">Test the link ↗</a>
          </div>
          <p className="hint">Link: {url}</p>
        </div>

        <div className="poster-stage" style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', justifyContent: 'center', background: '#E6E2D7', borderRadius: 24, padding: '36px 24px' }}>
          <div className="poster stack between" style={{ width: 420, maxWidth: '100%', aspectRatio: '8.5 / 11', padding: '6%', borderRadius: 6, boxShadow: '0 20px 50px rgba(18,18,18,.18)', background: th.bg, color: th.fg, gap: 14 }}>
            <div className="row gap-8" style={{ flexWrap: 'nowrap' }}>
              <span className="display" style={{ width: 40, height: 40, borderRadius: 10, background: theme === 'night' ? cfg.color : '#121212', color: theme === 'night' ? '#121212' : cfg.color === '#FFFFFF' ? '#FFD23F' : cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, letterSpacing: 0 }}>
                {cfg.name.slice(0, 1).toUpperCase()}
              </span>
              <b style={{ fontWeight: 600 }}>{cfg.name}</b>
            </div>
            <span className="display" style={{ fontSize: 'clamp(36px, 5vw, 58px)', lineHeight: 0.92, letterSpacing: '-0.05em' }}>{headline}</span>
            <div style={{ alignSelf: 'center', width: '62%', padding: '4%', borderRadius: 16, background: th.qrBg }}>
              <QrImage text={url} size={220} />
            </div>
            <div className="stack gap-4">
              <b style={{ fontSize: 18, fontWeight: 600 }}>{t(cfg.languages[0], 'scanToJoin')}</b>
              {second && <span style={{ fontSize: 15, opacity: 0.8 }}>{t(second, 'scanToJoin')}</span>}
            </div>
            <span className="mono" style={{ fontSize: 11, letterSpacing: '.1em', opacity: 0.7 }}>QENTRY.AI</span>
          </div>
        </div>
      </div>
    </Shell>
  );
}
