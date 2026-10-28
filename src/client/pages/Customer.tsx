import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import type { Snapshot } from '../../shared/types';
import { Flap, Spinner } from '../components';
import { api, useLive } from '../lib/api';
import { langLabel, pickLang, t } from '../lib/i18n';

interface Saved {
  token: string;
  lang: string;
}

const storeKey = (slug: string) => `qentry:${slug}`;
function load(slug: string): Saved | null {
  try {
    return JSON.parse(localStorage.getItem(storeKey(slug)) ?? 'null');
  } catch {
    return null;
  }
}
function save(slug: string, v: Saved | null) {
  try {
    if (v) localStorage.setItem(storeKey(slug), JSON.stringify(v));
    else localStorage.removeItem(storeKey(slug));
  } catch {
    /* private mode */
  }
}

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    [0, 0.25].forEach((delay) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.22);
    });
  } catch {
    /* no audio */
  }
}

function alertUser(title: string, body: string, pattern: number[]) {
  navigator.vibrate?.(pattern);
  beep();
  if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
    try {
      new Notification(title, { body, tag: 'qentry', icon: '/favicon.svg' });
    } catch {
      /* some mobile browsers need a service worker */
    }
  }
}

export default function Customer() {
  const { slug = '' } = useParams();
  const [saved, setSaved] = useState<Saved | null>(() => load(slug));
  const [info, setInfo] = useState<Snapshot | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lang, setLang] = useState(saved?.lang ?? 'en');

  // Public snapshot for the join form (and to pick a language).
  useEffect(() => {
    api<Snapshot>(`/q/${slug}`)
      .then((s) => {
        setInfo(s);
        if (!saved) setLang(pickLang(s.business.languages));
      })
      .catch(() => setNotFound(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const { snap } = useLive(saved ? `/q/${slug}/ws?token=${encodeURIComponent(saved.token)}` : `/q/${slug}/ws`);
  const live = snap ?? info;

  if (notFound) {
    return (
      <div className="center-page stack gap-12" style={{ textAlign: 'center' }}>
        <h1 className="display" style={{ fontSize: 40 }}>Line not found</h1>
        <p className="muted">Check the QR code and try again.</p>
      </div>
    );
  }
  if (!live) return <Spinner />;

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const me = saved ? snap?.me : undefined;

  return (
    <div dir={dir} style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {me?.status === 'called' ? (
        <Called snap={snap!} lang={lang} onDone={() => { save(slug, null); setSaved(null); }} />
      ) : me && me.status === 'waiting' ? (
        <Ticket snap={snap!} lang={lang} slug={slug} token={saved!.token} onLeft={() => { save(slug, null); setSaved(null); }} />
      ) : (
        <Join
          snap={live}
          lang={lang}
          setLang={(l) => setLang(l)}
          slug={slug}
          gone={!!saved && me?.status === 'gone'}
          onJoined={(token) => {
            const v = { token, lang };
            save(slug, v);
            setSaved(v);
          }}
        />
      )}
    </div>
  );
}

function Header({ snap, lang, setLang }: { snap: Snapshot; lang: string; setLang?: (l: string) => void }) {
  return (
    <div className="row between" style={{ padding: '22px 20px 0', gap: 12, flexWrap: 'nowrap' }}>
      <div className="row gap-12" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
        <span className="display" style={{ width: 44, height: 44, flex: 'none', borderRadius: 12, background: 'var(--ink)', color: snap.business.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, letterSpacing: 0 }}>
          {snap.business.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="stack" style={{ minWidth: 0 }}>
          <b style={{ fontWeight: 600, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{snap.business.name}</b>
          {snap.business.address && <span className="muted" style={{ fontSize: 13 }}>{snap.business.address}</span>}
        </div>
      </div>
      {setLang && snap.business.languages.length > 1 && (
        <label style={{ flex: 'none' }}>
          <span className="sr-only">{t(lang, 'language')}</span>
          <select className="input mono" style={{ minHeight: 44, padding: '8px 12px', borderRadius: 999, fontSize: 13, fontWeight: 700, width: 'auto' }} value={lang} onChange={(e) => setLang(e.target.value)}>
            {snap.business.languages.map((l) => (
              <option key={l} value={l}>{langLabel(l)}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

const svcName = (snap: Snapshot, id: string | null, lang: string) => {
  const s = snap.services.find((x) => x.id === id);
  return s ? s.names?.[lang] || s.name : '';
};

function Join({ snap, lang, setLang, slug, gone, onJoined }: { snap: Snapshot; lang: string; setLang: (l: string) => void; slug: string; gone: boolean; onJoined: (token: string) => void }) {
  const [name, setName] = useState('');
  const [serviceId, setServiceId] = useState(snap.services[0]?.id ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const serving = snap.stations.find((s) => s.current)?.current?.ticket ?? '— — —';

  async function join(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await api<{ token: string }>(`/q/${slug}/join`, { body: { name, serviceId, lang } });
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
      onJoined(res.token);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const closed = snap.paused || snap.full;
  return (
    <form onSubmit={join} className="stack" style={{ flex: 1 }}>
      <Header snap={snap} lang={lang} setLang={setLang} />
      <div className="card-dark stack gap-12" style={{ margin: '18px 20px 0', padding: 18 }}>
        <div className="row between mono" style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--muted-dark)' }}>
          <span>{t(lang, 'nowServing').toUpperCase()}</span>
          <span className="row gap-8"><span className="dot-live" style={{ background: 'var(--yellow)' }} />{t(lang, 'live').toUpperCase()}</span>
        </div>
        <Flap value={serving} height={62} size={40} gap={6} color={snap.business.color} />
        <div className="grid-auto" style={{ ['--min' as string]: '120px', ['--gap' as string]: '8px' }}>
          <div style={{ background: 'var(--ink-2)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--muted-dark)' }}>{t(lang, 'inLine')}</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 24 }}>{snap.count}</div>
          </div>
          <div style={{ background: 'var(--ink-2)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--muted-dark)' }}>{t(lang, 'wait')}</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 24 }}>~{snap.waitMinutes} min</div>
          </div>
        </div>
      </div>

      <div className="stack gap-16" style={{ flex: 1, padding: '24px 20px 0' }}>
        {gone && <p className="notice">{t(lang, 'gone')}</p>}
        <h1 className="display" style={{ fontSize: 34 }}>{t(lang, 'joinTitle')}</h1>
        {snap.business.greeting[lang] && <p className="muted" style={{ lineHeight: 1.5 }}>{snap.business.greeting[lang]}</p>}
        {closed ? (
          <p className="notice" role="status">{t(lang, snap.paused ? 'paused' : 'full')}</p>
        ) : (
          <>
            <label className="field">
              <span>{t(lang, 'yourName')}</span>
              <input className="input" required maxLength={40} autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            {snap.services.length > 1 && (
              <fieldset className="stack gap-8" style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="label" style={{ marginBottom: 8 }}>{t(lang, 'service')}</legend>
                {snap.services.map((s) => {
                  const on = s.id === serviceId;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      aria-pressed={on}
                      onClick={() => setServiceId(s.id)}
                      className="row between"
                      style={{ minHeight: 54, padding: '14px 16px', borderRadius: 14, cursor: 'pointer', textAlign: 'start', background: on ? 'var(--yellow)' : '#fff', border: on ? '2px solid var(--ink)' : '1px solid #DCD8CC', flexWrap: 'nowrap' }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 16 }}>{s.names?.[lang] || s.name}</span>
                      <span className="mono muted" style={{ fontSize: 13 }}>{s.minutes} MIN</span>
                    </button>
                  );
                })}
              </fieldset>
            )}
            {error && <p className="error" role="alert">{error}</p>}
          </>
        )}
      </div>
      <div className="stack gap-12" style={{ padding: '18px 20px 24px' }}>
        {!closed && (
          <button className="btn btn-primary btn-lg btn-block" disabled={busy || !name.trim()}>
            {t(lang, 'join')}
          </button>
        )}
        <span className="muted" style={{ textAlign: 'center', fontSize: 12 }}>{t(lang, 'privacy', { n: snap.business.headsUp })}</span>
      </div>
    </form>
  );
}

function Ticket({ snap, lang, slug, token, onLeft }: { snap: Snapshot; lang: string; slug: string; token: string; onLeft: () => void }) {
  const me = snap.me!;
  const alerted = useRef<number | null>(null);
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied');

  useEffect(() => {
    document.title = `${me.ticket} · ${me.position === 0 ? t(lang, 'next') : `${me.position} ${t(lang, 'ahead')}`}`;
    if (me.position <= snap.business.headsUp && alerted.current === null) {
      alerted.current = me.position;
      alertUser(snap.business.name, t(lang, 'headsUp'), [200, 100, 200]);
    }
  }, [me.position, me.ticket, lang, snap.business.headsUp, snap.business.name]);

  async function leave() {
    await api(`/q/${slug}/leave`, { body: { token } }).catch(() => {});
    onLeft();
  }

  const ahead = me.position;
  return (
    <div className="stack gap-12" style={{ padding: '22px 20px 24px', minHeight: '100vh' }}>
      <div className="row between">
        <b style={{ fontWeight: 600 }}>{snap.business.name}</b>
        <span className="row gap-8 mono" style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--green)' }}>
          <span className="dot-live" />
          {t(lang, 'live').toUpperCase()}
        </span>
      </div>

      <div className="rise" style={{ position: 'relative', background: '#fff', borderRadius: 22, boxShadow: '0 14px 34px rgba(18,18,18,.10)' }}>
        <span aria-hidden style={{ position: 'absolute', insetInlineStart: -12, top: 150, width: 24, height: 24, borderRadius: 999, background: 'var(--paper)' }} />
        <span aria-hidden style={{ position: 'absolute', insetInlineEnd: -12, top: 150, width: 24, height: 24, borderRadius: 999, background: 'var(--paper)' }} />
        <div className="stack gap-4" style={{ height: 162, padding: '22px 24px', borderBottom: '2px dashed #CFCBBF' }}>
          <span className="eyebrow" style={{ fontSize: 11 }}>
            {t(lang, 'yourTicket')} · {svcName(snap, me.serviceId, lang)}
          </span>
          <span className="mono" style={{ fontWeight: 700, fontSize: 76, lineHeight: 1, letterSpacing: '-0.03em' }}>{me.ticket}</span>
          <span className="muted" style={{ fontSize: 14 }}>{me.name}</span>
        </div>
        <div className="grid-auto" style={{ padding: '18px 24px 22px', ['--min' as string]: '120px', ['--gap' as string]: '10px' }}>
          <div style={{ background: snap.business.color, borderRadius: 14, padding: 14 }}>
            {ahead === 0 ? (
              <div className="display" style={{ fontSize: 26, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{t(lang, 'next')}</div>
            ) : (
              <>
                <div className="mono" style={{ fontWeight: 700, fontSize: 34, lineHeight: 1.05 }}>{ahead}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t(lang, ahead === 1 ? 'aheadOne' : 'ahead')}</div>
              </>
            )}
          </div>
          <div style={{ background: 'var(--paper)', borderRadius: 14, padding: 14 }}>
            <div className="mono" style={{ fontWeight: 700, fontSize: 34, lineHeight: 1.05 }}>~{me.eta}</div>
            <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{t(lang, 'minWait')}</div>
          </div>
        </div>
      </div>

      <div className="card stack gap-8" style={{ padding: '14px 16px' }}>
        {perm === 'granted' ? (
          <span className="row gap-8" style={{ fontSize: 15, fontWeight: 600, color: 'var(--green)' }}>✓ {t(lang, 'alertsOn')}</span>
        ) : 'Notification' in window && perm !== 'denied' ? (
          <button className="btn btn-soft btn-block" onClick={async () => setPerm(await Notification.requestPermission())}>
            {t(lang, 'alertsOff')}
          </button>
        ) : null}
        <span className="muted" style={{ fontSize: 13 }}>{t(lang, 'alertsHint')}</span>
      </div>

      <div className="stack gap-8" style={{ marginTop: 'auto' }}>
        {ahead > 0 && (
          <button className="btn btn-ghost btn-block" onClick={() => api(`/q/${slug}/late`, { body: { token } }).catch(() => {})}>
            {t(lang, 'late')}
          </button>
        )}
        <button className="btn btn-ghost btn-block" onClick={leave}>
          {t(lang, 'leave')}
        </button>
      </div>
    </div>
  );
}

function Called({ snap, lang, onDone }: { snap: Snapshot; lang: string; onDone: () => void }) {
  const me = snap.me!;
  useEffect(() => {
    document.title = `${t(lang, 'called')} · ${me.ticket}`;
    alertUser(snap.business.name, `${t(lang, 'called')} ${t(lang, 'goTo')} ${me.stationName ?? ''}`, [400, 150, 400, 150, 400]);
  }, [me.calledAt]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="stack" style={{ minHeight: '100vh', background: snap.business.color, padding: '22px 20px 24px' }}>
      <div className="row between mono" style={{ fontSize: 12, letterSpacing: '.1em' }}>
        <span>{snap.business.name.toUpperCase()}</span>
        <b>{me.ticket}</b>
      </div>
      <div className="stack gap-20" style={{ flex: 1, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <h1 className="display rise" style={{ fontSize: 'clamp(52px, 16vw, 72px)', lineHeight: 0.9, letterSpacing: '-0.05em' }}>
          {t(lang, 'upTitle', { name: me.name.split(' ')[0] })}
        </h1>
        <div className="card-dark stack gap-4" style={{ alignItems: 'center', padding: '20px 30px' }}>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--muted-dark)' }}>{t(lang, 'goTo').toUpperCase()}</span>
          <span className="mono" style={{ fontWeight: 700, fontSize: 40, lineHeight: 1.05, color: snap.business.color }}>{(me.stationName ?? '').toUpperCase()}</span>
        </div>
        <p style={{ fontWeight: 500 }}>{t(lang, 'hold', { n: snap.business.holdMin })}</p>
      </div>
      <button className="btn btn-dark btn-lg btn-block" onClick={onDone}>
        {t(lang, 'onMyWay')}
      </button>
    </div>
  );
}
