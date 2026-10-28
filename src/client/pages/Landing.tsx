import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Flap, Logo } from '../components';
import { useSession } from '../lib/session';
import './landing.css';

/** Adds "in" once the element scrolls into view (plays once). */
function Reveal({ as: Tag = 'section', className = '', style, id, children }: { as?: 'section' | 'div'; className?: string; style?: CSSProperties; id?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return setSeen(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} id={id} className={`${className} ${seen ? 'in' : ''}`} style={style}>
      {children}
    </Tag>
  );
}

const d = (s: number) => ({ ['--d' as string]: `${s}s` }) as CSSProperties;

function HeroArt() {
  const [n, setN] = useState(23);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let iv: ReturnType<typeof setInterval>;
    const t = setTimeout(() => (iv = setInterval(() => setN((x) => (x >= 25 ? 23 : x + 1)), 2800)), 2400);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
    };
  }, []);
  const ahead = 25 - n;
  return (
    <div className="lp-hero-art">
      <div className="lp-board rv" style={d(0.2)}>
        <div className="row between mono" style={{ fontSize: 12, letterSpacing: '.1em', color: 'var(--muted-dark)' }}>
          <span className="row gap-8">
            <span className="dot-live" style={{ background: 'var(--yellow)' }} />
            NOW SERVING
          </span>
          <span>CHAIR 1</span>
        </div>
        <Flap value={`A-0${n}`} height={104} size={72} />
        <div className="stack">
          <div className="lp-board-row">
            <span className="mono">A-0{n + 1} · {n + 1 === 25 ? 'Emma R.' : 'Tyler S.'}</span>
            <span style={{ color: 'var(--muted-dark)' }}>~6 min</span>
          </div>
          <div className="lp-board-row">
            <span className="mono">A-0{n + 2} · {n + 2 === 25 ? 'Emma R.' : 'Mark'}</span>
            <span style={{ color: 'var(--muted-dark)' }}>~12 min</span>
          </div>
        </div>
      </div>
      <div className="lp-ticket-wrap rv" style={d(0.45)}>
        <div className={`lp-ticket ${ahead <= 0 ? 'called' : ''}`}>
          <span className="notch" style={{ left: -11 }} />
          <span className="notch" style={{ right: -11 }} />
          <div className="top">
            <span className="mono" style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--muted)' }}>NORTHSIDE BARBERS · TICKET</span>
            <span className="mono" style={{ fontWeight: 700, fontSize: 52, lineHeight: 1 }}>A-025</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Emma · Haircut</span>
          </div>
          <div className="bottom">
            <span className="display" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>
              {ahead <= 0 ? 'You’re up!' : ahead === 1 ? '1 person ahead' : `${ahead} people ahead`}
            </span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>{ahead <= 0 ? 'Please go to chair 1' : `About ${ahead * 6} min wait`}</span>
          </div>
        </div>
      </div>
      <div className="lp-sticker rv" style={d(0.65)}>
        Scan<span style={{ fontSize: 26 }}>↓</span>join the line
      </div>
    </div>
  );
}

const MARQUEE = ['BARBERSHOPS', 'TIRE SHOPS', 'FOOD TRUCKS', 'PHONE REPAIR', 'PARCEL PICKUP', 'POP-UPS & EVENTS'];

export default function Landing() {
  const { me } = useSession();
  const [heroIn, setHeroIn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHeroIn(true), 60);
    return () => clearTimeout(t);
  }, []);
  const loggedIn = !!me?.user;
  const cta = loggedIn ? '/app' : '/signup';

  return (
    <div className="lp">
      <header className="lp-wrap lp-nav">
        <Logo />
        <nav aria-label="Main navigation">
          <a className="navlink" href="#how">How it works</a>
          <a className="navlink" href="#features">Features</a>
          <a className="navlink" href="#pricing">Pricing</a>
          {loggedIn ? <Link to="/app">Open my line</Link> : <Link to="/login">Log in</Link>}
          <Link to={cta} className="btn btn-primary" style={{ minHeight: 44 }}>
            {loggedIn ? 'Dashboard' : 'Create your line'}
          </Link>
        </nav>
      </header>

      <section className={`lp-wrap lp-hero ${heroIn ? 'in' : ''}`}>
        <div className="lp-hero-copy">
          <span className="lp-eyebrow up">№ 001 — A virtual line, one QR code</span>
          <h1 className="display up" style={d(0.08)}>
            Lines, minus the standing.
          </h1>
          <p className="lead up" style={d(0.16)}>
            Customers scan a QR code at the door, watch their place in line on their phone, and grab a coffee. When it’s their turn, their phone buzzes and your TV calls them by name.
          </p>
          <div className="row gap-12 up" style={d(0.24)}>
            <Link to={cta} className="btn btn-primary btn-lg">
              Set up your line in 2 minutes
            </Link>
            <a href="#features" style={{ fontWeight: 600, fontSize: 17, padding: '16px 8px' }}>
              See how it works →
            </a>
          </div>
          <div className="row gap-8 up muted" style={{ ...d(0.32), fontSize: 14, columnGap: 22 }}>
            <span>No app for customers</span>
            <span aria-hidden>·</span>
            <span>Works on any TV</span>
            <span aria-hidden>·</span>
            <span>Free plan forever</span>
          </div>
        </div>
        <HeroArt />
      </section>

      <div className="lp-marquee">
        <div className="lp-marquee-track">
          {[0, 1].map((k) => (
            <div key={k} aria-hidden={k === 1}>
              {MARQUEE.flatMap((m) => [<span key={m}>{m}</span>, <span key={m + '*'} aria-hidden>✳</span>])}
            </div>
          ))}
        </div>
      </div>

      <Reveal id="how" className="lp-wrap lp-section">
        <div className="stack gap-24" style={{ gap: 56 }}>
          <div className="lp-head up">
            <h2 className="display lp-h2" style={{ maxWidth: 720 }}>
              From hello to your first customer in three steps.
            </h2>
            <span className="lp-eyebrow">№ 002 — How it works</span>
          </div>
          <div className="lp-steps">
            {[
              ['01', 'Describe your business', '“Barbershop, two barbers, haircuts take 30 minutes.” AI builds your services, stations and copy in every language.'],
              ['02', 'Hang the QR code', 'Print the ready-made poster with your logo. Open the board on any TV in your shop.'],
              ['03', 'Tap “Call next”', 'The customer gets a ping and the TV calls their name. Nobody crowds the door again.']
            ].map(([n, h, p], i) => (
              <div key={n} className="up" style={d(0.05 + i * 0.08)}>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--cobalt)' }}>{n}</span>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal id="features" className="lp-wrap" style={{ paddingBottom: 120 }}>
        <div className="stack" style={{ gap: 48 }}>
          <div className="lp-head up">
            <h2 className="display lp-h2">A line that runs itself.</h2>
            <span className="lp-eyebrow">№ 003 — Features</span>
          </div>
          <div className="lp-feats">
            <article className="lp-feat rv" style={d(0.05)}>
              <div className="vis stack gap-16" style={{ background: 'var(--cobalt)', padding: 26 }}>
                <div className="mono" style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.28)', borderRadius: 14, padding: '14px 16px', fontSize: 14, color: '#fff', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  <span className="typing anim">Barbershop, 2 barbers, haircut 30 min</span>
                </div>
                <div className="row gap-8">
                  {['Chair 1', 'Chair 2', 'Haircut · 30 min', 'EN · ES · ZH', 'QR poster'].map((c, i) => (
                    <span key={c} className="chipa anim" style={{ animationDelay: `${i * 0.2}s`, background: i > 2 ? 'var(--yellow)' : '#fff' }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="txt">
                <h3>Set up with one sentence</h3>
                <p>No forms. Describe your shop in your own words and AI builds the line, the services and the poster.</p>
              </div>
            </article>

            <article className="lp-feat rv" style={d(0.13)}>
              <div className="vis" style={{ background: 'var(--ink)' }}>
                <span className="mono" style={{ position: 'absolute', left: 26, top: 26, fontSize: 11, letterSpacing: '.1em', color: 'var(--yellow)' }}>
                  JUST JOINED ↓
                </span>
                <div style={{ position: 'absolute', left: 26, right: 26, top: 50, height: 220 }}>
                  {[
                    ['A-031', 'Jordan', 'Beard trim'],
                    ['A-030', 'Sofia', 'Haircut'],
                    ['A-029', 'Daniel', 'Haircut'],
                    ['A-028', 'Mia', 'Fade'],
                    ['A-027', 'Chris', 'Haircut']
                  ].map(([t, n, s], i) => (
                    <div key={t} className="stackrow anim" style={{ animationDelay: `${-i * 2}s` }}>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--yellow)' }}>{t}</span>
                      <span style={{ color: '#fff' }}>{n}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--muted-dark)', fontSize: 13 }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="txt">
                <h3>Live on every screen</h3>
                <p>The tablet, the TV and every customer’s phone update within a second.</p>
              </div>
            </article>

            <article className="lp-feat rv" style={d(0.21)}>
              <div className="vis stack between" style={{ background: 'var(--paper-2)', padding: 26 }}>
                <div className="row" style={{ alignItems: 'flex-end', gap: 6, height: 96, flexWrap: 'nowrap' }}>
                  {[40, 70, 55, 90, 65, 100, 75, 50, 85, 60, 95, 45, 70, 55].map((h, i) => (
                    <span key={i} className="eqbar anim" style={{ height: `${h}%`, animationDuration: `${0.6 + (i % 4) * 0.15}s`, animationDelay: `${i * 0.07}s` }} />
                  ))}
                </div>
                <div style={{ position: 'relative', height: 64 }}>
                  {['“John, please come to chair two.”', '“Juan, pase a la silla dos, por favor.”', '“王先生，请到二号椅。”'].map((s, i) => (
                    <span key={s} className="langline anim" style={{ animationDelay: `${i * 3}s` }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="txt">
                <h3>Your TV calls out loud</h3>
                <p>In each customer’s own language, even in a noisy shop. You type in English; they read and hear their own.</p>
              </div>
            </article>

            <article className="lp-feat rv" style={d(0.29)}>
              <div className="vis" style={{ background: 'var(--paper-2)', display: 'flex', justifyContent: 'center', padding: '0 40px' }}>
                <div style={{ width: '100%', maxWidth: 280, height: 270, marginTop: 30, background: 'var(--ink)', borderRadius: '34px 34px 0 0', padding: '14px 12px 0' }}>
                  <div style={{ background: 'var(--paper)', borderRadius: '24px 24px 0 0', height: '100%', position: 'relative', overflow: 'hidden', paddingTop: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span className="mono" style={{ fontWeight: 700, fontSize: 34 }}>A-025</span>
                    <span className="muted" style={{ fontSize: 13 }}>Your ticket</span>
                    <div className="notif anim" style={{ background: '#fff' }}>
                      <b className="mono" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--ink)', color: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Q</b>
                      <span className="stack"><b style={{ fontWeight: 600 }}>2 people ahead of you</b><span className="muted">Time to head back</span></span>
                    </div>
                    <div className="notif anim" style={{ background: 'var(--yellow)', animationDelay: '3.5s' }}>
                      <b className="mono" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--ink)', color: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Q</b>
                      <span className="stack"><b style={{ fontWeight: 600 }}>You’re up!</b><span>Chair 2 · Marcus</span></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="txt">
                <h3>Alerts without SMS fees</h3>
                <p>A heads-up when two people are left, and another when it’s their turn — right on their phone.</p>
              </div>
            </article>

            <article className="lp-feat rv" style={d(0.37)}>
              <div className="vis stack gap-8" style={{ background: '#fff', borderBottom: '1px solid #E2DFD6', padding: '26px 26px 22px' }}>
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  {[30, 38, 52, 46, 40, 58, 74, 100, 62].map((h, i) => (
                    <span key={i} className="bar anim" style={{ height: `${h}%`, background: i === 7 ? 'var(--cobalt)' : '#E2DFD6', animationDelay: `${i * 0.12}s` }} />
                  ))}
                  <span className="mono" style={{ position: 'absolute', right: '8%', top: -4, background: 'var(--ink)', color: '#fff', fontSize: 12, padding: '6px 9px', borderRadius: 8 }}>
                    Fri 5 PM · ~40 min
                  </span>
                </div>
                <div className="row between mono muted" style={{ fontSize: 11 }}>
                  <span>10a</span><span>12p</span><span>2p</span><span>4p</span><span>6p</span>
                </div>
              </div>
              <div className="txt">
                <h3>A tip, not a spreadsheet</h3>
                <p>See when your line peaks and who walks out — and when one more pair of hands would pay for itself.</p>
              </div>
            </article>

            <article className="lp-feat rv" style={d(0.45)}>
              <div className="vis row gap-24" style={{ background: 'var(--ink)', justifyContent: 'center', flexWrap: 'nowrap' }}>
                <div style={{ position: 'relative', width: 128, height: 128 }}>
                  <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden>
                    <circle cx="64" cy="64" r="52" fill="none" stroke="#2C2B28" strokeWidth="10" />
                    <circle className="ring anim" cx="64" cy="64" r="52" fill="none" stroke="#FFD23F" strokeWidth="10" strokeLinecap="round" strokeDasharray="327" transform="rotate(-90 64 64)" />
                  </svg>
                  <span className="stack" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <b className="mono" style={{ fontSize: 28 }}>24</b>
                    <span style={{ fontSize: 12, color: 'var(--muted-dark)' }}>hours</span>
                  </span>
                </div>
                <div className="stack gap-8 mono" style={{ fontSize: 13, color: 'var(--muted-dark)' }}>
                  <s>Emma R.</s>
                  <s>Tyler S.</s>
                  <s>Daniel K.</s>
                </div>
              </div>
              <div className="txt">
                <h3>Gone in 24 hours</h3>
                <p>Customer names are deleted after a day. Private by default, nothing to manage.</p>
              </div>
            </article>
          </div>
        </div>
      </Reveal>

      <Reveal id="pricing" style={{ background: 'var(--ink)', color: '#fff', padding: '112px 0' }}>
        <div className="lp-wrap stack" style={{ maxWidth: 1040, gap: 56 }}>
          <div className="stack gap-16 up" style={{ alignItems: 'center', textAlign: 'center' }}>
            <span className="lp-eyebrow" style={{ color: 'var(--yellow)' }}>№ 004 — Pricing</span>
            <h2 className="display lp-h2">One price. No surprise SMS bills.</h2>
          </div>
          <div className="lp-price">
            <div className="rv" style={{ ...d(0.08), background: 'var(--ink-2)' }}>
              <div className="row between"><h3 className="display" style={{ fontSize: 26, fontWeight: 700 }}>Free</h3><span className="mono" style={{ fontSize: 13, color: 'var(--muted-dark)' }}>TO GET STARTED</span></div>
              <span className="mono" style={{ fontWeight: 700, fontSize: 64, lineHeight: 1 }}>$0</span>
              <ul style={{ color: '#D8D5CC' }}>
                {['1 location', 'QR poster and TV board', 'Phone alerts for customers', 'Automatic translations'].map((x) => (
                  <li key={x}><span style={{ color: 'var(--yellow)' }} aria-hidden>✓</span>{x}</li>
                ))}
              </ul>
              <Link to={cta} className="btn btn-ghost btn-lg" style={{ marginTop: 'auto', color: '#fff', borderColor: '#4A4944' }}>Start for free</Link>
            </div>
            <div className="rv" style={{ ...d(0.16), background: 'var(--yellow)', color: 'var(--ink)' }}>
              <div className="row between"><h3 className="display" style={{ fontSize: 26, fontWeight: 700 }}>Pro</h3><span className="mono" style={{ fontSize: 13 }}>FOR EVERY DAY</span></div>
              <div className="row gap-8" style={{ alignItems: 'baseline' }}><span className="mono" style={{ fontWeight: 700, fontSize: 64, lineHeight: 1 }}>$19</span><span>/ month per location</span></div>
              <ul>
                {['Unlimited customers, stations and staff', 'Voice calling on the TV', 'Your own colors and TV layouts', 'Insights and weekly tips'].map((x) => (
                  <li key={x}><span aria-hidden>✓</span>{x}</li>
                ))}
              </ul>
              <Link to={cta} className="btn btn-dark btn-lg" style={{ marginTop: 'auto' }}>Try free for 14 days</Link>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal className="lp-wrap row" style={{ padding: '112px 24px', gap: 48, alignItems: 'flex-start' }}>
        <div className="stack gap-16 up" style={{ flex: '1 1 320px' }}>
          <span className="lp-eyebrow">№ 005 — FAQ</span>
          <h2 className="display lp-h2" style={{ fontSize: 'clamp(40px, 5vw, 64px)' }}>Questions, answered</h2>
        </div>
        <div className="lp-faq stack up" style={{ flex: '2 1 560px', minWidth: 0 }}>
          {[
            ['Do customers need an app?', 'No. They scan the QR code with their camera and everything runs in the browser.'],
            ['What if someone has no phone?', 'Your staff adds them with one tap, and they watch for their number on the TV.'],
            ['What kind of TV do I need?', 'Any TV with a browser, a Chromecast or a Fire TV stick. An old tablet works too.'],
            ['Can I change the copy and the look?', 'Yes — your colors, greeting, services and TV layout are all yours to edit.']
          ].map(([q, a]) => (
            <div key={q}>
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="lp-wrap" style={{ paddingBottom: 112 }}>
        <div className="rv stack" style={{ background: 'var(--cobalt)', color: '#fff', borderRadius: 32, padding: '80px 40px', alignItems: 'center', gap: 28, textAlign: 'center' }}>
          <span className="mono" style={{ background: 'var(--ink)', color: 'var(--yellow)', fontWeight: 700, fontSize: 15, padding: '10px 14px', borderRadius: 8, letterSpacing: '.06em' }}>YOU’RE NUMBER 001</span>
          <h2 className="display" style={{ fontSize: 'clamp(40px, 6vw, 80px)', maxWidth: 880, textWrap: 'balance' }}>Tell us about your shop. Your line is ready in 2 minutes.</h2>
          <Link to={cta} className="btn btn-white btn-lg">Create your line for free</Link>
        </div>
      </Reveal>

      <footer style={{ borderTop: '1px solid #CFCBBF' }}>
        <div className="lp-wrap row between muted" style={{ padding: '28px 24px', fontSize: 14, gap: 16 }}>
          <span className="mono">© {new Date().getFullYear()} QENTRY.AI</span>
          <div className="row gap-24">
            <a href="mailto:hello@qentry.ai">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
