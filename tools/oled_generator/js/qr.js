// qr.js — QR code rendering for OLED frames (uses qrcode-generator)
(function () {
  const DEFAULT_QR_TEXT = 'https://oledanimationmaker.com';

  function getQrText() {
    const el = document.getElementById('tplQrInput');
    const v = el && el.value != null ? String(el.value).trim() : '';
    return v || DEFAULT_QR_TEXT;
  }

  function renderQRToFrame(f, text, W, H) {
    if (typeof qrcode !== 'function') return f;
    const payload = (text || DEFAULT_QR_TEXT).trim() || DEFAULT_QR_TEXT;
    let qr;
    try {
      qr = qrcode(0, 'M');
      qr.addData(payload);
      qr.make();
    } catch (_) {
      return f;
    }

    const n = qr.getModuleCount();
    const margin = 2;
    const totalModules = n + margin * 2;
    const scale = Math.max(1, Math.floor(Math.min(W, H) / totalModules));
    const sizePx = n * scale;
    const ox = Math.floor((W - sizePx) / 2);
    const oy = Math.floor((H - sizePx) / 2);
    const marginPx = margin * scale;

    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        if (!qr.isDark(row, col)) continue;
        const x0 = ox - marginPx + col * scale;
        const y0 = oy - marginPx + row * scale;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const x = x0 + dx;
            const y = y0 + dy;
            if (x >= 0 && x < W && y >= 0 && y < H) f[y][x] = 1;
          }
        }
      }
    }
    return f;
  }

  window.getQrText = getQrText;
  window.renderQRToFrame = renderQRToFrame;
  window.DEFAULT_QR_TEXT = DEFAULT_QR_TEXT;
})();
