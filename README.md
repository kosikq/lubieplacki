# CBZC Trener — aplikacja na iPhone (PWA)

Nauka do testu teoretycznego CBZC: 300 pytań, sesje po 10 pytań, powtórki błędów,
egzamin próbny (40 pytań / 40 min / próg 25 / 3× 50/50), streak, osiągnięcia, statystyki.
Postęp zapisywany lokalnie na telefonie (localStorage, klucz `cbzc.v1`), bez kont i serwera.

## Komendy
```
npm install
npm run dev          # serwer deweloperski
npm run data         # regeneruje src/data/questions.json z ../baza_pytan/baza_300.json
npm run build        # data + build produkcyjny do dist/
npm test             # testy jednostkowe (Vitest)
npm run test:e2e     # testy E2E (Playwright: WebKit na viewporcie iPhone'a + offline w Chromium); wymaga wcześniejszego build
npm run typecheck
node scripts/make-icons.mjs   # ikony i ekrany startowe (public/icons, public/splash)
```

## Zmiana pytań
Edytuj `../baza_pytan/baza_300.json`, potem `npm run data` i commit `src/data/questions.json`.
Postęp jest powiązany z `id` pytań, więc poprawki treści go nie kasują.
Kolejność odpowiedzi A–D jest stała, bo wyjaśnienia odwołują się do liter.

## Wdrożenie (GitHub Pages)
Push na gałąź `main` uruchamia `.github/workflows/deploy.yml` (testy → build z `BASE_PATH=/<repo>/` → Pages).
W repozytorium: Settings → Pages → Source: **GitHub Actions**.

## Instalacja na iPhonie
Safari → adres aplikacji → Udostępnij → „Do ekranu początkowego”. Uruchamiaj z ikony
(pełny ekran, offline, iOS nie kasuje danych aplikacji z ekranu początkowego).

## Architektura
- `src/core/learn.ts` — dobór pytań: dojrzałe powtórki błędów (wracają po 9–11 pytaniach) →
  kubełki nowe 70% / błędne 15% / do potwierdzenia 10% / opanowane 5%; okno anty-powtórek; różnorodność działów.
- `src/core/streak.ts` — cel dzienny, zamrożenia (1 za 7 dni, max 2), daty lokalne odporne na DST.
- `src/core/exam.ts` — losowanie wg wag działów, timer liczony od znacznika startu, wznawianie.
- `src/core/stats.ts` — agregaty, prognoza wyniku (wygładzona skuteczność × wagi), rekomendacje.
- `src/core/store.ts` — jeden stan w pamięci + zapis do localStorage po każdej zmianie, migracje schematu.
