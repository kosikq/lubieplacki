import { useState } from 'preact/hooks';
import { update } from '../core/store';
import { Segmented } from '../ui/common';

export const GOALS = [10, 20, 30, 50];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState(20);

  const finish = () =>
    update((s) => {
      s.profile = { name: name.trim().slice(0, 24) || 'Kursant', goal, createdAt: Date.now() };
    });

  return (
    <div class="screen full">
      <div class="wrap onb">
        {step === 0 ? (
          <>
            <img class="logo" src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" />
            <div>
              <h1>CBZC Trener</h1>
              <p class="lead">Przygotowanie do testu teoretycznego Centralnego Biura Zwalczania Cyberprzestępczości</p>
            </div>
            <div class="card">
              <div class="feat"><span class="f-ico">🎯</span><div><b>300 pytań w 12 działach</b><p>Krótkie sesje po 10 pytań z wyjaśnieniami.</p></div></div>
              <div class="feat"><span class="f-ico">🔁</span><div><b>Mądre powtórki</b><p>Błędne odpowiedzi wracają po ok. 10 pytaniach, aż je opanujesz.</p></div></div>
              <div class="feat"><span class="f-ico">📝</span><div><b>Egzamin próbny</b><p>40 pytań, 40 minut, próg 25 punktów, trzy koła 50/50.</p></div></div>
              <div class="feat"><span class="f-ico">🔥</span><div><b>Streak i osiągnięcia</b><p>Cel dzienny, poziomy i statystyki tego, co musisz poprawić.</p></div></div>
            </div>
            <button class="btn btn-primary" onClick={() => setStep(1)}>Dalej</button>
          </>
        ) : (
          <>
            <div>
              <h1 style={{ textAlign: 'left' }}>Kilka ustawień</h1>
              <p class="muted" style={{ marginTop: 6 }}>Wszystko możesz później zmienić w Ustawieniach.</p>
            </div>
            <div>
              <div class="label-sm">Jak masz na imię?</div>
              <input
                class="field" type="text" value={name} maxLength={24} autoComplete="given-name" enterKeyHint="done"
                placeholder="Imię lub nick" onInput={(e) => setName((e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <div class="label-sm">Cel dzienny (pytania)</div>
              <Segmented label="Cel dzienny" value={goal} onChange={setGoal} options={GOALS.map((g) => ({ value: g, label: String(g) }))} />
              <p class="footnote" style={{ margin: '8px 4px 0' }}>
                Streak rośnie każdego dnia, w którym osiągniesz cel. Za każde 7 dni dostajesz zamrożenie (max 2), które ratuje streak w opuszczony dzień.
              </p>
            </div>
            <button class="btn btn-primary" onClick={finish}>Zaczynamy</button>
            <button class="btn btn-plain" onClick={() => setStep(0)}>Wstecz</button>
          </>
        )}
      </div>
    </div>
  );
}
