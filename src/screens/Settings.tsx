import { useState } from 'preact/hooks';
import { resetAll, update, useAppState } from '../core/store';
import { dayKey } from '../core/dates';
import { checkGoal } from '../core/streak';
import { NavRow, Segmented, Sheet, Switch } from '../ui/common';
import { GOALS } from './Onboarding';

export function Settings() {
  const s = useAppState();
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(s.profile!.name);
  const [reset, setReset] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [help, setHelp] = useState(false);

  return (
    <div class="screen">
      <div class="wrap">
        <header class="large-title"><div class="eyebrow">CBZC Trener</div><h1>Ustawienia</h1></header>

        <div class="label-sm" style={{ marginTop: 6 }}>Profil</div>
        <div class="group">
          <NavRow icon="👤" color="var(--tint)" title="Imię" value={s.profile!.name} onClick={() => { setName(s.profile!.name); setEditName(true); }} />
        </div>

        <div class="label-sm" style={{ marginTop: 24 }}>Egzamin</div>
        <div class="group">
          <label class="row with-icon">
            <span class="icon-tile" style={{ background: 'var(--orange)' }}>📅</span>
            <div class="grow"><div class="title">Data egzaminu</div></div>
            <input
              type="date" class="date-input" aria-label="Data egzaminu" value={s.settings.examDate}
              onChange={(e) => {
                const v = (e.target as HTMLInputElement).value;
                if (/^\d{4}-\d{2}-\d{2}$/.test(v)) update((st) => { st.settings.examDate = v; });
              }}
            />
          </label>
        </div>
        <p class="footnote">Na Starcie widać licznik dni do egzaminu i ile pytań dziennie trzeba opanować.</p>

        <div class="label-sm" style={{ marginTop: 24 }}>Cel dzienny</div>
        <div class="card" style={{ padding: 12 }}>
          <Segmented
            label="Cel dzienny" value={s.profile!.goal}
            onChange={(g) => update((st) => { st.profile!.goal = g; checkGoal(st, dayKey()); })}
            options={GOALS.map((g) => ({ value: g, label: `${g} pytań` }))}
          />
        </div>
        <p class="footnote">Streak rośnie, gdy danego dnia odpowiesz na tyle pytań. Za każde 7 dni streaka dostajesz zamrożenie 🧊 (max 2), które chroni streak w opuszczony dzień. Masz teraz: {s.streak.freezes}.</p>

        <div class="label-sm" style={{ marginTop: 24 }}>Wygląd</div>
        <div class="card" style={{ padding: 12 }}>
          <Segmented
            label="Motyw" value={s.settings.theme}
            onChange={(t) => update((st) => { st.settings.theme = t; })}
            options={[{ value: 'system', label: 'Systemowy' }, { value: 'light', label: 'Jasny' }, { value: 'dark', label: 'Ciemny' }]}
          />
        </div>

        <div class="label-sm" style={{ marginTop: 24 }}>Dźwięk</div>
        <div class="group">
          <div class="row with-icon">
            <span class="icon-tile" style={{ background: 'var(--red)' }}>🔊</span>
            <div class="grow"><div class="title">Dźwięki odpowiedzi</div></div>
            <Switch label="Dźwięki odpowiedzi" on={s.settings.sound} onChange={(v) => update((st) => { st.settings.sound = v; })} />
          </div>
        </div>
        <p class="footnote">Gdy przełącznik wyciszenia w iPhonie jest włączony, dźwięki mogą nie być słyszalne.</p>

        <div class="label-sm" style={{ marginTop: 24 }}>Pomoc</div>
        <div class="group">
          <NavRow icon="📲" color="var(--green)" title="Instalacja na iPhonie" onClick={() => setHelp(true)} />
          <NavRow icon="ℹ️" color="var(--indigo)" title="Wersja" value={`${__APP_VERSION__} · ${__BUILD_DATE__}`} />
          <NavRow icon="📚" color="var(--orange)" title="Baza pytań" value="300 pytań · 12 działów" />
        </div>

        <div class="label-sm" style={{ marginTop: 24 }}>Dane</div>
        <div class="group">
          <button class="row" style={{ justifyContent: 'center', color: 'var(--red)' }} onClick={() => { setConfirmText(''); setReset(true); }}>
            Wyzeruj postęp
          </button>
        </div>
        <p class="footnote">Postęp jest zapisany tylko na tym telefonie. Wyczyszczenie danych Safari usuwa go bezpowrotnie.</p>
      </div>

      {editName && (
        <Sheet title="Imię" onClose={() => setEditName(false)} done={null}>
          <input class="field" value={name} maxLength={24} autoFocus onInput={(e) => setName((e.target as HTMLInputElement).value)} aria-label="Imię" />
          <div class="btn-row" style={{ marginTop: 14 }}>
            <button class="btn btn-gray" onClick={() => setEditName(false)}>Anuluj</button>
            <button class="btn btn-primary" disabled={!name.trim()} onClick={() => { update((st) => { st.profile!.name = name.trim().slice(0, 24); }); setEditName(false); }}>Zapisz</button>
          </div>
        </Sheet>
      )}

      {reset && (
        <Sheet title="Wyzeruj postęp" onClose={() => setReset(false)} done={null}>
          <p style={{ fontSize: 15, marginBottom: 12 }}>
            Usunie to wszystkie statystyki, streak, XP, osiągnięcia i historię egzaminów. Tej operacji nie da się cofnąć. Wpisz <b>RESET</b>, aby potwierdzić.
          </p>
          <input class="field" value={confirmText} autoCapitalize="characters" onInput={(e) => setConfirmText((e.target as HTMLInputElement).value)} aria-label="Potwierdzenie" placeholder="RESET" />
          <div class="btn-row" style={{ marginTop: 14 }}>
            <button class="btn btn-gray" onClick={() => setReset(false)}>Anuluj</button>
            <button class="btn btn-red" disabled={confirmText.trim().toUpperCase() !== 'RESET'} onClick={() => { resetAll(true); setReset(false); }}>Wyzeruj</button>
          </div>
        </Sheet>
      )}

      {help && (
        <Sheet title="Instalacja" onClose={() => setHelp(false)}>
          <div class="card rules">
            <div class="rule"><span>1️⃣</span><span>Otwórz adres aplikacji w <b>Safari</b>.</span></div>
            <div class="rule"><span>2️⃣</span><span>Stuknij przycisk <b>Udostępnij</b> (kwadrat ze strzałką w górę).</span></div>
            <div class="rule"><span>3️⃣</span><span>Wybierz <b>„Do ekranu początkowego”</b> i potwierdź „Dodaj”.</span></div>
            <div class="rule"><span>4️⃣</span><span>Uruchamiaj aplikację z ikony na ekranie. Działa wtedy na pełnym ekranie i offline, a iOS nie kasuje jej danych.</span></div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
