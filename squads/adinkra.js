// Adinkra symbols drawn as vector strokes on canvas (no AI art: the shapes must stay exact).
// Each draws centred on (0,0) inside a box of size s. Call inside g.save()/g.restore() with a stroke style set.
// Meanings (for the in-game codex):
//   Akofena: crossed state swords, valour and heroism.  Akoben: war horn, readiness and the call to arms.
//   Dwennimmen: ram's horns, humility together with strength.  Sankofa: go back and fetch it, learning from the past.
//   Nkyinkyim: twisting path, initiative and versatility.
export const ADINKRA = {
  akofena: { name: 'Akofena', meaning: 'Crossed swords: valour and heroism' },
  akoben: { name: 'Akoben', meaning: 'War horn: readiness, the call to arms' },
  dwennimmen: { name: 'Dwennimmen', meaning: 'Ram\'s horns: humility with strength' },
  sankofa: { name: 'Sankofa', meaning: 'Go back and fetch it: learn from the past' },
  nkyinkyim: { name: 'Nkyinkyim', meaning: 'Twisting path: initiative, versatility' },
};

function spiral(g, cx, cy, r, turns, dir, start) {
  g.beginPath();
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = start + dir * t * turns * Math.PI * 2, rr = r * (1 - t * 0.85);
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
}

export function drawAdinkra(g, id, s) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  const w = s * 0.07; g.lineWidth = w;
  switch (id) {
    case 'akofena': {
      for (const d of [-1, 1]) {
        g.save(); g.rotate(d * 0.62);
        // curved blade with a crescent tip
        g.beginPath(); g.moveTo(0, s * 0.22); g.quadraticCurveTo(d * s * 0.08, -s * 0.08, 0, -s * 0.36); g.stroke();
        g.beginPath(); g.arc(0, -s * 0.36, s * 0.07, Math.PI * 0.1, Math.PI * 0.9, true); g.stroke();
        // dumbbell hilt
        g.beginPath(); g.moveTo(0, s * 0.22); g.lineTo(0, s * 0.42); g.stroke();
        g.beginPath(); g.arc(0, s * 0.25, s * 0.045, 0, 6.28); g.stroke();
        g.beginPath(); g.arc(0, s * 0.43, s * 0.045, 0, 6.28); g.stroke();
        g.restore();
      }
      g.beginPath(); g.arc(0, 0, s * 0.1, 0, 6.28); g.stroke();
      break;
    }
    case 'akoben': {
      // horn: a tapering crescent with the mouthpiece rings
      g.beginPath(); g.arc(0, s * 0.05, s * 0.34, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      g.beginPath(); g.arc(0, s * 0.05, s * 0.2, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
      g.beginPath(); g.moveTo(-s * 0.34, s * 0.02); g.lineTo(-s * 0.2, s * 0.02); g.stroke();
      g.beginPath(); g.moveTo(s * 0.34, s * 0.02); g.lineTo(s * 0.2, s * 0.02); g.stroke();
      for (const r of [0.08, 0.16]) { g.beginPath(); g.arc(0, s * 0.22, s * r, 0, 6.28); g.stroke(); }
      break;
    }
    case 'dwennimmen': {
      // two pairs of ram's horns curling outward, mirrored on both axes
      g.beginPath(); g.moveTo(0, -s * 0.42); g.lineTo(0, s * 0.42); g.stroke();
      for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
        g.beginPath(); g.moveTo(0, dy * s * 0.06);
        g.bezierCurveTo(dx * s * 0.1, dy * s * 0.42, dx * s * 0.42, dy * s * 0.42, dx * s * 0.4, dy * s * 0.2); g.stroke();
        spiral(g, dx * s * 0.28, dy * s * 0.2, s * 0.12, 0.85, -dx * dy, dy > 0 ? 0 : Math.PI);
      }
      break;
    }
    case 'sankofa': {
      // heart form with inward spirals at the top and a tail at the bottom
      g.beginPath();
      g.moveTo(0, s * 0.36);
      g.bezierCurveTo(-s * 0.46, s * 0.04, -s * 0.36, -s * 0.36, -s * 0.12, -s * 0.24);
      g.moveTo(0, s * 0.36);
      g.bezierCurveTo(s * 0.46, s * 0.04, s * 0.36, -s * 0.36, s * 0.12, -s * 0.24);
      g.stroke();
      spiral(g, -s * 0.07, -s * 0.16, s * 0.1, 1.1, 1, -Math.PI / 2);
      spiral(g, s * 0.07, -s * 0.16, s * 0.1, 1.1, -1, -Math.PI / 2);
      g.beginPath(); g.moveTo(0, s * 0.36); g.lineTo(0, s * 0.46); g.stroke();
      for (const d of [-1, 1]) { g.beginPath(); g.arc(d * s * 0.06, s * 0.46, s * 0.06, d > 0 ? Math.PI : 0, d > 0 ? Math.PI * 2 : Math.PI, d < 0); g.stroke(); }
      break;
    }
    case 'nkyinkyim': {
      // the twisting path: a tall zigzag with rounded turns
      g.beginPath(); const n = 5;
      for (let i = 0; i <= n; i++) { const y = -s * 0.42 + (i / n) * s * 0.84, x = (i % 2 ? 1 : -1) * s * 0.22; i ? g.quadraticCurveTo((i % 2 ? -1 : 1) * s * 0.02, y - s * 0.084, x, y) : g.moveTo(x, y); }
      g.stroke();
      g.beginPath(); for (let i = 0; i <= n; i++) { const y = -s * 0.42 + (i / n) * s * 0.84, x = (i % 2 ? 1 : -1) * s * 0.22 + (i % 2 ? -1 : 1) * s * 0.1; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      break;
    }
  }
}
