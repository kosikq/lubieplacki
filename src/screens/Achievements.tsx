import { useState } from 'preact/hooks';
import { useAppState } from '../core/store';
import { ACHIEVEMENTS, type Achievement } from '../core/achievements';
import { Bar, Sheet } from '../ui/common';

export function Achievements() {
  const s = useAppState();
  const [open, setOpen] = useState<Achievement | null>(null);
  const unlocked = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
  const groups = [...new Set(ACHIEVEMENTS.map((a) => a.group))];

  return (
    <div class="screen">
      <div class="wrap">
        <header class="large-title"><div class="eyebrow">{unlocked} z {ACHIEVEMENTS.length} odblokowanych</div><h1>Osiągnięcia</h1></header>
        <div class="card" style={{ marginBottom: 6 }}>
          <Bar pct={unlocked / ACHIEVEMENTS.length} color="var(--orange)" />
        </div>
        {groups.map((g) => (
          <>
            <div class="section-h"><h2>{g}</h2></div>
            <div class="ach-grid">
              {ACHIEVEMENTS.filter((a) => a.group === g).map((a) => {
                const got = !!s.achievements[a.id];
                const [p, t] = a.progress(s);
                return (
                  <button class={`ach${got ? '' : ' locked'}`} onClick={() => setOpen(a)} aria-label={`${a.title}${got ? ', odblokowane' : ''}`}>
                    <span class="a-ico">{a.icon}</span>
                    <span class="a-t">{a.title}</span>
                    {!got && <Bar pct={p / t} thin color="var(--orange)" />}
                  </button>
                );
              })}
            </div>
          </>
        ))}
      </div>
      {open && (
        <Sheet title="Osiągnięcie" onClose={() => setOpen(null)}>
          {(() => {
            const got = s.achievements[open.id];
            const [p, t] = open.progress(s);
            return (
              <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
                <div class={`ach${got ? '' : ' locked'}`} style={{ boxShadow: 'none', background: 'transparent' }}>
                  <span class="a-ico" style={{ width: 96, height: 96, fontSize: 56 }}>{open.icon}</span>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{open.title}</h3>
                <p class="muted" style={{ marginTop: 6 }}>{open.desc}</p>
                {got ? (
                  <p style={{ marginTop: 14, color: 'var(--green)', fontWeight: 600 }}>
                    Odblokowane {new Date(got).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                ) : (
                  <div style={{ marginTop: 16 }}>
                    <Bar pct={p / t} color="var(--orange)" />
                    <p class="muted tnum" style={{ marginTop: 6, fontSize: 14 }}>{Math.min(p, t)} / {t}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </Sheet>
      )}
    </div>
  );
}
