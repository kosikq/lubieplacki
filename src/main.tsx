import { render } from 'preact';
import './styles.css';
import { App } from './App';
import { initStore } from './core/store';
import { unlockAudio } from './core/sound';
import { QUESTIONS } from './data/questions';

initStore();
(window as any).__cbzc.questions = QUESTIONS;

// iOS: kontekst audio można uruchomić tylko w geście użytkownika
window.addEventListener('touchend', unlockAudio, { once: true, passive: true });
window.addEventListener('click', unlockAudio, { once: true });
// blokada gestu "pinch-zoom" w Safari (meta viewport nie zawsze wystarcza)
document.addEventListener('gesturestart', (e) => e.preventDefault());

// iOS Safari: po schowaniu klawiatury strona potrafi zostać przewinięta, a wtedy obszary dotyku
// elementów `position: fixed` rozjeżdżają się z tym, co widać (stuknięcie w A trafia w B).
// Okno aplikacji nigdy nie powinno być przewinięte — przewijają się tylko kontenery w środku.
const typing = () => {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
};
const resetWindowScroll = () => {
  if (typing()) return;
  if (window.scrollX || window.scrollY || document.documentElement.scrollTop || document.body.scrollTop) {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
};
document.addEventListener('focusout', () => {
  setTimeout(resetWindowScroll, 50);
  setTimeout(resetWindowScroll, 350);
});
window.addEventListener('scroll', resetWindowScroll, { passive: true });
window.visualViewport?.addEventListener('resize', resetWindowScroll);
window.visualViewport?.addEventListener('scroll', resetWindowScroll);
document.addEventListener('visibilitychange', resetWindowScroll);

render(<App />, document.getElementById('app')!);
