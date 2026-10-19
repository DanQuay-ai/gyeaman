// Tiny synthesized sound effects (WebAudio, starts after the first tap).
let ac = null;
export function unlockAudio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } }
function tone(f, d, type = 'triangle', v = 0.1, slide = 1, delay = 0) {
  if (!ac) return;
  const t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if (slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + d);
  g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + d);
}
export function sfx(k) {
  switch (k) {
    case 'click': return tone(660, 0.06, 'square', 0.04);
    case 'step': return tone(180, 0.06, 'triangle', 0.06);
    case 'hit': tone(140, 0.18, 'sawtooth', 0.1, 0.5); return tone(70, 0.22, 'sine', 0.16, 0.6);
    case 'crit': tone(220, 0.25, 'sawtooth', 0.12, 0.3); return tone(55, 0.35, 'sine', 0.22, 0.5);
    case 'spell': return tone(520, 0.3, 'sine', 0.08, 2);
    case 'heal': tone(523, 0.16, 'triangle', 0.08); return tone(784, 0.2, 'triangle', 0.08, 1, 0.1);
    case 'die': return tone(300, 0.4, 'square', 0.06, 0.25);
    case 'win': [523, 659, 784].forEach((f, i) => tone(f, 0.2, 'triangle', 0.09, 1, i * 0.09)); return;
    case 'level': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.28, 'triangle', 0.1, 1, i * 0.1)); return;
    case 'lose': [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'sine', 0.09, 1, i * 0.15)); return;
    case 'coin': tone(988, 0.08, 'square', 0.05); return tone(1319, 0.12, 'square', 0.05, 1, 0.06);
    case 'swing': return tone(900, 0.12, 'sawtooth', 0.04, 0.3);
    case 'hurt': tone(110, 0.2, 'square', 0.08, 0.6); return tone(60, 0.25, 'sine', 0.14, 0.7);
    case 'zap': tone(1400, 0.15, 'sawtooth', 0.05, 0.2); return tone(700, 0.2, 'square', 0.04, 0.3, 0.05);
    case 'equip': return tone(330, 0.12, 'triangle', 0.08, 1.5);
  }
}
