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

render(<App />, document.getElementById('app')!);
