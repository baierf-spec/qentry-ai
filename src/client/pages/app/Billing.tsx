import { useEffect, useState } from 'react';
import type { BusinessConfig } from '../../../shared/types';
import { Shell, Spinner } from '../../components';
import { api } from '../../lib/api';

export default function Billing() {
  const [cfg, setCfg] = useState<BusinessConfig | null>(null);
  useEffect(() => {
    api<BusinessConfig>('/business').then(setCfg);
  }, []);
  if (!cfg) return <Shell><Spinner /></Shell>;
  const pro = cfg.plan === 'pro';
  return (
    <Shell>
      <h1 className="page-title">Billing</h1>
      <div className="row gap-16" style={{ alignItems: 'stretch', maxWidth: 1000 }}>
        <div className="stack gap-16" style={{ flex: '2 1 380px', background: pro ? 'var(--yellow)' : '#fff', borderRadius: 22, padding: 26 }}>
          <span className="eyebrow" style={{ color: 'var(--ink)' }}>Current plan</span>
          <span className="display" style={{ fontSize: 40 }}>{pro ? 'Pro' : 'Free'}</span>
          <p style={{ lineHeight: 1.5 }}>
            {pro ? 'Unlimited customers, stations and staff, voice calling and insights.' : 'Everything you need to run one walk-in line. Upgrade when you want more.'}
          </p>
          {!pro && (
            <a className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }} href="mailto:hello@qentry.ai?subject=Upgrade%20to%20Pro">
              Upgrade to Pro — $19/month
            </a>
          )}
        </div>
        <div className="card stack gap-12" style={{ flex: '1 1 260px' }}>
          <span className="eyebrow">Alerts</span>
          <span className="mono" style={{ fontWeight: 700, fontSize: 36 }}>$0.00</span>
          <span className="muted" style={{ fontSize: 14 }}>Customer alerts are free – no SMS fees, ever.</span>
        </div>
      </div>
      <p className="muted" style={{ maxWidth: 640, fontSize: 14 }}>Online card payments are coming soon. Until then, upgrades are handled by email.</p>
    </Shell>
  );
}
