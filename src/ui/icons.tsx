// Ikony w stylu SF Symbols (proste ścieżki SVG, kolor = currentColor).
type P = { size?: number };

const svg = (size: number, children: preact.ComponentChildren, fill = false) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const IconHome = ({ size = 26 }: P) => svg(size, <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6.5H9V21H4.5a1 1 0 0 1-1-1z" />);
export const IconChart = ({ size = 26 }: P) =>
  svg(size, <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M21.5 20H2.5" /></>);
export const IconList = ({ size = 26 }: P) =>
  svg(size, <><path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>);
export const IconTrophy = ({ size = 26 }: P) =>
  svg(size, <><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4a3 3 0 0 0 3 4" /><path d="M17 6h3a3 3 0 0 1-3 4" /><path d="M12 14v4" /><path d="M8 21h8" /><path d="M9.5 18h5" /></>);
export const IconGear = ({ size = 26 }: P) =>
  svg(size, <><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>);
export const IconClose = ({ size = 18 }: P) => svg(size, <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>);
export const IconChevron = ({ size = 16 }: P) => svg(size, <path d="m9 5 7 7-7 7" />);
export const IconLeft = ({ size = 22 }: P) => svg(size, <path d="m15 5-7 7 7 7" />);
export const IconRight = ({ size = 22 }: P) => svg(size, <path d="m9 5 7 7-7 7" />);
export const IconSearch = ({ size = 17 }: P) => svg(size, <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>);
export const IconFlag = ({ size = 20 }: P) => svg(size, <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>);
export const IconGrid = ({ size = 18 }: P) =>
  svg(size, <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>);
export const IconShare = ({ size = 18 }: P) => svg(size, <><path d="M12 3v12" /><path d="m8 7 4-4 4 4" /><path d="M6 11H5v10h14V11h-1" /></>);
