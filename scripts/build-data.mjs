// Generuje src/data/questions.json z kanonicznej bazy ../baza_pytan/baza_300.json.
// Uruchamiane automatycznie przed `npm run build` (oraz ręcznie: `npm run data`).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '../../baza_pytan/baza_300.json');
const OUT = resolve(here, '../src/data/questions.json');

// Kolejność musi odpowiadać src/data/modules.ts
const MODULE_KEYS = [
  'Sieci / Internet / TCP-IP / IPv4-IPv6 / DNS / domeny / WHOIS',
  'Systemy operacyjne / Windows i Linux',
  'Systemy operacyjne / Android i iOS',
  'Cyberbezpieczenstwo i socjotechnika',
  'Kryptografia / szyfrowanie / certyfikaty',
  'OSINT / anonimizacja / metadane',
  'Kryptowaluty / blockchain',
  'Bazy danych / SQL',
  'Wirtualizacja',
  'Telekomunikacja',
  'Programowanie',
  'Informatyka ogolna / sprzet',
];
const LEVELS = { PODSTAWOWY: 0, 'ŚREDNI': 1, SREDNI: 1, ZAAWANSOWANY: 2 };
const LETTERS = ['A', 'B', 'C', 'D'];

// "Cyberbezpieczeństwo / Socjotechnika - phishing" -> "Socjotechnika"
function topicOf(category, moduleIdx) {
  const parts = category.split(' / ');
  if (parts.length < 2) return null; // kategoria = cały moduł
  const rest = parts.slice(1).join(' / ');
  const t = rest.split(' - ')[0].trim();
  // moduły systemowe mają w kategorii tylko nazwę platformy
  if (moduleIdx === 1 || moduleIdx === 2) return null;
  return TOPIC_MERGE[t] || t;
}

// Scalenie tematów z 1-2 pytaniami w sensowne grupy (do statystyk per temat)
const TOPIC_MERGE = {
  'Prywatność vs anonimowość vs pseudonimizacja': 'Anonimizacja',
  'Pojęcia podstawowe': 'Model relacyjny',
  Klucze: 'Model relacyjny',
  Indeksy: 'Model relacyjny',
  Normalizacja: 'Model relacyjny',
  Transakcje: 'Model relacyjny',
  'NoSQL vs SQL': 'NoSQL',
  'Maszyny wirtualne': 'Maszyny wirtualne',
  'Hypervisor typu 1': 'Hypervisory',
  'Hypervisor typu 2': 'Hypervisory',
  Hypervisor: 'Hypervisory',
  Snapshot: 'Maszyny wirtualne',
  'Virtual switch i sieć wirtualna': 'Maszyny wirtualne',
  'Izolacja zasobów': 'Kontenery i Docker',
  Kontenery: 'Kontenery i Docker',
  'VM vs kontener': 'Kontenery i Docker',
  Docker: 'Kontenery i Docker',
  Zastosowania: 'Maszyny wirtualne',
  'Telekomunikacja przewodowa i bezprzewodowa': 'Łączność przewodowa i radiowa',
  Bluetooth: 'Łączność przewodowa i radiowa',
  'Komunikacja radiowa': 'Łączność przewodowa i radiowa',
  'Procesy i wątki': 'Procesor, pamięć i procesy',
  'Pamięć wirtualna': 'Procesor, pamięć i procesy',
  'Wielozadaniowość i planowanie procesów': 'Procesor, pamięć i procesy',
  'Hierarchia pamięci': 'Procesor, pamięć i procesy',
  'Architektura procesorów': 'Procesor, pamięć i procesy',
  Obliczenia: 'Jednostki danych',
};

const raw = JSON.parse(readFileSync(SRC, 'utf8'));
const ids = new Set();
const out = raw.map((q) => {
  const mod = MODULE_KEYS.indexOf(q.module);
  if (mod < 0) throw new Error(`Nieznany moduł: ${q.module} (${q.id})`);
  if (!(q.level in LEVELS)) throw new Error(`Nieznany poziom: ${q.level} (${q.id})`);
  if (ids.has(q.id)) throw new Error(`Duplikat id ${q.id}`);
  ids.add(q.id);
  const correct = LETTERS.indexOf(q.correct);
  if (correct < 0) throw new Error(`Zła litera ${q.correct} (${q.id})`);
  const options = LETTERS.map((l) => {
    const v = q.options[l];
    if (typeof v !== 'string' || !v.trim()) throw new Error(`Brak opcji ${l} (${q.id})`);
    return v.trim();
  });
  if (new Set(options).size !== 4) throw new Error(`Powtórzona opcja (${q.id})`);
  return {
    id: q.id,
    mod,
    topic: topicOf(q.category, mod),
    level: LEVELS[q.level],
    text: q.question.trim(),
    options,
    correct,
    expl: q.explanation.trim(),
    source: (q.source || '').trim(),
  };
});

writeFileSync(OUT, JSON.stringify(out));
const per = MODULE_KEYS.map((_, i) => out.filter((q) => q.mod === i).length);
console.log(`questions.json: ${out.length} pytań, per moduł: ${per.join(',')}`);
