import { LANGS } from '../shared/types';

export interface EditService {
  id?: string;
  name: string;
  minutes: number;
  names?: Record<string, string>;
}
export interface EditStation {
  id?: string;
  name: string;
  staffName?: string;
}

export function ServicesEditor({ value, onChange }: { value: EditService[]; onChange: (v: EditService[]) => void }) {
  const set = (i: number, patch: Partial<EditService>) => onChange(value.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  return (
    <div className="stack gap-8">
      {value.map((s, i) => (
        <div key={s.id ?? i} className="row gap-8" style={{ flexWrap: 'nowrap' }}>
          <input className="input" aria-label="Service name" value={s.name} placeholder="Haircut" onChange={(e) => set(i, { name: e.target.value })} />
          <label className="row gap-4" style={{ flexWrap: 'nowrap', flex: 'none' }}>
            <input className="input mono" aria-label="Minutes" inputMode="numeric" style={{ width: 76, textAlign: 'center' }} value={s.minutes || ''} onChange={(e) => set(i, { minutes: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
            <span className="muted" style={{ fontSize: 13 }}>min</span>
          </label>
          <button type="button" className="btn btn-soft" aria-label={`Remove ${s.name || 'service'}`} style={{ minWidth: 46, padding: 0 }} onClick={() => onChange(value.filter((_, k) => k !== i))} disabled={value.length <= 1}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-soft" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...value, { name: '', minutes: 20 }])}>
        + Add service
      </button>
    </div>
  );
}

export function StationsEditor({ value, onChange }: { value: EditStation[]; onChange: (v: EditStation[]) => void }) {
  const set = (i: number, patch: Partial<EditStation>) => onChange(value.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  return (
    <div className="stack gap-8">
      {value.map((s, i) => (
        <div key={s.id ?? i} className="row gap-8" style={{ flexWrap: 'nowrap' }}>
          <input className="input" aria-label="Station name" value={s.name} placeholder={`Chair ${i + 1}`} onChange={(e) => set(i, { name: e.target.value })} />
          <input className="input" aria-label="Staff name" value={s.staffName ?? ''} placeholder="Staff name (optional)" onChange={(e) => set(i, { staffName: e.target.value })} />
          <button type="button" className="btn btn-soft" aria-label={`Remove ${s.name || 'station'}`} style={{ minWidth: 46, padding: 0 }} onClick={() => onChange(value.filter((_, k) => k !== i))} disabled={value.length <= 1}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-soft" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...value, { name: `Station ${value.length + 1}`, staffName: '' }])}>
        + Add station
      </button>
    </div>
  );
}

export function LanguagePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="row gap-8">
      {LANGS.map((l, i) => {
        const on = value.includes(l.code);
        const primary = value[0] === l.code;
        return (
          <button
            key={l.code}
            type="button"
            className={`chip ${on ? 'chip-on' : ''}`}
            aria-pressed={on}
            title={primary ? 'Primary language' : undefined}
            onClick={() => {
              if (primary) return;
              onChange(on ? value.filter((x) => x !== l.code) : [...value, l.code]);
            }}
            style={{ border: on ? 0 : '1px dashed #B9B6AD', background: on ? 'var(--yellow)' : 'transparent', fontFamily: on ? 'var(--mono)' : undefined, order: i }}
          >
            {l.label}
            {primary ? ' · primary' : ''}
          </button>
        );
      })}
    </div>
  );
}
