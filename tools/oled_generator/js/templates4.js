// templates4.js — Cool dashboards, clocks, games & FX (smartwatch-style faces).
// These build on the same primitives used elsewhere and register into window.TEMPLATES.
(function () {
  const mk = (W, H) => Array.from({ length: H }, () => new Uint8Array(W));
  const setPx = (f, x, y, W, H, v = 1) => {
    const ix = Math.round(x), iy = Math.round(y);
    if (ix >= 0 && ix < W && iy >= 0 && iy < H) f[iy][ix] = v;
  };
  function line(f, x0, y0, x1, y1, W, H) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, er = dx - dy;
    for (;;) { setPx(f, x0, y0, W, H); if (x0 === x1 && y0 === y1) break; let e = 2 * er; if (e > -dy) { er -= dy; x0 += sx; } if (e < dx) { er += dx; y0 += sy; } }
  }
  function outRect(f, x, y, w, h, W, H) {
    for (let i = 0; i < w; i++) { setPx(f, x + i, y, W, H); setPx(f, x + i, y + h - 1, W, H); }
    for (let i = 0; i < h; i++) { setPx(f, x, y + i, W, H); setPx(f, x + w - 1, y + i, W, H); }
  }
  function fillRect(f, x, y, w, h, W, H) {
    for (let iy = y; iy < y + h; iy++) for (let ix = x; ix < x + w; ix++) setPx(f, ix, iy, W, H);
  }
  function roundRect(f, x, y, w, h, W, H) {
    for (let i = 1; i < w - 1; i++) { setPx(f, x + i, y, W, H); setPx(f, x + i, y + h - 1, W, H); }
    for (let i = 1; i < h - 1; i++) { setPx(f, x, y + i, W, H); setPx(f, x + w - 1, y + i, W, H); }
  }
  function circ(f, cx, cy, r, W, H) {
    let x = r, y = 0, e = 0;
    while (x >= y) {
      [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]].forEach(([a, b]) => setPx(f, cx + a, cy + b, W, H));
      y++; e += 2 * y + 1; if (2 * (e - x) + 1 > 0) { x--; e += 1 - 2 * x; }
    }
  }
  function fillCirc(f, cx, cy, r, W, H) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) setPx(f, cx + dx, cy + dy, W, H);
  }
  const font = () => window.FONTS['5x7'];
  const fontBold = () => window.FONTS['5x7-bold'] || window.FONTS['5x7'];
  const fontSmall = () => window.FONTS['3x5'] || window.FONTS['5x7'];
  const tw = (t, f, s = 1) => window.measureText(t, f, s);
  const text = (fr, t, x, y, f, W, H, s = 1) => window.renderTextToFrame(fr, t, Math.round(x), Math.round(y), f, 1, W, H, s);

  // 7-segment style big digit drawer (scalable, great for clocks).
  // segs: a b c d e f g  →  top, tr, br, bottom, bl, tl, mid
  const SEG = {
    '0': [1,1,1,1,1,1,0], '1': [0,1,1,0,0,0,0], '2': [1,1,0,1,1,0,1], '3': [1,1,1,1,0,0,1],
    '4': [0,1,1,0,0,1,1], '5': [1,0,1,1,0,1,1], '6': [1,0,1,1,1,1,1], '7': [1,1,1,0,0,0,0],
    '8': [1,1,1,1,1,1,1], '9': [1,1,1,1,0,1,1], '-': [0,0,0,0,0,0,1], ' ': [0,0,0,0,0,0,0]
  };
  function drawDigit(f, ch, x, y, w, h, W, H) {
    const s = SEG[ch]; if (!s) return;
    const t = Math.max(2, Math.round(w / 5)); // stroke thickness
    const mid = y + Math.floor(h / 2);
    if (s[0]) fillRect(f, x + t, y, w - 2 * t, t, W, H);                      // a top
    if (s[3]) fillRect(f, x + t, y + h - t, w - 2 * t, t, W, H);              // d bottom
    if (s[6]) fillRect(f, x + t, mid - Math.floor(t / 2), w - 2 * t, t, W, H);// g mid
    if (s[5]) fillRect(f, x, y + t, t, mid - y - t, W, H);                    // f top-left
    if (s[1]) fillRect(f, x + w - t, y + t, t, mid - y - t, W, H);            // b top-right
    if (s[4]) fillRect(f, x, mid, t, y + h - mid - t, W, H);                  // e bot-left
    if (s[2]) fillRect(f, x + w - t, mid, t, y + h - mid - t, W, H);          // c bot-right
  }
  function drawSegTime(f, str, x, y, dw, dh, W, H) {
    let cx = x;
    for (const ch of str) {
      if (ch === ':') {
        const mid = y + Math.floor(dh / 2);
        fillCirc(f, cx + 2, mid - Math.floor(dh / 4), 1, W, H);
        fillCirc(f, cx + 2, mid + Math.floor(dh / 4), 1, W, H);
        cx += 6;
      } else {
        drawDigit(f, ch, cx, y, dw, dh, W, H);
        cx += dw + 4;
      }
    }
    return cx;
  }

  const T = [];

  // ── 1. Digital Clock (ticking 7-seg, date below) ───────────────────────────
  T.push({
    id: 'digi-clock', icon: '🕐', name: 'Digital Clock',
    desc: 'Big 7-segment ticking clock with date', fps: 1,
    gen: (W, H) => {
      const frames = [];
      const times = ['10:08', '10:09', '10:10', '10:11'];
      const dh = Math.min(28, H - 22), dw = Math.round(dh * 0.6);
      const timeW = 4 * (dw + 4) + 6;
      const x0 = Math.floor((W - timeW) / 2), y0 = 4;
      times.forEach((tm, i) => {
        const f = mk(W, H);
        drawSegTime(f, tm, x0, y0, dw, dh, W, H);
        const date = 'MON 08 MAY';
        text(f, date, (W - tw(date, font())) / 2, y0 + dh + 6, font(), W, H);
        frames.push(f);
      });
      return frames;
    }
  });

  // ── 2. Smartwatch Dashboard (time + weather + battery, Lopaka-style) ────────
  T.push({
    id: 'watch-dash', icon: '⌚', name: 'Smartwatch Face',
    desc: 'Time, date, temperature and battery dashboard', fps: 2,
    gen: (W, H) => {
      const frames = [];
      for (let i = 0; i < 4; i++) {
        const f = mk(W, H);
        // top status bar
        line(f, 0, 9, W - 1, 9, W, H);
        text(f, '78%', 2, 1, fontSmall(), W, H);
        // battery glyph top-right
        outRect(f, W - 16, 1, 12, 6, W, H); fillRect(f, W - 4, 2, 2, 4, W, H);
        fillRect(f, W - 15, 2, 8, 4, W, H);
        // big time
        const tm = (i % 2 === 0) ? '20:35' : '20 35';
        const dh = 22, dw = 12;
        const timeW = 4 * (dw + 4) + 6;
        drawSegTime(f, tm, Math.floor((W - timeW) / 2), 13, dw, dh, W, H);
        // bottom info row: date | temp
        line(f, 0, H - 12, W - 1, H - 12, W, H);
        text(f, 'WED 08', 2, H - 9, fontSmall(), W, H);
        text(f, '25C', W - tw('25C', fontSmall()) - 2, H - 9, fontSmall(), W, H);
        frames.push(f);
      }
      return frames;
    }
  });

  // ── 3. Analog Clock (sweeping hands) ────────────────────────────────────────
  T.push({
    id: 'analog-clock', icon: '⏰', name: 'Analog Clock',
    desc: 'Round clock face with sweeping second hand', fps: 8,
    gen: (W, H) => {
      const frames = [];
      const cx = Math.floor(W / 2), cy = Math.floor(H / 2), r = Math.floor(Math.min(W, H) / 2) - 2;
      for (let i = 0; i < 12; i++) {
        const f = mk(W, H);
        circ(f, cx, cy, r, W, H);
        for (let h = 0; h < 12; h++) {
          const a = h / 12 * Math.PI * 2 - Math.PI / 2;
          line(f, cx + (r - 3) * Math.cos(a), cy + (r - 3) * Math.sin(a), cx + r * Math.cos(a), cy + r * Math.sin(a), W, H);
        }
        const sa = i / 12 * Math.PI * 2 - Math.PI / 2;       // second hand
        const ma = i / 60 * Math.PI * 2 - Math.PI / 2;       // minute (slow)
        const ha = i / 144 * Math.PI * 2 - Math.PI / 2;      // hour (slower)
        line(f, cx, cy, cx + (r - 4) * Math.cos(sa), cy + (r - 4) * Math.sin(sa), W, H);
        line(f, cx, cy, cx + (r - 8) * Math.cos(ma), cy + (r - 8) * Math.sin(ma), W, H);
        line(f, cx, cy, cx + (r - 14) * Math.cos(ha), cy + (r - 14) * Math.sin(ha), W, H);
        fillCirc(f, cx, cy, 2, W, H);
        frames.push(f);
      }
      return frames;
    }
  });

  // ── 4. Audio Equalizer (bouncing bars) ──────────────────────────────────────
  T.push({
    id: 'equalizer', icon: '🎚️', name: 'Audio Equalizer',
    desc: 'Music visualizer with bouncing bars', fps: 12,
    gen: (W, H) => {
      const frames = [];
      const bars = Math.min(16, Math.floor(W / 6));
      const bw = 4, gap = Math.floor((W - bars * bw) / (bars + 1));
      const phase = bars > 0 ? bars : 1;
      for (let i = 0; i < 16; i++) {
        const f = mk(W, H);
        for (let b = 0; b < bars; b++) {
          const hgt = Math.round((0.5 + 0.5 * Math.sin(i * 0.6 + b * 0.9)) * (H - 6)) + 2;
          const x = gap + b * (bw + gap);
          fillRect(f, x, H - hgt, bw, hgt, W, H);
        }
        line(f, 0, H - 1, W - 1, H - 1, W, H);
        frames.push(f);
      }
      return frames;
    }
  });

  // ── 5. System Monitor (CPU / RAM / NET bars) ────────────────────────────────
  T.push({
    id: 'sys-monitor', icon: '📊', name: 'System Monitor',
    desc: 'CPU, RAM and NET usage gauges', fps: 4,
    gen: (W, H) => {
      const frames = [];
      const labels = ['CPU', 'RAM', 'NET'];
      const rowH = Math.floor(H / 3);
      for (let i = 0; i < 8; i++) {
        const f = mk(W, H);
        labels.forEach((lb, r) => {
          const y = r * rowH + Math.floor((rowH - 7) / 2);
          text(f, lb, 1, y, fontSmall(), W, H);
          const bx = 22, bw = W - bx - 4, bh = 7, by = r * rowH + Math.floor((rowH - bh) / 2);
          outRect(f, bx, by, bw, bh, W, H);
          const pct = 0.5 + 0.45 * Math.sin(i * 0.7 + r * 1.4);
          fillRect(f, bx + 1, by + 1, Math.round((bw - 2) * pct), bh - 2, W, H);
        });
        frames.push(f);
      }
      return frames;
    }
  });

  // ── 6. Loading Bar (progress 0→100%) ────────────────────────────────────────
  T.push({
    id: 'progress-bar', icon: '⏳', name: 'Loading Bar',
    desc: 'Progress bar filling with percentage', fps: 10,
    gen: (W, H) => {
      const frames = [];
      const bw = W - 16, bh = 12, bx = 8, by = Math.floor(H / 2) - 4;
      for (let i = 0; i <= 20; i++) {
        const f = mk(W, H);
        const pct = i / 20;
        outRect(f, bx, by, bw, bh, W, H);
        fillRect(f, bx + 2, by + 2, Math.round((bw - 4) * pct), bh - 4, W, H);
        const lbl = Math.round(pct * 100) + '%';
        text(f, lbl, (W - tw(lbl, font())) / 2, by - 11, font(), W, H);
        text(f, 'LOADING', (W - tw('LOADING', fontSmall())) / 2, by + bh + 4, fontSmall(), W, H);
        frames.push(f);
      }
      return frames;
    }
  });

  // ── 7. Pong (paddles + bouncing ball) ───────────────────────────────────────
  T.push({
    id: 'pong-game', icon: '🏓', name: 'Pong Game',
    desc: 'Classic Pong with auto-playing paddles', fps: 20,
    gen: (W, H) => {
      const frames = [];
      let x = W / 2, y = H / 2, vx = 3, vy = 2;
      const pad = 10, padW = 2;
      for (let i = 0; i < 40; i++) {
        const f = mk(W, H);
        // center dashed line
        for (let dy = 0; dy < H; dy += 4) setPx(f, Math.floor(W / 2), dy, W, H);
        x += vx; y += vy;
        if (y <= 2 || y >= H - 3) vy = -vy;
        if (x <= 4 || x >= W - 5) vx = -vx;
        const lpY = Math.max(0, Math.min(H - pad, y - pad / 2));
        const rpY = Math.max(0, Math.min(H - pad, y - pad / 2));
        fillRect(f, 2, lpY, padW, pad, W, H);
        fillRect(f, W - 4, rpY, padW, pad, W, H);
        fillCirc(f, x, y, 2, W, H);
        // scores
        text(f, '07', W / 2 - 16, 1, fontSmall(), W, H);
        text(f, '05', W / 2 + 6, 1, fontSmall(), W, H);
        frames.push(f);
      }
      return frames;
    }
  });

  // ── 8. Snowfall Scene (falling snow + ground) ───────────────────────────────
  T.push({
    id: 'snowfall', icon: '❄️', name: 'Snowfall',
    desc: 'Gentle falling snow over a hill', fps: 12,
    gen: (W, H) => {
      const frames = [];
      const flakes = Array.from({ length: 26 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() }));
      for (let i = 0; i < 24; i++) {
        const f = mk(W, H);
        // hill
        for (let x = 0; x < W; x++) {
          const gy = H - 6 - Math.round(4 * Math.sin(x / W * Math.PI));
          for (let y = gy; y < H; y++) setPx(f, x, y, W, H, ((x + y) % 2 === 0) ? 1 : 0);
          setPx(f, x, gy, W, H);
        }
        flakes.forEach(fl => {
          setPx(f, fl.x, fl.y, W, H);
          fl.y += fl.s; fl.x += Math.sin(i * 0.3 + fl.y * 0.1) * 0.3;
          if (fl.y >= H - 6) { fl.y = 0; fl.x = Math.random() * W; }
        });
        frames.push(f);
      }
      return frames;
    }
  });

  // ── 9. Fireworks (launch + burst) ───────────────────────────────────────────
  T.push({
    id: 'fireworks', icon: '🎆', name: 'Fireworks',
    desc: 'Rockets launch and burst into sparks', fps: 14,
    gen: (W, H) => {
      const frames = [];
      const cx = Math.floor(W / 2), peak = 8;
      for (let i = 0; i < 26; i++) {
        const f = mk(W, H);
        if (i < 10) {
          const y = H - 1 - Math.round((H - peak) * (i / 10));
          setPx(f, cx, y, W, H); setPx(f, cx, y + 1, W, H);
        } else {
          const t = (i - 10) / 16, r = t * (Math.min(W, H) / 2);
          for (let a = 0; a < 16; a++) {
            const ang = a / 16 * Math.PI * 2;
            if ((a + i) % 2 === 0) setPx(f, cx + r * Math.cos(ang), peak + r * Math.sin(ang), W, H);
          }
        }
        frames.push(f);
      }
      return frames;
    }
  });

  // ── 10. Countdown 5→0 (big 7-seg with ring) ─────────────────────────────────
  T.push({
    id: 'countdown', icon: '🔢', name: 'Countdown',
    desc: 'Big countdown 5 to GO with shrinking ring', fps: 2,
    gen: (W, H) => {
      const frames = [];
      const cx = Math.floor(W / 2), cy = Math.floor(H / 2), r = Math.floor(Math.min(W, H) / 2) - 1;
      ['5', '4', '3', '2', '1'].forEach((n, i) => {
        const f = mk(W, H);
        circ(f, cx, cy, r - i, W, H);
        const dw = 16, dh = 30;
        drawDigit(f, n, cx - dw / 2, cy - dh / 2, dw, dh, W, H);
        frames.push(f);
      });
      const g = mk(W, H);
      const lbl = 'GO!';
      text(g, lbl, (W - tw(lbl, fontBold(), 2)) / 2, cy - 7, fontBold(), W, H, 2);
      circ(g, cx, cy, r, W, H);
      frames.push(g);
      return frames;
    }
  });

  // ── 11. Temperature Gauge (needle dial) ─────────────────────────────────────
  T.push({
    id: 'temp-gauge', icon: '🌡️', name: 'Temp Gauge',
    desc: 'Half-circle gauge with sweeping needle', fps: 8,
    gen: (W, H) => {
      const frames = [];
      const cx = Math.floor(W / 2), cy = H - 6, r = Math.min(Math.floor(W / 2) - 4, H - 12);
      for (let i = 0; i < 16; i++) {
        const f = mk(W, H);
        for (let a = 180; a <= 360; a += 4) {
          const rd = a * Math.PI / 180;
          setPx(f, cx + r * Math.cos(rd), cy + r * Math.sin(rd), W, H);
        }
        const t = (Math.sin(i * 0.4) * 0.5 + 0.5);
        const na = (180 + t * 180) * Math.PI / 180;
        line(f, cx, cy, cx + (r - 3) * Math.cos(na), cy + (r - 3) * Math.sin(na), W, H);
        fillCirc(f, cx, cy, 2, W, H);
        const val = Math.round(t * 99) + 'C';
        text(f, val, (W - tw(val, fontSmall())) / 2, 1, fontSmall(), W, H);
        frames.push(f);
      }
      return frames;
    }
  });

  // ── 12. Heart Rate Monitor (scrolling ECG) ──────────────────────────────────
  T.push({
    id: 'ecg-monitor', icon: '💓', name: 'Heart Rate',
    desc: 'Scrolling ECG heartbeat trace with BPM', fps: 16,
    gen: (W, H) => {
      const frames = [];
      const midY = Math.floor(H / 2) + 2;
      // one heartbeat pulse shape sampled across width
      const pulse = (x) => {
        const p = x % 40;
        if (p === 8) return -3; if (p === 9) return 4; if (p === 10) return -8;
        if (p === 11) return 6; if (p === 12) return -2; return 0;
      };
      for (let i = 0; i < 20; i++) {
        const f = mk(W, H);
        let py = midY;
        for (let x = 0; x < W; x++) {
          const y = midY + pulse(x + i * 2);
          line(f, x - 1, py, x, y, W, H);
          py = y;
        }
        text(f, '72 BPM', 1, 1, fontSmall(), W, H);
        // little heart that beats
        if (i % 8 < 4) { fillCirc(f, W - 8, 4, 2, W, H); fillCirc(f, W - 4, 4, 2, W, H); fillRect(f, W - 9, 4, 8, 3, W, H); }
        frames.push(f);
      }
      return frames;
    }
  });

  // ── 13. Independence Day (15 August — Indian flag + celebration) ─────────────
  T.push({
    id: 'independence-day', icon: '🇮🇳', name: 'Independence Day',
    desc: '15 August — clean waving Indian flag with readable Jai Hind text', fps: 8,
    gen: (W, H) => {
      const frames = [];
      const compact = H < 48;
      const fw = compact ? Math.min(42, W - 12) : Math.min(58, W - 16);
      const fh = compact ? 15 : 27;
      const band = Math.floor(fh / 3);
      const poleX = Math.floor((W - fw) / 2) - 3;
      const flagX = poleX + 2;
      const flagY = compact ? 8 : 17;

      for (let i = 0; i < 16; i++) {
        const f = mk(W, H);

        // Fixed headings stay readable throughout the animation.
        const title = compact ? '15 AUG' : '15 AUGUST';
        text(f, title, Math.floor((W - tw(title, fontBold())) / 2), 0, fontBold(), W, H);
        const footer = 'JAI HIND';
        text(f, footer, Math.floor((W - tw(footer, fontBold())) / 2), H - 8, fontBold(), W, H);

        // Pole and a gently waving tricolour.
        line(f, poleX, flagY - 1, poleX, flagY + fh + 2, W, H);
        fillCirc(f, poleX, flagY - 2, 1, W, H);
        for (let x = 0; x < fw; x++) {
          const wave = Math.round(Math.sin(x * 0.24 - i * 0.45) * 1.5);
          const bx = flagX + x;
          const by = flagY + wave;

          // Different monochrome patterns keep all three bands distinct.
          for (let y = 0; y < band; y++) {
            if (y === 0 || y === band - 1 || (x + y) % 3 === 0) setPx(f, bx, by + y, W, H);
          }
          setPx(f, bx, by + band, W, H);
          setPx(f, bx, by + band * 2 - 1, W, H);
          for (let y = band * 2; y < fh; y++) {
            if ((x + y) % 2 === 0) setPx(f, bx, by + y, W, H);
          }
          if (x === 0 || x === fw - 1) {
            for (let y = 0; y < fh; y++) setPx(f, bx, by + y, W, H);
          }
        }

        // Spinning Ashoka Chakra.
        const cx = flagX + Math.floor(fw / 2);
        const centerWave = Math.round(Math.sin((fw / 2) * 0.24 - i * 0.45) * 1.5);
        const cy = flagY + band + Math.floor(band / 2) + centerWave;
        const cr = Math.max(2, Math.floor(band / 2) - 1);
        circ(f, cx, cy, cr, W, H);
        const spokes = 8;
        for (let s = 0; s < spokes; s++) {
          const a = (s / spokes) * Math.PI * 2 + i * 0.2;
          line(f, cx, cy, cx + Math.cos(a) * cr, cy + Math.sin(a) * cr, W, H);
        }
        setPx(f, cx, cy, W, H);

        frames.push(f);
      }
      return frames;
    }
  });

  // ── 14. India Gate Celebration (flag raising + fireworks) ───────────────────
  T.push({
    id: 'india-gate-celebration', icon: '🎆', name: 'India Gate Celebration',
    desc: '15 August celebration with India Gate, waving flag and fireworks', fps: 10,
    gen: (W, H) => {
      const frames = [];
      const compact = H < 48;
      const cx = Math.floor(W / 2);
      const title = '15 AUG';
      const footer = 'JAI HIND';

      const drawBurst = (f, bx, by, radius, phase) => {
        if (radius < 1) return;
        for (let ray = 0; ray < 8; ray++) {
          const a = ray * Math.PI / 4 + phase;
          const inner = Math.max(1, radius - 2);
          line(
            f,
            bx + Math.cos(a) * inner,
            by + Math.sin(a) * inner,
            bx + Math.cos(a) * radius,
            by + Math.sin(a) * radius,
            W,
            H
          );
        }
        setPx(f, bx, by, W, H);
      };

      for (let i = 0; i < 24; i++) {
        const f = mk(W, H);

        // Text never moves or blinks, so it remains easy to read.
        text(f, title, Math.floor((W - tw(title, fontBold())) / 2), 0, fontBold(), W, H);
        text(f, footer, Math.floor((W - tw(footer, fontBold())) / 2), H - 8, fontBold(), W, H);

        if (compact) {
          // Small India Gate for 128x32 and 72x40 displays.
          const top = 10;
          const bottom = H - 9;
          const halfW = 11;
          line(f, cx - halfW, top + 3, cx + halfW, top + 3, W, H);
          line(f, cx - halfW + 2, top, cx + halfW - 2, top, W, H);
          fillRect(f, cx - halfW, top + 4, 3, bottom - top - 3, W, H);
          fillRect(f, cx + halfW - 2, top + 4, 3, bottom - top - 3, W, H);
          line(f, cx - 6, bottom, cx - 6, top + 8, W, H);
          line(f, cx - 6, top + 8, cx - 3, top + 5, W, H);
          line(f, cx - 3, top + 5, cx + 3, top + 5, W, H);
          line(f, cx + 3, top + 5, cx + 6, top + 8, W, H);
          line(f, cx + 6, top + 8, cx + 6, bottom, W, H);
          line(f, cx - halfW - 2, bottom, cx + halfW + 2, bottom, W, H);
        } else {
          // India Gate silhouette.
          const top = 20;
          const bottom = H - 10;
          const halfW = 18;
          fillRect(f, cx - halfW, top + 5, 5, bottom - top - 4, W, H);
          fillRect(f, cx + halfW - 4, top + 5, 5, bottom - top - 4, W, H);
          fillRect(f, cx - halfW, top, halfW * 2 + 1, 6, W, H);
          outRect(f, cx - halfW + 3, top - 3, halfW * 2 - 5, 4, W, H);
          line(f, cx - 9, bottom, cx - 9, top + 15, W, H);
          line(f, cx - 9, top + 15, cx - 5, top + 9, W, H);
          line(f, cx - 5, top + 9, cx + 5, top + 9, W, H);
          line(f, cx + 5, top + 9, cx + 9, top + 15, W, H);
          line(f, cx + 9, top + 15, cx + 9, bottom, W, H);
          line(f, cx - halfW - 3, bottom, cx + halfW + 3, bottom, W, H);
          line(f, cx - halfW - 6, bottom + 2, cx + halfW + 6, bottom + 2, W, H);

          // Waving flag above the monument.
          const poleTop = 9;
          line(f, cx, poleTop, cx, top, W, H);
          for (let x = 0; x < 13; x++) {
            const wave = Math.round(Math.sin(x * 0.45 - i * 0.5));
            const fx = cx + 1 + x;
            const fy = poleTop + wave;
            setPx(f, fx, fy, W, H);
            if (x % 2 === 0) setPx(f, fx, fy + 1, W, H);
            setPx(f, fx, fy + 3, W, H);
            if (x % 2 === 1) setPx(f, fx, fy + 5, W, H);
          }
        }

        // Alternating fireworks keep the centre and text uncluttered.
        const burstSize = compact ? 4 : 8;
        const leftR = Math.min(burstSize, (i % 12) + 1);
        const rightR = Math.min(burstSize, ((i + 6) % 12) + 1);
        const burstY = compact ? Math.floor(H / 2) : 25;
        drawBurst(f, Math.max(9, cx - (compact ? 25 : 43)), burstY, leftR, i * 0.08);
        drawBurst(f, Math.min(W - 10, cx + (compact ? 25 : 43)), burstY, rightR, -i * 0.08);

        frames.push(f);
      }
      return frames;
    }
  });

  // ── 15. Independence Day 2026 full show (preview only) ──────────────────────
  T.push({
    id: 'independence-show-2026', icon: '🇮🇳', name: 'Independence Show 2026',
    desc: 'Full 15 August show: years, chakra, rocket, flag, confetti and finale',
    fps: 10,
    previewOnly: true,
    gen: (W, H) => {
      const frames = [];
      const cx = Math.floor(W / 2);
      const compact = H < 48;
      const centerText = (f, value, y, face = font(), scale = 1) => {
        text(f, value, Math.floor((W - tw(value, face, scale)) / 2), y, face, W, H, scale);
      };
      const hold = (f, count = 1) => {
        for (let n = 0; n < count; n++) frames.push(f);
      };
      const stars = (f, phase = 0) => {
        const pts = [[12, 9], [18, H - 22], [W - 20, 10], [W - 34, 30], [W - 12, H - 21], [35, 17]];
        pts.forEach(([x, y], p) => {
          if ((p + phase) % 3 !== 0) setPx(f, x, y, W, H);
        });
      };
      const chakra = (f, x, y, r, phase = 0) => {
        circ(f, x, y, r, W, H);
        circ(f, x, y, Math.max(1, Math.floor(r / 5)), W, H);
        for (let s = 0; s < 24; s++) {
          const a = s * Math.PI * 2 / 24 + phase;
          line(f, x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, W, H);
        }
      };
      const waveFlag = (f, poleX, topY, frame, width = 58, height = 30) => {
        width = Math.min(width, W - poleX - 2);
        const stripe = Math.max(2, Math.floor(height / 3));
        for (let x = 0; x < width; x++) {
          const wave = Math.round(Math.sin(x * 0.25 + frame * 0.32) * 2);
          const px = poleX + x;
          const py = topY + wave;
          for (let y = 0; y < stripe; y++) {
            if (y === 0 || y === stripe - 1 || (x + y) % 3 === 0) setPx(f, px, py + y, W, H);
          }
          setPx(f, px, py + stripe, W, H);
          setPx(f, px, py + stripe * 2 - 1, W, H);
          for (let y = stripe * 2; y < height; y++) {
            if ((x + y) % 2 === 0) setPx(f, px, py + y, W, H);
          }
        }
        const flagCx = poleX + Math.floor(width / 2);
        const flagCy = topY + stripe + Math.floor(stripe / 2)
          + Math.round(Math.sin(width * 0.125 + frame * 0.32) * 2);
        chakra(f, flagCx, flagCy, Math.max(2, Math.floor(stripe / 2) - 1), frame * 0.12);
      };
      const rocket = (f, x, y) => {
        line(f, x, y - 8, x - 5, y, W, H);
        line(f, x, y - 8, x + 5, y, W, H);
        outRect(f, x - 5, y, 11, 13, W, H);
        circ(f, x, y + 5, 2, W, H);
        line(f, x - 5, y + 8, x - 9, y + 13, W, H);
        line(f, x + 5, y + 8, x + 9, y + 13, W, H);
      };

      // 1947 → 2026
      ['1947', '1959', '1971', '1983', '1995', '2007', '2019', '2026'].forEach((year, index) => {
        const f = mk(W, H);
        stars(f, index);
        centerText(f, year, Math.floor(H / 2) - (compact ? 4 : 8), fontBold(), compact ? 1 : 2);
        hold(f, 2);
      });

      // 80th Independence Day
      {
        const f = mk(W, H);
        centerText(f, '80th', compact ? 1 : 7, fontBold(), compact ? 1 : 2);
        centerText(f, 'INDEPENDENCE', compact ? 11 : 34, fontBold());
        centerText(f, 'DAY', compact ? 22 : 50, fontBold());
        hold(f, 12);
      }

      // 15 August intro with spinning chakra
      for (let i = 0; i < 16; i++) {
        const f = mk(W, H);
        stars(f, i);
        chakra(f, cx, compact ? 11 : 18, compact ? 7 : 10, i * 0.18);
        centerText(f, '15 AUGUST', compact ? 21 : 36, fontBold());
        if (!compact) centerText(f, '2026', 50, fontBold());
        frames.push(f);
      }

      // Rocket launch and exhaust particles
      for (let i = 0; i < 18; i++) {
        const f = mk(W, H);
        stars(f, i);
        const y = H - 12 - Math.round(i * (H + 8) / 18);
        rocket(f, cx, y);
        for (let p = 0; p < 12; p++) {
          const py = y + 14 + ((p * 5 + i * 3) % 18);
          const px = cx + (((p * 7 + i * 2) % 15) - 7);
          setPx(f, px, py, W, H);
        }
        frames.push(f);
      }

      // Firework explosion
      for (let i = 0; i < 14; i++) {
        const f = mk(W, H);
        const radius = 2 + i * (compact ? 1 : 2);
        for (let ray = 0; ray < 24; ray++) {
          const a = ray * Math.PI * 2 / 24;
          const inner = Math.max(0, radius - 5);
          line(f, cx + Math.cos(a) * inner, 10 + Math.sin(a) * inner,
            cx + Math.cos(a) * radius, 10 + Math.sin(a) * radius, W, H);
        }
        frames.push(f);
      }

      // Flag hoisting
      const poleTop = compact ? 7 : 6;
      const poleBottom = H - 4;
      const flagHeight = compact ? 15 : 30;
      const flagWidth = compact ? 36 : 58;
      for (let i = 0; i < 18; i++) {
        const f = mk(W, H);
        line(f, cx, poleTop, cx, poleBottom, W, H);
        line(f, cx - 20, poleBottom, cx + 20, poleBottom, W, H);
        const flagY = poleBottom - flagHeight - Math.round(i * (poleBottom - flagHeight - poleTop) / 17);
        waveFlag(f, cx, flagY, i, flagWidth, flagHeight);
        frames.push(f);
      }

      // Waving flag and rising birds
      for (let i = 0; i < 20; i++) {
        const f = mk(W, H);
        line(f, cx, poleTop, cx, poleBottom, W, H);
        waveFlag(f, cx, poleTop, i, flagWidth, flagHeight);
        const birdY = H - 8 - (i % Math.max(8, H - 14));
        line(f, 12, birdY, 15, birdY - 2, W, H);
        line(f, 15, birdY - 2, 18, birdY, W, H);
        line(f, 27, birdY + 8, 30, birdY + 6, W, H);
        line(f, 30, birdY + 6, 33, birdY + 8, W, H);
        frames.push(f);
      }

      // Jai Hind finale
      for (let i = 0; i < 18; i++) {
        const f = mk(W, H);
        stars(f, i);
        chakra(f, cx, compact ? 11 : 24, compact ? 8 : 16, i * 0.18);
        centerText(f, 'JAI HIND', H - 10, fontBold());
        frames.push(f);
      }

      // Confetti and final wish
      for (let i = 0; i < 24; i++) {
        const f = mk(W, H);
        for (let p = 0; p < 38; p++) {
          const px = (p * 29 + i * (p % 3 + 1)) % W;
          const py = (p * 17 + i * (p % 4 + 2)) % H;
          if (p % 3 === 0) fillRect(f, px, py, 2, 2, W, H);
          else setPx(f, px, py, W, H);
        }
        centerText(f, 'HAPPY', compact ? 2 : 10, fontBold());
        centerText(f, 'INDEPENDENCE', compact ? 12 : 27, fontBold());
        centerText(f, 'DAY', compact ? 22 : 44, fontBold());
        frames.push(f);
      }

      // Vande Mataram type-on
      const salute = 'VANDE MATARAM';
      for (let count = 1; count <= salute.length; count++) {
        const f = mk(W, H);
        chakra(f, cx, compact ? 10 : 22, compact ? 7 : 14, count * 0.3);
        centerText(f, salute.slice(0, count), H - 10, fontBold());
        frames.push(f);
      }
      hold(frames[frames.length - 1], 8);

      // Branding from the supplied sketch
      {
        const f = mk(W, H);
        centerText(f, 'Made with', compact ? 0 : 2, fontSmall());
        centerText(f, 'OLED ANIMATION', compact ? 8 : 16, fontBold());
        centerText(f, 'MAKER', compact ? 16 : 28, fontBold());
        if (!compact) {
          centerText(f, '@oled_animator', 42, fontSmall());
          centerText(f, 'WitbloxAshish', 54, fontSmall());
        } else {
          centerText(f, '@oled_animator', 24, fontSmall());
        }
        hold(f, 15);
      }

      // Home screen before the show loops
      {
        const f = mk(W, H);
        const homeW = compact ? 38 : 58;
        const homeH = compact ? 15 : 30;
        waveFlag(f, Math.floor((W - homeW) / 2), compact ? 1 : 5, 0, homeW, homeH);
        centerText(f, 'VANDE MATARAM', H - 10, fontBold());
        hold(f, 20);
      }

      return frames;
    }
  });

  // Register
  if (window.TEMPLATES) window.TEMPLATES.push(...T);
  else window.TEMPLATES = T;
})();
