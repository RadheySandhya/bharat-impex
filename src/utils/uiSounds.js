// ============================================================
// UI SOUND EFFECTS — synthesized with Web Audio (no audio files)
// menu change → soft "pop" · button → short click · delete → low tick · save → chime
// Mute state is remembered per browser (localStorage 'bi_sound_off').
// ============================================================

let ctx = null;
const KEY = 'bi_sound_off';

export const isSoundOn = () => {
  try { return localStorage.getItem(KEY) !== '1'; } catch (e) { return true; }
};
export const setSoundOn = (on) => {
  try { localStorage.setItem(KEY, on ? '0' : '1'); } catch (e) { /* ignore */ }
  window.dispatchEvent(new Event('bi:sound'));
};

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// one short enveloped tone
function tone(ac, { freq, to, dur, type = 'sine', vol = 0.12, delay = 0 }) {
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function playSound(kind = 'click') {
  if (!isSoundOn()) return;
  const ac = audio();
  if (!ac) return;
  switch (kind) {
    case 'menu':
      tone(ac, { freq: 520, to: 880, dur: 0.09, vol: 0.10 });
      tone(ac, { freq: 1040, dur: 0.07, vol: 0.05, delay: 0.05 });
      break;
    case 'delete':
      tone(ac, { freq: 300, to: 160, dur: 0.12, type: 'triangle', vol: 0.12 });
      break;
    case 'save':
      tone(ac, { freq: 660, dur: 0.09, vol: 0.09 });
      tone(ac, { freq: 990, dur: 0.14, vol: 0.09, delay: 0.08 });
      break;
    default: // click
      tone(ac, { freq: 1500, to: 900, dur: 0.045, type: 'triangle', vol: 0.08 });
  }
}

// Global listener: every button / link / tab gets a sound, no per-component changes needed
export function initUiSounds() {
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest?.('button, a[href], [role="button"], [role="tab"], select, input[type="checkbox"], input[type="radio"], summary');
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('data-no-sound')) return;
    const label = `${el.textContent || ''} ${el.getAttribute('title') || ''} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
    let kind = 'click';
    if (el.closest('aside nav, nav, [data-sound="menu"]')) kind = 'menu';
    if (/\b(delete|remove|trash)\b/.test(label)) kind = 'delete';
    else if (/\b(save|submit|confirm|approve|import)\b/.test(label)) kind = 'save';
    playSound(kind);
  }, { capture: true, passive: true });
}
