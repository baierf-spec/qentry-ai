import { useEffect, useRef, useState } from 'react';
import type { Snapshot } from '../../shared/types';
import { Flap, QrImage, Spinner } from '../components';
import { api, useLive } from '../lib/api';
import { speechLang, t } from '../lib/i18n';

const KEY = 'qentry:tv';

interface TvMe {
  paired: boolean;
  valid: boolean;
  slug?: string;
  langMode?: string;
  code?: string;
  expiresAt?: number;
}

export default function TV() {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });
  const [me, setMe] = useState<TvMe | null>(null);

  // Get (or refresh) a pairing code, then poll until the owner pairs this screen.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      try {
        let tk = token;
        if (!tk) {
          const res = await api<{ token: string }>('/tv/code', { body: {} });
          tk = res.token;
          localStorage.setItem(KEY, tk);
          setToken(tk);
          return;
        }
        const m = await api<TvMe>(`/tv/me?token=${encodeURIComponent(tk)}`);
        if (!alive) return;
        if (!m.paired && !m.valid) {
          localStorage.removeItem(KEY);
          setToken(null);
          return;
        }
        setMe(m);
        if (!m.paired) timer = setTimeout(check, 3000);
      } catch {
        timer = setTimeout(check, 5000);
      }
    }
    check();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [token]);

  if (!me) return <div style={{ background: 'var(--ink)', minHeight: '100vh' }}><Spinner /></div>;
  if (!me.paired) return <Pairing code={me.code ?? '------'} />;
  return <Board token={token!} langMode={me.langMode ?? 'rotate'} onUnpaired={() => { localStorage.removeItem(KEY); setToken(null); setMe(null); }} />;
}

function Pairing({ code }: { code: string }) {
  return (
    <div className="stack" style={{ minHeight: '100vh', background: 'var(--ink)', color: '#fff', padding: 'clamp(24px, 5vw, 72px) clamp(24px, 6vw, 96px)' }}>
      <div className="row between">
        <span className="row gap-12">
          <span className="logo-mark" style={{ background: 'var(--yellow)', color: 'var(--ink)', fontSize: 18 }}>Q·01</span>
          <span className="logo-word" style={{ fontSize: 32 }}>qentry</span>
        </span>
        <span className="mono" style={{ letterSpacing: '.1em', color: 'var(--muted-dark)', fontSize: 'clamp(14px, 1.4vw, 22px)' }}>QENTRY.AI/TV</span>
      </div>
      <div className="stack" style={{ flex: 1, justifyContent: 'center', gap: 'clamp(24px, 4vw, 48px)' }}>
        <h1 className="display" style={{ fontSize: 'clamp(44px, 6vw, 104px)', maxWidth: 1300 }}>Pair this screen with your line.</h1>
        <div style={{ maxWidth: 1240 }}>
          <Flap value={`${code.slice(0, 3)} ${code.slice(3)}`} height={Math.min(240, Math.round(window.innerWidth / 8))} size={Math.min(170, Math.round(window.innerWidth / 11))} gap={14} />
        </div>
        <div className="row" style={{ gap: 'clamp(16px, 4vw, 64px)', fontSize: 'clamp(16px, 1.8vw, 30px)', color: '#D8D5CC' }}>
          <span className="row gap-16"><b className="mono" style={{ color: 'var(--yellow)' }}>01</b>On your phone, open Qentry → TV boards</span>
          <span className="row gap-16"><b className="mono" style={{ color: 'var(--yellow)' }}>02</b>Enter the code above</span>
        </div>
      </div>
      <span className="row gap-12 mono" style={{ color: 'var(--muted-dark)', letterSpacing: '.08em' }}>
        <span className="dot-live" style={{ background: 'var(--yellow)' }} /> WAITING FOR PAIRING
      </span>
    </div>
  );
}

function speak(text: string, lang: string) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = speechLang(lang);
  u.rate = 0.95;
  const v = speechSynthesis.getVoices().find((x) => x.lang.toLowerCase().startsWith(u.lang.slice(0, 2).toLowerCase()));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

function chime() {
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      const t0 = ctx.currentTime + i * 0.28;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.55);
    });
  } catch {
    /* no audio */
  }
}

function Board({ token, langMode, onUnpaired }: { token: string; langMode: string; onUnpaired: () => void }) {
  const { snap, connected } = useLive(`/tv/ws?token=${encodeURIComponent(token)}`);
  const [sound, setSound] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const [rot, setRot] = useState(0);
  const lastAt = useRef<number | null>(null);
  const failures = useRef(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setClock(new Date());
      setRot((r) => r + 1);
    }, 6000);
    return () => clearInterval(iv);
  }, []);

  // If the screen was unpaired in the panel, go back to the pairing code.
  useEffect(() => {
    if (connected) {
      failures.current = 0;
      return;
    }
    const tm = setTimeout(async () => {
      const m = await api<TvMe>(`/tv/me?token=${encodeURIComponent(token)}`).catch(() => null);
      if (m && !m.paired) onUnpaired();
    }, 8000);
    return () => clearTimeout(tm);
  }, [connected, token, onUnpaired]);

  // Announce new calls.
  useEffect(() => {
    const call = snap?.lastCall;
    if (!call) return;
    if (lastAt.current === null) {
      lastAt.current = call.at; // don't announce the call that was already on screen when we loaded
      return;
    }
    if (call.at === lastAt.current) return;
    lastAt.current = call.at;
    if (!sound) return;
    chime();
    if (snap!.business.voice) {
      const primary = snap!.business.languages[0] ?? 'en';
      const first = call.name.split(' ')[0];
      setTimeout(() => {
        speak(t(call.lang, 'callLine', { name: first, station: call.stationName }), call.lang);
        if (call.lang !== primary) speak(t(primary, 'callLine', { name: first, station: call.stationName }), primary);
      }, 900);
    }
  }, [snap?.lastCall?.at, sound]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!snap) return <div style={{ background: 'var(--ink)', minHeight: '100vh' }}><Spinner /></div>;
  return <BoardView snap={snap} rot={rot} langMode={langMode} clock={clock} sound={sound} enableSound={() => { setSound(true); chime(); }} />;
}

function BoardView({ snap, rot, langMode, clock, sound, enableSound }: { snap: Snapshot; rot: number; langMode: string; clock: Date; sound: boolean; enableSound: () => void }) {
  const langs = langMode === 'rotate' ? snap.business.languages : snap.business.languages.slice(0, 1);
  const lang = langs[rot % langs.length] ?? 'en';
  const second = langs.length > 1 ? langs.find((l) => l !== langs[0]) : undefined;
  const call = snap.lastCall && Date.now() - snap.lastCall.at < 10 * 60_000 ? snap.lastCall : null;
  const color = snap.business.color;
  const joinUrl = `${location.origin}/q/${snap.business.slug}`;
  const vw = (n: number) => `clamp(${Math.round(n * 0.45)}px, ${(n / 19.2).toFixed(2)}vw, ${n}px)`;

  return (
    <div className="stack" style={{ minHeight: '100vh', height: '100vh', background: 'var(--ink)', color: '#fff', padding: `${vw(56)} ${vw(72)}`, gap: vw(32), overflow: 'hidden', cursor: sound ? 'none' : 'default' }}>
      <div className="row between" style={{ flexWrap: 'nowrap', gap: 24 }}>
        <div className="row" style={{ gap: vw(22), flexWrap: 'nowrap', minWidth: 0 }}>
          <span className="display" style={{ width: vw(76), height: vw(76), borderRadius: 18, background: color, color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: vw(38), letterSpacing: 0, flex: 'none' }}>
            {snap.business.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="stack gap-4" style={{ minWidth: 0 }}>
            <span className="display" style={{ fontSize: vw(46), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{snap.business.name}</span>
            <span className="mono" style={{ fontSize: vw(22), letterSpacing: '.06em', color: 'var(--muted-dark)' }}>
              {t(langs[0], 'waitNow').toUpperCase()} ~{snap.waitMinutes} MIN{second ? ` · ${t(second, 'waitNow').toUpperCase()} ~${snap.waitMinutes} MIN` : ''}
            </span>
          </div>
        </div>
        <span className="mono" style={{ fontWeight: 700, fontSize: vw(60), color }}>
          {clock.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>

      {call && (
        <div key={call.at} className="row rise" style={{ background: color, color: 'var(--ink)', borderRadius: 28, padding: `${vw(26)} ${vw(40)}`, gap: vw(28), flexWrap: 'nowrap' }}>
          <div className="stack gap-4">
            <span className="display" style={{ fontSize: vw(56), letterSpacing: '-0.03em' }}>
              {call.ticket} · {t(call.lang, 'callLine', { name: call.name.split(' ')[0], station: call.stationName })}
            </span>
            {call.lang !== langs[0] && <span style={{ fontSize: vw(28), fontWeight: 500 }}>{t(langs[0], 'callLine', { name: call.name.split(' ')[0], station: call.stationName })}</span>}
          </div>
        </div>
      )}

      <div className="row" style={{ flex: 1, gap: vw(36), minHeight: 0, alignItems: 'stretch', flexWrap: 'nowrap' }}>
        <div className="stack" style={{ flex: 2, gap: vw(20), minWidth: 0 }}>
          <span className="mono" style={{ fontSize: vw(22), letterSpacing: '.12em', color: 'var(--muted-dark)' }}>{t(lang, 'nowServing').toUpperCase()}</span>
          <div className="grid-auto" style={{ flex: 1, ['--min' as string]: '260px', ['--gap' as string]: vw(28), alignContent: 'start' }}>
            {snap.stations.map((s) => (
              <div key={s.id} className="stack between" style={{ background: 'var(--ink-2)', borderRadius: 28, padding: vw(32), gap: vw(18) }}>
                <span className="mono" style={{ fontSize: vw(26), letterSpacing: '.08em', color: s.current ? color : 'var(--muted-dark)' }}>
                  {s.name.toUpperCase()}{s.staffName ? ` · ${s.staffName.toUpperCase()}` : ''}
                </span>
                <Flap value={s.current?.ticket ?? '-----'} height={snap.stations.length > 2 ? 110 : 170} size={snap.stations.length > 2 ? 72 : 118} gap={8} color={s.current ? color : '#55534D'} tile="#121212" />
                <span style={{ fontSize: vw(40), fontWeight: 500 }}>{s.current?.name ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stack" style={{ flex: 1, gap: vw(20), minWidth: 0 }}>
          <span className="mono" style={{ fontSize: vw(22), letterSpacing: '.12em', color: 'var(--muted-dark)' }}>{t(lang, 'upNext').toUpperCase()}</span>
          <div className="stack" style={{ background: 'var(--ink-2)', borderRadius: 28, padding: `8px ${vw(32)}` }}>
            {snap.waiting.length === 0 && <span style={{ padding: '20px 0', fontSize: vw(28), color: 'var(--muted-dark)' }}>—</span>}
            {snap.waiting.slice(0, 4).map((w) => (
              <div key={w.ticket} className="row between rise" style={{ padding: `${vw(15)} 0`, borderBottom: '1px solid var(--ink-3)', flexWrap: 'nowrap' }}>
                <span className="row" style={{ fontSize: vw(32), gap: vw(18), flexWrap: 'nowrap' }}>
                  <b className="mono" style={{ color }}>{w.ticket}</b>
                  <span>{w.name}</span>
                </span>
                <span className="mono" style={{ fontSize: vw(26), color: 'var(--muted-dark)' }}>~{w.eta} min</span>
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 'auto', background: 'var(--paper)', color: 'var(--ink)', borderRadius: 28, padding: vw(26), gap: vw(26), flexWrap: 'nowrap' }}>
            <QrImage text={joinUrl} size={Math.round(Math.min(150, window.innerWidth / 12.8))} />
            <div className="stack gap-8">
              <span className="display" style={{ fontSize: vw(40), letterSpacing: '-0.03em' }}>{t(langs[0], 'scanToJoin')}</span>
              {second && <span style={{ fontSize: vw(24), color: 'var(--muted)' }}>{t(second, 'scanToJoin')}</span>}
            </div>
          </div>
        </div>
      </div>

      {!sound && (
        <button className="btn btn-yellow btn-lg" style={{ position: 'fixed', right: 24, bottom: 24 }} onClick={enableSound}>
          Tap to turn on sound
        </button>
      )}
    </div>
  );
}
