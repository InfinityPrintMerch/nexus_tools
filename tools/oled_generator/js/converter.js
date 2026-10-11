// converter.js - Image/GIF → 1-bit frame converter

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED BINARIZATION ALGORITHMS FOR THIN LINE PRESERVATION
// ═══════════════════════════════════════════════════════════════════════════

// Multi-step downscale to preserve thin line details (prevents anti-aliasing blur)
function multiStepDownscale(srcCanvas, targetW, targetH) {
  let currentCanvas = srcCanvas;
  let currentW = srcCanvas.width;
  let currentH = srcCanvas.height;
  
  // Step down by factor of 2 until we're close to target size
  while (currentW > targetW * 2 || currentH > targetH * 2) {
    const nextW = Math.max(targetW, Math.floor(currentW / 2));
    const nextH = Math.max(targetH, Math.floor(currentH / 2));
    
    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = nextW;
    stepCanvas.height = nextH;
    const stepCtx = stepCanvas.getContext('2d');
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(currentCanvas, 0, 0, nextW, nextH);
    
    currentCanvas = stepCanvas;
    currentW = nextW;
    currentH = nextH;
  }
  
  // Final step to exact target size
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetW;
  finalCanvas.height = targetH;
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';
  finalCtx.drawImage(currentCanvas, 0, 0, targetW, targetH);
  
  return finalCtx.getImageData(0, 0, targetW, targetH);
}

// Build integral image for fast local mean computation (Bradley algorithm)
function buildIntegralImage(gray, w, h) {
  const integral = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x];
      integral[y * w + x] = rowSum + (y > 0 ? integral[(y - 1) * w + x] : 0);
    }
  }
  return integral;
}

// Get sum of region using integral image (O(1) operation)
function getRegionSum(integral, w, h, x1, y1, x2, y2) {
  x1 = Math.max(0, x1); y1 = Math.max(0, y1);
  x2 = Math.min(w - 1, x2); y2 = Math.min(h - 1, y2);
  
  const d = integral[y2 * w + x2];
  const a = (x1 > 0 && y1 > 0) ? integral[(y1 - 1) * w + (x1 - 1)] : 0;
  const b = (y1 > 0) ? integral[(y1 - 1) * w + x2] : 0;
  const c = (x1 > 0) ? integral[y2 * w + (x1 - 1)] : 0;
  
  return d - b - c + a;
}

// Bradley adaptive thresholding - excellent for documents and line art
function bradleyThreshold(gray, w, h, windowSize, sensitivity) {
  const integral = buildIntegralImage(gray, w, h);
  const result = new Uint8Array(w * h);
  const halfWin = Math.floor(windowSize / 2);
  const t = sensitivity; // typically 0.15 for documents
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = x - halfWin, y1 = y - halfWin;
      const x2 = x + halfWin, y2 = y + halfWin;
      
      const count = (Math.min(x2, w-1) - Math.max(x1, 0) + 1) * 
                    (Math.min(y2, h-1) - Math.max(y1, 0) + 1);
      const sum = getRegionSum(integral, w, h, x1, y1, x2, y2);
      const mean = sum / count;
      
      // Pixel is foreground if it's significantly darker than local mean
      result[y * w + x] = (gray[y * w + x] < mean * (1 - t)) ? 1 : 0;
    }
  }
  return result;
}

// Sauvola thresholding - better for varying contrast (uses local std deviation)
function sauvolaThreshold(gray, w, h, windowSize, k) {
  const integral = buildIntegralImage(gray, w, h);
  // Build integral of squares for std deviation
  const graySq = new Float32Array(w * h);
  for (let i = 0; i < gray.length; i++) graySq[i] = gray[i] * gray[i];
  const integralSq = buildIntegralImage(graySq, w, h);
  
  const result = new Uint8Array(w * h);
  const halfWin = Math.floor(windowSize / 2);
  const R = 128; // dynamic range of std deviation
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = x - halfWin, y1 = y - halfWin;
      const x2 = x + halfWin, y2 = y + halfWin;
      
      const count = (Math.min(x2, w-1) - Math.max(x1, 0) + 1) * 
                    (Math.min(y2, h-1) - Math.max(y1, 0) + 1);
      const sum = getRegionSum(integral, w, h, x1, y1, x2, y2);
      const sumSq = getRegionSum(integralSq, w, h, x1, y1, x2, y2);
      
      const mean = sum / count;
      const variance = (sumSq / count) - (mean * mean);
      const stdDev = Math.sqrt(Math.max(0, variance));
      
      // Sauvola formula: T = mean * (1 + k * (stdDev/R - 1))
      const threshold = mean * (1 + k * (stdDev / R - 1));
      result[y * w + x] = (gray[y * w + x] < threshold) ? 1 : 0;
    }
  }
  return result;
}

// Contrast stretching / histogram normalization
function stretchContrast(gray, w, h) {
  let min = 255, max = 0;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] < min) min = gray[i];
    if (gray[i] > max) max = gray[i];
  }
  
  const range = max - min;
  if (range < 10) return; // Already low contrast, don't stretch
  
  for (let i = 0; i < gray.length; i++) {
    gray[i] = ((gray[i] - min) / range) * 255;
  }
}

// Morphological dilation to thicken thin lines (run before thresholding)
function dilateGray(gray, w, h, radius) {
  const result = new Float32Array(gray.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let minVal = gray[y * w + x];
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            minVal = Math.min(minVal, gray[ny * w + nx]);
          }
        }
      }
      result[y * w + x] = minVal;
    }
  }
  return result;
}

// Unsharp mask to enhance edges before thresholding
function unsharpMask(gray, w, h, amount) {
  // Simple 3x3 blur
  const blurred = new Float32Array(gray.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += gray[(y + dy) * w + (x + dx)];
        }
      }
      blurred[y * w + x] = sum / 9;
    }
  }
  
  // Apply unsharp mask: result = original + amount * (original - blurred)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const sharpened = gray[idx] + amount * (gray[idx] - blurred[idx]);
      gray[idx] = Math.max(0, Math.min(255, sharpened));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HIGH-QUALITY IMPORT PIPELINE (aspect-correct, area-average, text-safe)
// ═══════════════════════════════════════════════════════════════════════════
//
// Why the old pipeline lost text:
//  1. It stretched every image to 128×64 (squashed letters, no aspect ratio).
//  2. It used the browser canvas scaler (blurs strokes to mid-grey) and then a
//     fixed threshold of 128, so thin/light strokes silently disappeared.
// Now: crop → grayscale → exact area-average resample (true box filter, no
// browser blur) → fit with correct aspect → edge sharpen → smart threshold.

// Crop + grayscale directly from RGBA (no canvas). Transparent → black (off).
function imageDataToGray(imageData, crop) {
  const c = normalizeCrop(crop, imageData.width, imageData.height);
  const x0 = c ? c.x : 0, y0 = c ? c.y : 0;
  const w = c ? c.w : imageData.width, h = c ? c.h : imageData.height;
  const d = imageData.data, iw = imageData.width;
  const gray = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let si = ((y0 + y) * iw + x0) * 4;
    let di = y * w;
    for (let x = 0; x < w; x++, si += 4, di++) {
      const a = d[si + 3];
      gray[di] = a < 10 ? 0 : (0.299 * d[si] + 0.587 * d[si + 1] + 0.114 * d[si + 2]);
    }
  }
  return { gray, w, h };
}

// Per-axis resample weights. Downscale = exact box (area) average;
// upscale = nearest (keeps pixel-art / 1-bit edges perfectly sharp).
function buildAxisMap(srcLen, dstLen) {
  const start = new Int32Array(dstLen);
  const count = new Int32Array(dstLen);
  const weights = [];
  if (dstLen >= srcLen) {
    for (let i = 0; i < dstLen; i++) {
      start[i] = Math.min(srcLen - 1, Math.floor(((i + 0.5) * srcLen) / dstLen));
      count[i] = 1;
      weights.push(1);
    }
  } else {
    const scale = srcLen / dstLen;
    for (let i = 0; i < dstLen; i++) {
      const s0 = i * scale, s1 = (i + 1) * scale;
      const k0 = Math.floor(s0), k1 = Math.min(srcLen, Math.ceil(s1));
      start[i] = k0;
      count[i] = k1 - k0;
      for (let k = k0; k < k1; k++) {
        weights.push((Math.min(s1, k + 1) - Math.max(s0, k)) / scale);
      }
    }
  }
  const offs = new Int32Array(dstLen);
  let o = 0;
  for (let i = 0; i < dstLen; i++) { offs[i] = o; o += count[i]; }
  return { start, count, offs, weights: Float32Array.from(weights) };
}

// True when the picture is already almost black-and-white (line art, pixel art,
// text). Photos have lots of mid greys and should stay on the normal average.
function isBilevel(gray) {
  let dark = 0, light = 0, n = gray.length;
  if (!n) return false;
  for (let i = 0; i < n; i++) {
    const v = gray[i];
    if (v <= 48) dark++;
    else if (v >= 207) light++;
  }
  return (dark + light) / n >= 0.82 && light > n * 0.04 && dark > n * 0.02;
}

// Downscale a black-and-white picture by counting how much of each output pixel
// is actually white. Averaging grey first turns small white gaps into mid-grey,
// and the threshold then paints them black.
function resampleWhiteFraction(gray, sw, sh, dw, dh, cutoff) {
  const mask = new Float32Array(gray.length);
  for (let i = 0; i < gray.length; i++) mask[i] = gray[i] >= cutoff ? 255 : 0;
  return resampleGray(mask, sw, sh, dw, dh);
}

function resampleGray(gray, sw, sh, dw, dh) {
  const mx = buildAxisMap(sw, dw);
  const my = buildAxisMap(sh, dh);
  const tmp = new Float32Array(dw * sh);
  for (let y = 0; y < sh; y++) {
    const row = y * sw;
    for (let x = 0; x < dw; x++) {
      let s = 0;
      const k0 = mx.start[x], n = mx.count[x], wo = mx.offs[x];
      for (let k = 0; k < n; k++) s += gray[row + k0 + k] * mx.weights[wo + k];
      tmp[y * dw + x] = s;
    }
  }
  const out = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const k0 = my.start[y], n = my.count[y], wo = my.offs[y];
    for (let x = 0; x < dw; x++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += tmp[(k0 + k) * dw + x] * my.weights[wo + k];
      out[y * dw + x] = s;
    }
  }
  return out;
}

// ── Fidelity-measured auto threshold ───────────────────────────────────────
// Instead of guessing (fixed 128 / Otsu), build a 4x supersampled reference of
// the picture, then pick the threshold whose 1-bit result disagrees with that
// reference the least. Text, thin lines and pixel art all score correctly
// because the reference keeps their real shape.
function plainOtsu(gray) {
  const hist = new Float64Array(256);
  for (let i = 0; i < gray.length; i++) hist[Math.max(0, Math.min(255, Math.round(gray[i])))]++;
  const total = gray.length;
  let sumAll = 0;
  for (let i = 0; i < 256; i++) sumAll += i * hist[i];
  let wB = 0, sumB = 0, best = -1, t = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; t = i; }
  }
  return t + 1;
}

function suggestThresholdFromReference(gray, refGray, targetW, targetH, ss) {
  const rw = targetW * ss, rh = targetH * ss;
  const refT = plainOtsu(refGray);
  const cells = ss * ss;
  // A[g]: cost if a pixel with gray g is LIT  (= reference-dark samples in its block)
  // B[g]: cost if it is OFF                    (= reference-lit samples in its block)
  const A = new Float64Array(257), B = new Float64Array(257);
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      let lit = 0;
      for (let dy = 0; dy < ss; dy++) {
        const row = (y * ss + dy) * rw + x * ss;
        for (let dx = 0; dx < ss; dx++) if (refGray[row + dx] >= refT) lit++;
      }
      const g = Math.max(0, Math.min(255, Math.round(gray[y * targetW + x])));
      A[g] += cells - lit;
      B[g] += lit;
    }
  }
  // err(t) = sum_{g>=t} A[g] + sum_{g<t} B[g]
  let errAbove = 0;
  for (let g = 0; g < 256; g++) errAbove += A[g];
  let errBelow = 0, bestT = 128, bestErr = Infinity;
  for (let t = 1; t <= 254; t++) {
    errAbove -= A[t - 1];
    errBelow += B[t - 1];
    const err = errAbove + errBelow;
    if (err < bestErr) { bestErr = err; bestT = t; }
  }
  return bestT;
}

// Build the final W×H grayscale plane (fit + sharpen). Shared by convert + auto threshold.
function prepareGray(imageData, targetW, targetH, options = {}) {
  const { crop = null, fit = 'stretch', sharpen = false } = options;
  let { gray, w: sw, h: sh } = imageDataToGray(imageData, crop);

  if (fit === 'cover') {
    // Center-crop the source to the display aspect, then fill the screen
    const targetAspect = targetW / targetH;
    let cw = sw, ch = Math.round(sw / targetAspect);
    if (ch > sh) { ch = sh; cw = Math.round(sh * targetAspect); }
    const cx = Math.floor((sw - cw) / 2), cy = Math.floor((sh - ch) / 2);
    if (cw !== sw || ch !== sh) {
      const sub = new Float32Array(cw * ch);
      for (let y = 0; y < ch; y++) {
        sub.set(gray.subarray((cy + y) * sw + cx, (cy + y) * sw + cx + cw), y * cw);
      }
      gray = sub; sw = cw; sh = ch;
    }
  }

  let dw = targetW, dh = targetH, ox = 0, oy = 0;
  if (fit === 'contain') {
    const s = Math.min(targetW / sw, targetH / sh);
    dw = Math.max(1, Math.min(targetW, Math.round(sw * s)));
    dh = Math.max(1, Math.min(targetH, Math.round(sh * s)));
    ox = Math.floor((targetW - dw) / 2);
    oy = Math.floor((targetH - dh) / 2);
  }

  // Line art / pixel art: decide white vs black at full size, then shrink the
  // white mask. Keeps white gaps (letter holes, sky, highlights) from vanishing.
  const bilevel = isBilevel(gray);
  const content = bilevel
    ? resampleWhiteFraction(gray, sw, sh, dw, dh, plainOtsu(gray))
    : resampleGray(gray, sw, sh, dw, dh);

  if (sharpen) {
    const ratio = Math.max(sw / dw, sh / dh);
    if (ratio > 1.4) unsharpMask(content, dw, dh, Math.min(0.8, 0.25 + 0.06 * ratio));
  }

  if (dw === targetW && dh === targetH) return content;

  // Letterbox: pad with the picture's own edge tone so no fake border appears
  let edgeSum = 0, edgeN = 0;
  for (let x = 0; x < dw; x++) { edgeSum += content[x] + content[(dh - 1) * dw + x]; edgeN += 2; }
  for (let y = 0; y < dh; y++) { edgeSum += content[y * dw] + content[y * dw + dw - 1]; edgeN += 2; }
  const padVal = edgeN ? edgeSum / edgeN : 0;
  const out = new Float32Array(targetW * targetH).fill(padVal);
  for (let y = 0; y < dh; y++) out.set(content.subarray(y * dw, (y + 1) * dw), (oy + y) * targetW + ox);
  return out;
}

// Auto threshold for a raw frame using the same pipeline as the converter.
function suggestImportThreshold(imageData, targetW, targetH, options = {}) {
  const gray = prepareGray(imageData, targetW, targetH, options);
  if (options.contrastStretch) stretchContrast(gray, targetW, targetH);
  const SS = 4;
  const ref = prepareGray(imageData, targetW * SS, targetH * SS, { ...options, sharpen: false });
  let t = suggestThresholdFromReference(gray, ref, targetW, targetH, SS);
  // Black-and-white art: a high cutoff turns small white gaps black.
  const src = imageDataToGray(imageData, options.crop || null);
  if (isBilevel(src.gray)) t = Math.min(t, 120);
  return t;
}

// Main conversion function with advanced options
function imageDataToFrame(imageData, targetW, targetH, options = {}) {
  const { 
    threshold = 128, 
    dither = false, 
    crop = null, 
    invert = false,
    algorithm = 'global',  // 'global', 'bradley', 'sauvola'
    windowSize = 15,       // for adaptive methods
    sensitivity = 0.15,    // Bradley sensitivity or Sauvola k
    preserveLines = false, // Enable line preservation mode
    contrastStretch = false,
    fit = 'stretch',       // 'contain' | 'cover' | 'stretch' (import UI passes 'contain')
    sharpen = false        // edge sharpen after downscale (import UI passes true)
  } = options;

  let gray = prepareGray(imageData, targetW, targetH, { crop, fit, sharpen });

  // Optional contrast stretching
  if (contrastStretch) {
    stretchContrast(gray, targetW, targetH);
  }

  // Line preservation mode: dilate dark areas and sharpen edges
  if (preserveLines) {
    gray = dilateGray(gray, targetW, targetH, 1);
    unsharpMask(gray, targetW, targetH, 1.5);
  }

  const frame = createEmptyFrame(targetW, targetH);

  // Apply chosen thresholding algorithm
  if (algorithm === 'bradley') {
    const binaryResult = bradleyThreshold(gray, targetW, targetH, windowSize, sensitivity);
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        frame[y][x] = binaryResult[y * targetW + x];
      }
    }
  } else if (algorithm === 'sauvola') {
    const binaryResult = sauvolaThreshold(gray, targetW, targetH, windowSize, sensitivity);
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        frame[y][x] = binaryResult[y * targetW + x];
      }
    }
  } else if (dither) {
    // Floyd-Steinberg dithering
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const idx = y * targetW + x;
        const old = gray[idx];
        const newVal = old < threshold ? 0 : 255;
        frame[y][x] = newVal === 255 ? 1 : 0;
        
        const err = old - newVal;
        if (x + 1 < targetW) gray[idx + 1] += err * 7 / 16;
        if (y + 1 < targetH && x > 0) gray[idx + targetW - 1] += err * 3 / 16;
        if (y + 1 < targetH) gray[idx + targetW] += err * 5 / 16;
        if (y + 1 < targetH && x + 1 < targetW) gray[idx + targetW + 1] += err * 1 / 16;
      }
    }
  } else {
    // Simple global threshold
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        frame[y][x] = gray[y * targetW + x] >= threshold ? 1 : 0;
      }
    }
  }

  // Invert final OLED bitmap so Live Preview always flips visibly
  if (invert) {
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        frame[y][x] = frame[y][x] ? 0 : 1;
      }
    }
  }
  
  return frame;
}

// Clamp a crop rect to the source bounds. Returns null if invalid or full-frame.
function normalizeCrop(crop, srcW, srcH) {
  if (!crop) return null;
  let x = Math.round(crop.x);
  let y = Math.round(crop.y);
  let w = Math.round(crop.w);
  let h = Math.round(crop.h);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) return null;
  x = Math.max(0, Math.min(x, srcW - 1));
  y = Math.max(0, Math.min(y, srcH - 1));
  w = Math.max(1, Math.min(w, srcW - x));
  h = Math.max(1, Math.min(h, srcH - y));
  // No-op crop (covers the whole frame) — treat as no crop
  if (x === 0 && y === 0 && w === srcW && h === srcH) return null;
  return { x, y, w, h };
}

// Load a File (PNG/JPG) and return a single frame
function loadImageFile(file, targetW, targetH, options) {
  return extractImageRawFrame(file).then(({ rawFrames }) =>
    convertRawFrames(rawFrames, targetW, targetH, options)[0]
  );
}

function cloneImageData(imgData) {
  return new ImageData(new Uint8ClampedArray(imgData.data), imgData.width, imgData.height);
}

async function extractImageRawFrame(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not load image'));
      el.src = url;
    });
    const oc = document.createElement('canvas');
    oc.width = img.width;
    oc.height = img.height;
    const ctx = oc.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, img.width, img.height);
    return {
      sourceW: img.width,
      sourceH: img.height,
      rawFrames: [cloneImageData(imgData)],
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function decodeGifRawFrames(gif) {
  const canvas = document.createElement('canvas');
  canvas.width = gif.width;
  canvas.height = gif.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const imageData = ctx.createImageData(gif.width, gif.height);
  const rawFrames = [];
  let previousData = null;

  for (let i = 0; i < gif.numFrames(); i++) {
    const frameInfo = gif.frameInfo(i);
    if (i > 0) {
      const prev = gif.frameInfo(i - 1);
      if (prev.disposal === 2) {
        ctx.clearRect(prev.x, prev.y, prev.width, prev.height);
        imageData.data.set(ctx.getImageData(0, 0, gif.width, gif.height).data);
      } else if (prev.disposal === 3 && previousData) {
        imageData.data.set(previousData);
      }
    }
    if (frameInfo.disposal === 3) {
      previousData = new Uint8ClampedArray(imageData.data);
    }
    gif.decodeAndBlitFrameRGBA(i, imageData.data);
    ctx.putImageData(imageData, 0, 0);
    rawFrames.push(cloneImageData(ctx.getImageData(0, 0, gif.width, gif.height)));
  }
  return rawFrames;
}

async function extractGifRawFrames(file) {
  const arrayBuffer = await file.arrayBuffer();
  const gif = new GifReader(new Uint8Array(arrayBuffer));
  return {
    sourceW: gif.width,
    sourceH: gif.height,
    rawFrames: decodeGifRawFrames(gif),
  };
}

// Parse GIF using omggif and extract all frames as 1-bit arrays
async function loadGifFile(file, targetW, targetH, options) {
  const { rawFrames } = await extractGifRawFrames(file);
  return convertRawFrames(rawFrames, targetW, targetH, options);
}

function isVideoFile(file) {
  if (file.type && file.type.startsWith('video/')) return true;
  return /\.(mp4|webm|mov|m4v|ogv|avi|mkv)$/i.test(file.name || '');
}

// Frames are auto-derived from clip length at this capture rate (frames/sec).
const VIDEO_CAPTURE_FPS = 15;
const MIN_VIDEO_FRAMES = 2;
// Hard ceiling on extracted frames. Keeps the UI responsive and the generated
// code small enough to be usable: short clips stay smooth at ~15 fps, longer
// clips are sampled more sparsely so the total never exceeds this.
const MAX_VIDEO_FRAMES = 150;
const DEFAULT_VIDEO_FRAMES = 80; // kept for backwards-compat references

// Quickly load video metadata + a single representative frame (middle of clip)
// for the crop screen, WITHOUT decoding the whole clip.
async function loadVideoCropPreview(file) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;
  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Could not read video file'));
    });
    const sourceW = video.videoWidth;
    const sourceH = video.videoHeight;
    if (!sourceW || !sourceH) throw new Error('Video has no readable dimensions');
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;

    await new Promise((resolve, reject) => {
      const onSeeked = () => { cleanup(); resolve(); };
      const onErr = () => { cleanup(); reject(new Error('Failed to read video frame')); };
      function cleanup() {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onErr);
      }
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onErr);
      video.currentTime = Math.min(duration / 2, Math.max(0, duration - 0.001));
    });

    const canvas = document.createElement('canvas');
    canvas.width = sourceW;
    canvas.height = sourceH;
    const cctx = canvas.getContext('2d');
    cctx.drawImage(video, 0, 0, sourceW, sourceH);
    const previewFrame = cctx.getImageData(0, 0, sourceW, sourceH);
    return { sourceW, sourceH, duration, previewFrame };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

// Extract raw RGBA frames from video (no threshold/dither yet).
// Frame count is computed from the clip duration at `captureFps` frames/sec.
async function extractVideoRawFrames(file, onProgress, captureFps = VIDEO_CAPTURE_FPS) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;

  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Could not read video file'));
    });

    const sourceW = video.videoWidth;
    const sourceH = video.videoHeight;
    if (!sourceW || !sourceH) throw new Error('Video has no readable dimensions');

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
    const rate = Number(captureFps) > 0 ? Number(captureFps) : VIDEO_CAPTURE_FPS;
    const frameCount = Math.max(
      MIN_VIDEO_FRAMES,
      Math.min(MAX_VIDEO_FRAMES, Math.round(duration * rate))
    );
    const interval = duration / frameCount;

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = sourceW;
    captureCanvas.height = sourceH;
    const captureCtx = captureCanvas.getContext('2d');

    const seekTo = (time) => new Promise((resolve, reject) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onErr);
        resolve();
      };
      const onErr = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onErr);
        reject(new Error('Failed to read video frame'));
      };
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onErr);
      video.currentTime = Math.min(time, Math.max(0, duration - 0.001));
    });

    const rawFrames = [];
    for (let i = 0; i < frameCount; i++) {
      await seekTo(i * interval);
      captureCtx.drawImage(video, 0, 0, sourceW, sourceH);
      const imgData = captureCtx.getImageData(0, 0, sourceW, sourceH);
      rawFrames.push(new ImageData(new Uint8ClampedArray(imgData.data), sourceW, sourceH));
      if (onProgress) {
        onProgress({ sourceW, sourceH, frameIndex: i + 1, totalFrames: frameCount });
      }
    }
    return { sourceW, sourceH, rawFrames, duration };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

function convertRawFrames(rawFrames, targetW, targetH, options) {
  return rawFrames.map(imgData => imageDataToFrame(imgData, targetW, targetH, options));
}

// Extract frames from video; onProgress({ sourceW, sourceH, targetW, targetH, frameIndex, totalFrames, frame })
async function loadVideoFile(file, targetW, targetH, options, onProgress) {
  const maxFrames = options?.maxFrames ?? DEFAULT_VIDEO_FRAMES;
  const { sourceW, sourceH, rawFrames } = await extractVideoRawFrames(file, (p) => {
    if (!onProgress) return;
    onProgress({ ...p, targetW, targetH, frame: null });
  }, maxFrames);
  const resultFrames = convertRawFrames(rawFrames, targetW, targetH, options);
  if (onProgress) {
    resultFrames.forEach((frame, i) => {
      onProgress({
        sourceW, sourceH, targetW, targetH,
        frameIndex: i + 1,
        totalFrames: resultFrames.length,
        frame,
      });
    });
  }
  return resultFrames;
}

// Helper: create blank frame
function createEmptyFrame(w, h) {
  return Array.from({ length: h }, () => new Uint8Array(w));
}

// Clone a frame (deep copy)
function cloneFrame(frame) {
  return frame.map(row => new Uint8Array(row));
}

// Shift all lit pixels by dx/dy (used by move tool)
function shiftFrame(frame, dx, dy, w, h) {
  const out = createEmptyFrame(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!frame[y][x]) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) out[ny][nx] = 1;
    }
  }
  return out;
}

function bboxFromPixels(pixels) {
  if (!pixels.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (const [px, py] of pixels) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  return { minX, minY, maxX, maxY };
}

function collectPixelsInRect(frame, x0, y0, x1, y1) {
  const pixels = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (frame[y]?.[x]) pixels.push([x, y]);
    }
  }
  return pixels;
}

function floodFillComponent(frame, startX, startY, w, h) {
  if (!frame[startY]?.[startX]) return [];
  const pixels = [];
  const seen = new Uint8Array(w * h);
  const stack = [[startX, startY]];
  const idx = (x, y) => y * w + x;
  while (stack.length) {
    const [cx, cy] = stack.pop();
    const i = idx(cx, cy);
    if (cx < 0 || cx >= w || cy < 0 || cy >= h || seen[i] || !frame[cy][cx]) continue;
    seen[i] = 1;
    pixels.push([cx, cy]);
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return pixels;
}

function findNearestComponent(frame, x, y, w, h) {
  const seen = new Uint8Array(w * h);
  const idx = (px, py) => py * w + px;
  let best = null;
  let bestDist = Infinity;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      if (!frame[py][px] || seen[idx(px, py)]) continue;
      const comp = floodFillComponent(frame, px, py, w, h);
      for (const [cx, cy] of comp) seen[idx(cx, cy)] = 1;
      const box = bboxFromPixels(comp);
      const cx = (box.minX + box.maxX) / 2;
      const cy = (box.minY + box.maxY) / 2;
      const dist = (cx - x) ** 2 + (cy - y) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = comp;
      }
    }
  }
  return best || [];
}

function pickPixelsAt(frame, x, y, w, h) {
  if (frame[y]?.[x]) return floodFillComponent(frame, x, y, w, h);
  return findNearestComponent(frame, x, y, w, h);
}

// Pick connected drawing near click (lines, circles, pencil strokes, etc.)
function pickPixelsForMove(frame, x, y, w, h, maxDist = 10) {
  if (frame[y]?.[x]) return floodFillComponent(frame, x, y, w, h);
  const seen = new Uint8Array(w * h);
  const idx = (px, py) => py * w + px;
  let best = null;
  let bestDist = maxDist * maxDist;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      if (!frame[py][px] || seen[idx(px, py)]) continue;
      const comp = floodFillComponent(frame, px, py, w, h);
      for (const [cx, cy] of comp) seen[idx(cx, cy)] = 1;
      const box = bboxFromPixels(comp);
      const dx = Math.max(0, box.minX - x, x - box.maxX);
      const dy = Math.max(0, box.minY - y, y - box.maxY);
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = comp;
      }
    }
  }
  return best || [];
}

function erasePixels(frame, pixels) {
  for (const [px, py] of pixels) frame[py][px] = 0;
}

function compositeFrameWithPixels(base, pixels, dx, dy, w, h) {
  const out = cloneFrame(base);
  for (const [px, py] of pixels) {
    const nx = px + dx;
    const ny = py + dy;
    if (nx >= 0 && nx < w && ny >= 0 && ny < h) out[ny][nx] = 1;
  }
  return out;
}

function cloneEditObjects(objects) {
  return (objects || []).map(o => ({
    ...o,
    pixels: o.pixels.map(([px, py]) => [px, py]),
    bbox: o.bbox ? { ...o.bbox } : bboxFromPixels(o.pixels),
  }));
}

function findEditObjectAt(objects, x, y) {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (o.pixels.some(([px, py]) => px === x && py === y)) return o;
  }
  const pad = 8;
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    const b = o.bbox || bboxFromPixels(o.pixels);
    if (x >= b.minX - pad && x <= b.maxX + pad && y >= b.minY - pad && y <= b.maxY + pad) return o;
  }
  return null;
}

function registerEditObject(state, pixels, type = 'drawing') {
  if (!pixels.length) return;
  if (!state.editObjects) state.editObjects = [];
  state.editObjects.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    pixels: pixels.map(([px, py]) => [px, py]),
    bbox: bboxFromPixels(pixels),
    anchorX: pixels[0][0],
    anchorY: pixels[0][1],
  });
}

function registerDrawingDelta(state, before, after, W, H) {
  const pixels = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (after[y][x] && !before[y][x]) pixels.push([x, y]);
    }
  }
  registerEditObject(state, pixels, 'drawing');
}

// Register a geometry-aware shape layer (line/rect/circle/ellipse).
// `geo` holds the semantic parameters used for vector code generation.
// `pixels` are the exact pixels the shape rasterized to (used for move/hit-test
// and to confirm the layer is present in a given frame during vector export).
function registerShapeLayer(state, pixels, type, geo) {
  if (!pixels.length) return null;
  registerEditObject(state, pixels, type);
  const obj = state.editObjects[state.editObjects.length - 1];
  obj.geo = { ...geo };
  return obj;
}

function registerPlacedText(state, frame, x, y, content, fontKey, color, W, H) {
  const font = window.FONTS[fontKey] || window.FONTS['5x7'];
  const tw = window.measureText(content, font);
  const th = font.height;
  const pad = 1;
  const x0 = Math.max(0, x - pad);
  const y0 = Math.max(0, y - pad);
  const x1 = Math.min(W - 1, x + tw + pad);
  const y1 = Math.min(H - 1, y + th + pad);
  const pixels = collectPixelsInRect(frame, x0, y0, x1, y1);
  if (!pixels.length) return;
  registerEditObject(state, pixels, 'text');
  const obj = state.editObjects[state.editObjects.length - 1];
  obj.content = content;
  obj.fontKey = fontKey;
  obj.color = color;
  obj.anchorX = x;
  obj.anchorY = y;
  // Geometry for vector code generation. fontHeight lets the generator map the
  // custom editor font to an Adafruit text size (classic 5x7 font ≈ size 1).
  obj.geo = { x, y, content, fontKey, fontHeight: font.height, color };
}

window.createEmptyFrame = createEmptyFrame;
window.cloneFrame = cloneFrame;
window.shiftFrame = shiftFrame;
window.bboxFromPixels = bboxFromPixels;
window.pickPixelsAt = pickPixelsAt;
window.pickPixelsForMove = pickPixelsForMove;
window.erasePixels = erasePixels;
window.compositeFrameWithPixels = compositeFrameWithPixels;
window.cloneEditObjects = cloneEditObjects;
window.findEditObjectAt = findEditObjectAt;
window.registerEditObject = registerEditObject;
window.registerDrawingDelta = registerDrawingDelta;
window.registerShapeLayer = registerShapeLayer;
window.registerPlacedText = registerPlacedText;
window.loadImageFile = loadImageFile;
window.loadGifFile = loadGifFile;
window.loadVideoFile = loadVideoFile;
window.extractVideoRawFrames = extractVideoRawFrames;
window.extractImageRawFrame = extractImageRawFrame;
window.extractGifRawFrames = extractGifRawFrames;
window.convertRawFrames = convertRawFrames;
window.isVideoFile = isVideoFile;
window.MIN_VIDEO_FRAMES = MIN_VIDEO_FRAMES;
window.MAX_VIDEO_FRAMES = MAX_VIDEO_FRAMES;
window.DEFAULT_VIDEO_FRAMES = DEFAULT_VIDEO_FRAMES;
window.imageDataToFrame = imageDataToFrame;
window.suggestImportThreshold = suggestImportThreshold;
