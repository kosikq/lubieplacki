import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { IconChevron } from './icons';

export function Ring({ size = 96, stroke = 10, pct, color = 'var(--tint)', children }: {
  size?: number; stroke?: number; pct: number; color?: string; children?: ComponentChildren;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <div class="ring-box" style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill)" stroke-width={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} stroke-width={stroke} stroke-linecap="round"
          stroke-dasharray={c} stroke-dashoffset={c * (1 - p)} style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      {children && <div class="ring-center">{children}</div>}
    </div>
  );
}

export function Bar({ pct, color, thin }: { pct: number; color?: string; thin?: boolean }) {
  return (
    <div class={`bar${thin ? ' thin' : ''}`}>
      <i style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%`, background: color }} />
    </div>
  );
}

export function Sheet({ title, onClose, children, done = 'Gotowe' }: {
  title?: string; onClose: () => void; children: ComponentChildren; done?: string | null;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div class="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div class="grabber" />
        {(title || done) && (
          <div class="sheet-head">
            <span class="spacer" />
            <h3>{title}</h3>
            {done ? <button class="done" onClick={onClose}>{done}</button> : <span class="spacer" />}
          </div>
        )}
        <div class="sheet-body">{children}</div>
      </div>
    </div>
  );
}

/** Arkusz potwierdzenia w stylu iOS action sheet. */
export function Confirm({ title, text, actions, onCancel }: {
  title: string; text?: string; onCancel: () => void;
  actions: { label: string; kind?: 'primary' | 'danger' | 'gray'; onClick: () => void }[];
}) {
  return (
    <Sheet onClose={onCancel} done={null}>
      <div style={{ textAlign: 'center', padding: '6px 4px 16px' }}>
        <h3 style={{ fontSize: 19, fontWeight: 700 }}>{title}</h3>
        {text && <p class="muted" style={{ fontSize: 15, marginTop: 6 }}>{text}</p>}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {actions.map((a) => (
          <button class={`btn ${a.kind === 'danger' ? 'btn-red' : a.kind === 'gray' ? 'btn-gray' : 'btn-primary'}`} onClick={a.onClick}>
            {a.label}
          </button>
        ))}
        <button class="btn btn-plain" onClick={onCancel}>Anuluj</button>
      </div>
    </Sheet>
  );
}

export function NavRow({ icon, color, title, sub, value, onClick, children }: {
  icon?: string; color?: string; title: ComponentChildren; sub?: ComponentChildren; value?: ComponentChildren;
  onClick?: () => void; children?: ComponentChildren;
}) {
  const inner = (
    <>
      {icon && <span class="icon-tile" style={{ background: color }}>{icon}</span>}
      <div class="grow">
        <div class="title">{title}</div>
        {sub && <div class="sub">{sub}</div>}
        {children}
      </div>
      {value !== undefined && <span class="value tnum">{value}</span>}
      {onClick && <span class="chev"><IconChevron /></span>}
    </>
  );
  const cls = `row${icon ? ' with-icon' : ''}`;
  return onClick ? <button class={cls} onClick={onClick}>{inner}</button> : <div class={cls}>{inner}</div>;
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label?: string;
}) {
  return (
    <div class="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button role="radio" aria-checked={o.value === value} class={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} class={`switch${on ? ' on' : ''}`} onClick={() => onChange(!on)} />;
}

export const pct = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`);

export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  if (d >= 2 && d <= 4 && (t < 12 || t > 14)) return few;
  return many;
}
