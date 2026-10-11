export interface ModuleInfo {
  title: string; // pełna nazwa do wyświetlania
  short: string; // skrót do wąskich miejsc
  icon: string;
  color: string; // kolor kafelka ikony (styl iOS Settings)
  weight: number; // liczba pytań w egzaminie (suma = 40)
}

// Indeks = pole `mod` w questions.json (kolejność z scripts/build-data.mjs)
export const MODULES: ModuleInfo[] = [
  { title: 'Sieci, TCP/IP, DNS i domeny', short: 'Sieci', icon: '🌐', color: '#0A84FF', weight: 9 },
  { title: 'Windows i Linux', short: 'Windows/Linux', icon: '🖥️', color: '#5E5CE6', weight: 3 },
  { title: 'Android i iOS', short: 'Android/iOS', icon: '📱', color: '#30B0C7', weight: 2 },
  { title: 'Cyberbezpieczeństwo i socjotechnika', short: 'Cyberbezpieczeństwo', icon: '🛡️', color: '#FF3B30', weight: 4 },
  { title: 'Kryptografia i certyfikaty', short: 'Kryptografia', icon: '🔐', color: '#AF52DE', weight: 3 },
  { title: 'OSINT, anonimizacja i metadane', short: 'OSINT', icon: '🔎', color: '#FF9500', weight: 4 },
  { title: 'Kryptowaluty i blockchain', short: 'Kryptowaluty', icon: '₿', color: '#F5A623', weight: 3 },
  { title: 'Bazy danych i SQL', short: 'Bazy danych', icon: '🗄️', color: '#34C759', weight: 3 },
  { title: 'Wirtualizacja', short: 'Wirtualizacja', icon: '🧊', color: '#64D2FF', weight: 2 },
  { title: 'Telekomunikacja', short: 'Telekomunikacja', icon: '📡', color: '#FF2D55', weight: 2 },
  { title: 'Programowanie', short: 'Programowanie', icon: '⌨️', color: '#8E8E93', weight: 2 },
  { title: 'Informatyka ogólna i sprzęt', short: 'Sprzęt i IT', icon: '💾', color: '#A2845E', weight: 3 },
];

export const LEVEL_NAMES = ['Podstawowy', 'Średni', 'Zaawansowany'];
export const LETTERS = ['A', 'B', 'C', 'D'];
