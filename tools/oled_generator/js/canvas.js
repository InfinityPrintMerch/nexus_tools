// canvas.js - Pixel canvas editor with all drawing tools

class OLEDCanvas {
  constructor(canvasEl, previewEl, state) {
    this.canvas = canvasEl;
    this.preview = previewEl;
    this.ctx = canvasEl.getContext('2d');
    this.pCtx = previewEl ? previewEl.getContext('2d') : null;
    this.state = state;
    this.isDrawing = false;
    this.startPx = null; this.startPy = null;
    this.lastPx = -1; this.lastPy = -1;
    this.tempFrame = null;
    this.moveBaseFrame = null;
    this.moveGrabX = 0;
    this.moveGrabY = 0;
    this.movePixels = null;
    this.moveEditObject = null;
    this._bindEvents();
  }

  get W() { return this.state.displayW; }
  get H() { return this.state.displayH; }
  get scale() { return this.state.scale; }
  get frame() { 
    return this.state.frames[this.state.currentFrame]; 
  }

  // ── Event binding ─────────────────────────────────────────────────────────
  _bindEvents() {
    const c = this.canvas;
    c.addEventListener('mousedown',  e => this._onDown(e));
    c.addEventListener('mousemove',  e => this._onMove(e));
    c.addEventListener('mouseup',    e => this._onUp(e));
    c.addEventListener('mouseleave', e => this._onUp(e));
    c.addEventListener('touchstart', e => { e.preventDefault(); this._onDown(e.touches[0]); }, { passive: false });
    c.addEventListener('touchmove',  e => { e.preventDefault(); this._onMove(e.touches[0]); }, { passive: false });
    c.addEventListener('touchend',   e => { e.preventDefault(); this._onUp(e); },              { passive: false });
    c.addEventListener('contextmenu', e => e.preventDefault());
  }

  _coords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width  / (this.W * this.scale)) / this.scale);
    const y = Math.floor((e.clientY - rect.top)  / (rect.height / (this.H * this.scale)) / this.scale);
    return { x: Math.max(0, Math.min(x, this.W - 1)), y: Math.max(0, Math.min(y, this.H - 1)) };
  }

  _onDown(e) {
    const { x, y } = this._coords(e);

    if (this.state.tool === 'move') {
      if (this.state.selectedTemplate) return;
      const objects = this.state.editObjects || [];

      // Grabbing a resize handle of the currently selected layer starts a resize.
      const sel = this.state.selectedLayer;
      if (sel && objects.includes(sel)) {
        const handle = this._hitHandle(sel, x, y);
        if (handle) { this._beginResize(sel, handle, x, y); return; }
      }

      const hit = findEditObjectAt(objects, x, y);
      this.state.selectedLayer = hit || null;
      // Grabbing a corner/edge of the layer under the cursor resizes it directly,
      // even if it wasn't selected yet.
      if (hit) {
        const h2 = this._hitHandle(hit, x, y);
        if (h2) { this.render(); this._beginResize(hit, h2, x, y); return; }
      }
      const pixels = hit
        ? hit.pixels.map(([px, py]) => [px, py])
        : pickPixelsForMove(this.frame, x, y, this.W, this.H);
      if (!pixels.length) { this.render(); return; }

      this.isDrawing = true;
      if (typeof this.state.syncCanvasCursor === 'function') this.state.syncCanvasCursor(true);
      this.moveGrabX = x;
      this.moveGrabY = y;
      this.movePixels = pixels;
      this.moveEditObject = hit;
      this._saveHistory();
      this.moveBaseFrame = cloneFrame(this.frame);
      erasePixels(this.moveBaseFrame, this.movePixels);
      this.lastPx = x;
      this.lastPy = y;
      this.render();
      return;
    }

    // Any non-move tool clears the current selection.
    this.state.selectedLayer = null;

    this.isDrawing = true;
    this.startPx = x; this.startPy = y;
    this.drawColor = (e.button === 2) ? 0 : 1;
    this._saveHistory();
    this.tempFrame = cloneFrame(this.frame);

    if (this.state.tool === 'pencil' || this.state.tool === 'eraser') {
      this._applyPencil(this.frame, x, y);
    } else if (this.state.tool === 'fill') {
      this._floodFill(this.frame, x, y, this.frame[y][x], this.drawColor);
    } else if (this.state.tool === 'text') {
      this._placeText(x, y);
    }
    this.lastPx = x; this.lastPy = y;
    this.render();
  }

  _onMove(e) {
    if (!this.isDrawing) return;
    const { x, y } = this._coords(e);

    if (this.resizing) {
      this._doResize(x, y);
      this.lastPx = x; this.lastPy = y;
      return;
    }

    if (x === this.lastPx && y === this.lastPy) return;

    if (this.state.tool === 'move' && this.moveBaseFrame && this.movePixels) {
      const dx = x - this.moveGrabX;
      const dy = y - this.moveGrabY;
      this.state.frames[this.state.currentFrame] = compositeFrameWithPixels(
        this.moveBaseFrame, this.movePixels, dx, dy, this.W, this.H
      );
      this.lastPx = x;
      this.lastPy = y;
      this.render();
      return;
    }

    const tool = this.state.tool;
    if (tool === 'pencil' || tool === 'eraser') {
      // Bresenham line from last to current
      this._linePencil(this.frame, this.lastPx, this.lastPy, x, y);
    } else if (['rect','circle','line','rect-fill'].includes(tool)) {
      // Preview on temp copy
      const preview = cloneFrame(this.tempFrame);
      this._applyShape(preview, this.startPx, this.startPy, x, y, tool);
      this.state.frames[this.state.currentFrame] = preview;
    }
    this.lastPx = x; this.lastPy = y;
    this.render();
  }

  _onUp(e) {
    if (!this.isDrawing) return;
    if (this.resizing) { this._finishResize(); return; }
    const wasMove = this.state.tool === 'move';
    if (wasMove && this.movePixels) {
      const dx = this.lastPx - this.moveGrabX;
      const dy = this.lastPy - this.moveGrabY;
      if (this.moveEditObject) {
        this.moveEditObject.pixels = this.movePixels.map(([px, py]) => [px + dx, py + dy]);
        this.moveEditObject.bbox = bboxFromPixels(this.moveEditObject.pixels);
        this.moveEditObject.anchorX += dx;
        this.moveEditObject.anchorY += dy;
        this._offsetGeo(this.moveEditObject.geo, dx, dy);
      } else if (dx || dy) {
        const oldSet = new Set(this.movePixels.map(([px, py]) => `${px},${py}`));
        this.state.editObjects = (this.state.editObjects || []).filter(
          o => !o.pixels.some(([px, py]) => oldSet.has(`${px},${py}`))
        );
        const newPixels = this.movePixels.map(([px, py]) => [px + dx, py + dy]);
        registerEditObject(this.state, newPixels, 'drawing');
      }
    }
    if (wasMove && typeof this.state.syncCanvasCursor === 'function') {
      this.state.syncCanvasCursor(false);
    }
    if (!wasMove && this.tempFrame) {
      const tool = this.state.tool;
      const shapeTools = ['line', 'rect', 'rect-fill', 'circle'];
      // Geometry-aware capture for vector export. Only solid (drawColor 1)
      // shapes become vector layers; erased shapes fall back to pixel deltas.
      if (shapeTools.includes(tool) && this.drawColor === 1) {
        this._registerShapeLayer(tool, this.startPx, this.startPy, this.lastPx, this.lastPy);
      } else if (['pencil', 'line', 'rect', 'rect-fill', 'circle', 'fill'].includes(tool)) {
        registerDrawingDelta(this.state, this.tempFrame, this.frame, this.W, this.H);
      }
    }
    this.isDrawing = false;
    this.tempFrame = null;
    this.moveBaseFrame = null;
    this.movePixels = null;
    this.moveEditObject = null;
    this.render();
    if (!wasMove && typeof this.state.onDrawCommit === 'function') {
      this.state.onDrawCommit();
    }
    if (typeof this.state.onCodeUpdate === 'function') this.state.onCodeUpdate();
  }

  // ── Drawing primitives ────────────────────────────────────────────────────
  setPixel(frame, x, y, val) {
    if (x >= 0 && x < this.W && y >= 0 && y < this.H) frame[y][x] = val;
  }

  _applyPencil(frame, x, y) {
    const val = this.state.tool === 'eraser' ? 0 : this.drawColor;
    this.setPixel(frame, x, y, val);
  }

  _linePencil(frame, x0, y0, x1, y1) {
    const val = this.state.tool === 'eraser' ? 0 : this.drawColor;
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      this.setPixel(frame, x0, y0, val);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx)  { err += dx; y0 += sy; }
    }
  }

  _applyShape(frame, x0, y0, x1, y1, tool) {
    const val = this.drawColor;
    if (tool === 'line') {
      this._linePencil(frame, x0, y0, x1, y1);
    } else if (tool === 'rect') {
      // outline
      for (let x = Math.min(x0,x1); x <= Math.max(x0,x1); x++) {
        this.setPixel(frame, x, y0, val);
        this.setPixel(frame, x, y1, val);
      }
      for (let y = Math.min(y0,y1); y <= Math.max(y0,y1); y++) {
        this.setPixel(frame, x0, y, val);
        this.setPixel(frame, x1, y, val);
      }
    } else if (tool === 'rect-fill') {
      for (let y = Math.min(y0,y1); y <= Math.max(y0,y1); y++)
        for (let x = Math.min(x0,x1); x <= Math.max(x0,x1); x++)
          this.setPixel(frame, x, y, val);
    } else if (tool === 'circle') {
      const rx = Math.abs(x1 - x0), ry = Math.abs(y1 - y0);
      const r = Math.round(Math.sqrt(rx*rx + ry*ry));
      let x = r, y = 0, err2 = 0;
      while (x >= y) {
        [[x,y],[y,x],[-y,x],[-x,y],[-x,-y],[-y,-x],[y,-x],[x,-y]].forEach(([dx,dy]) => {
          this.setPixel(frame, x0+dx, y0+dy, val);
        });
        y++; err2 += 2*y+1;
        if (2*(err2-x)+1 > 0) { x--; err2 += 1-2*x; }
      }
    }
  }

  // Shift a layer's geometry by (dx, dy) so vector export stays correct after a move.
  _offsetGeo(geo, dx, dy) {
    if (!geo) return;
    if ('x1' in geo) { geo.x1 += dx; geo.y1 += dy; geo.x2 += dx; geo.y2 += dy; }
    if ('cx' in geo) { geo.cx += dx; geo.cy += dy; }
    if ('x' in geo) { geo.x += dx; geo.y += dy; }
  }

  // Build the semantic geometry for a finished shape and register it as a
  // vector layer (with the exact pixels it drew, for move/hit-test + export).
  _registerShapeLayer(tool, x0, y0, x1, y1) {
    const pixels = [];
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        if (this.frame[y][x] && !this.tempFrame[y][x]) pixels.push([x, y]);
      }
    }
    if (!pixels.length) return;

    let type, geo;
    if (tool === 'line') {
      type = 'line';
      geo = { x1: x0, y1: y0, x2: x1, y2: y1 };
    } else if (tool === 'rect' || tool === 'rect-fill') {
      type = 'rect';
      geo = {
        x: Math.min(x0, x1), y: Math.min(y0, y1),
        w: Math.abs(x1 - x0) + 1, h: Math.abs(y1 - y0) + 1,
        fill: tool === 'rect-fill',
      };
    } else if (tool === 'circle') {
      const rx = Math.abs(x1 - x0), ry = Math.abs(y1 - y0);
      const r = Math.round(Math.sqrt(rx * rx + ry * ry));
      type = 'circle';
      geo = { cx: x0, cy: y0, r, fill: false };
    }
    if (type) window.registerShapeLayer(this.state, pixels, type, geo);
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  // Which of the 8 bbox handles (if any) is under the cursor.
  _hitHandle(layer, x, y) {
    const b = layer.bbox || bboxFromPixels(layer.pixels);
    const tol = Math.max(2, Math.ceil(7 / this.scale));
    const midX = Math.round((b.minX + b.maxX) / 2);
    const midY = Math.round((b.minY + b.maxY) / 2);
    const handles = {
      nw: [b.minX, b.minY], n: [midX, b.minY], ne: [b.maxX, b.minY],
      w: [b.minX, midY], e: [b.maxX, midY],
      sw: [b.minX, b.maxY], s: [midX, b.maxY], se: [b.maxX, b.maxY],
    };
    for (const k in handles) {
      const [hx, hy] = handles[k];
      if (Math.abs(x - hx) <= tol && Math.abs(y - hy) <= tol) return k;
    }
    return null;
  }

  _beginResize(layer, handle, x, y) {
    this.isDrawing = true;
    this.resizing = true;
    this.resizeHandle = handle;
    this.resizeLayer = layer;
    this._saveHistory();
    this.resizeOrigBBox = { ...(layer.bbox || bboxFromPixels(layer.pixels)) };
    this.resizeOrigGeo = layer.geo ? JSON.parse(JSON.stringify(layer.geo)) : null;
    this.resizeOrigPixels = layer.pixels.map(p => p.slice());
    this.resizeBaseFrame = cloneFrame(this.frame);
    erasePixels(this.resizeBaseFrame, layer.pixels);
    this.resizeStartX = x;
    this.resizeStartY = y;
    if (typeof this.state.syncCanvasCursor === 'function') this.state.syncCanvasCursor(true);
  }

  _adjustBBox(b, handle, dx, dy) {
    let { minX, minY, maxX, maxY } = b;
    if (handle.includes('w')) minX += dx;
    if (handle.includes('e')) maxX += dx;
    if (handle.includes('n')) minY += dy;
    if (handle.includes('s')) maxY += dy;
    if (minX > maxX) { const t = minX; minX = maxX; maxX = t; }
    if (minY > maxY) { const t = minY; minY = maxY; maxY = t; }
    minX = Math.max(0, Math.min(minX, this.W - 1));
    maxX = Math.max(0, Math.min(maxX, this.W - 1));
    minY = Math.max(0, Math.min(minY, this.H - 1));
    maxY = Math.max(0, Math.min(maxY, this.H - 1));
    return { minX, minY, maxX, maxY };
  }

  _geoForBBox(type, oldB, nb, oldGeo) {
    if (type === 'rect') {
      return { x: nb.minX, y: nb.minY, w: nb.maxX - nb.minX + 1, h: nb.maxY - nb.minY + 1, fill: oldGeo.fill };
    }
    if (type === 'circle') {
      const w = nb.maxX - nb.minX, h = nb.maxY - nb.minY;
      const r = Math.max(1, Math.round(Math.min(w, h) / 2));
      return { cx: Math.round((nb.minX + nb.maxX) / 2), cy: Math.round((nb.minY + nb.maxY) / 2), r, fill: oldGeo.fill };
    }
    // line: map endpoints proportionally from old bbox into new bbox
    const ow = (oldB.maxX - oldB.minX) || 1, oh = (oldB.maxY - oldB.minY) || 1;
    const nw = nb.maxX - nb.minX, nh = nb.maxY - nb.minY;
    const mapX = px => Math.round(nb.minX + ((px - oldB.minX) / ow) * nw);
    const mapY = py => Math.round(nb.minY + ((py - oldB.minY) / oh) * nh);
    return { x1: mapX(oldGeo.x1), y1: mapY(oldGeo.y1), x2: mapX(oldGeo.x2), y2: mapY(oldGeo.y2) };
  }

  _rasterShapePixels(type, geo) {
    const tmp = window.createEmptyFrame(this.W, this.H);
    const old = this.drawColor;
    this.drawColor = 1;
    if (type === 'line') this._linePencil(tmp, geo.x1, geo.y1, geo.x2, geo.y2);
    else if (type === 'rect') this._applyShape(tmp, geo.x, geo.y, geo.x + geo.w - 1, geo.y + geo.h - 1, geo.fill ? 'rect-fill' : 'rect');
    else if (type === 'circle') this._applyShape(tmp, geo.cx, geo.cy, geo.cx + geo.r, geo.cy, 'circle');
    this.drawColor = old;
    const px = [];
    for (let yy = 0; yy < this.H; yy++)
      for (let xx = 0; xx < this.W; xx++)
        if (tmp[yy][xx]) px.push([xx, yy]);
    return px;
  }

  // Nearest-neighbor scale of a pixel set from old bbox to new bbox (icons/text/freehand).
  _scalePixels(origPixels, oldB, nb) {
    const ow = (oldB.maxX - oldB.minX) + 1, oh = (oldB.maxY - oldB.minY) + 1;
    const nw = (nb.maxX - nb.minX) + 1, nh = (nb.maxY - nb.minY) + 1;
    const src = new Set(origPixels.map(([px, py]) => px + ',' + py));
    const out = [], seen = new Set();
    for (let ty = 0; ty < nh; ty++) {
      for (let tx = 0; tx < nw; tx++) {
        const sx = oldB.minX + Math.floor(tx * ow / nw);
        const sy = oldB.minY + Math.floor(ty * oh / nh);
        if (src.has(sx + ',' + sy)) {
          const X = nb.minX + tx, Y = nb.minY + ty, k = X + ',' + Y;
          if (!seen.has(k)) { seen.add(k); out.push([X, Y]); }
        }
      }
    }
    return out;
  }

  _doResize(x, y) {
    const dx = x - this.resizeStartX;
    const dy = y - this.resizeStartY;
    const nb = this._adjustBBox(this.resizeOrigBBox, this.resizeHandle, dx, dy);
    const layer = this.resizeLayer;
    const isShape = this.resizeOrigGeo && ['line', 'rect', 'circle'].includes(layer.type);

    let pixels, geo;
    if (isShape) {
      geo = this._geoForBBox(layer.type, this.resizeOrigBBox, nb, this.resizeOrigGeo);
      pixels = this._rasterShapePixels(layer.type, geo);
    } else {
      pixels = this._scalePixels(this.resizeOrigPixels, this.resizeOrigBBox, nb);
      geo = null; // resized bitmap layers export as drawBitmap
    }

    const f = cloneFrame(this.resizeBaseFrame);
    for (const [px, py] of pixels) {
      if (px >= 0 && px < this.W && py >= 0 && py < this.H) f[py][px] = 1;
    }
    this.state.frames[this.state.currentFrame] = f;
    this.pendingPixels = pixels;
    this.pendingGeo = geo;
    layer.bbox = nb; // keep selection box following the drag
    this.render();
  }

  _finishResize() {
    const layer = this.resizeLayer;
    if (layer && this.pendingPixels) {
      layer.pixels = this.pendingPixels.map(p => p.slice());
      layer.bbox = bboxFromPixels(layer.pixels);
      layer.geo = this.pendingGeo;
      layer.anchorX = layer.bbox.minX;
      layer.anchorY = layer.bbox.minY;
    }
    this.isDrawing = false;
    this.resizing = false;
    this.resizeLayer = null;
    this.resizeBaseFrame = null;
    this.pendingPixels = null;
    this.pendingGeo = undefined;
    this.resizeHandle = null;
    if (typeof this.state.syncCanvasCursor === 'function') this.state.syncCanvasCursor(false);
    this.render();
    if (typeof this.state.onDrawCommit === 'function') this.state.onDrawCommit();
    if (typeof this.state.onCodeUpdate === 'function') this.state.onCodeUpdate();
  }

  // Draw the selection bounding box + 8 resize handles for the active layer.
  _drawSelection(ctx, layer, scale) {
    const b = layer.bbox || bboxFromPixels(layer.pixels);
    const x0 = b.minX * scale, y0 = b.minY * scale;
    const w = (b.maxX - b.minX + 1) * scale, h = (b.maxY - b.minY + 1) * scale;
    ctx.save();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, Math.max(1, w - 1), Math.max(1, h - 1));
    ctx.setLineDash([]);
    const midX = (b.minX + b.maxX) / 2, midY = (b.minY + b.maxY) / 2;
    const pts = [
      [b.minX, b.minY], [midX, b.minY], [b.maxX, b.minY],
      [b.minX, midY], [b.maxX, midY],
      [b.minX, b.maxY], [midX, b.maxY], [b.maxX, b.maxY],
    ];
    const hs = 6;
    pts.forEach(([hx, hy]) => {
      const sx = hx * scale, sy = hy * scale;
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx - hs / 2, sy - hs / 2, hs, hs);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(sx - hs / 2 + 1, sy - hs / 2 + 1, hs - 2, hs - 2);
    });
    ctx.restore();
  }

  _floodFill(frame, x, y, targetVal, fillVal) {
    if (targetVal === fillVal) return;
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cx >= this.W || cy < 0 || cy >= this.H) continue;
      if (frame[cy][cx] !== targetVal) continue;
      frame[cy][cx] = fillVal;
      stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
    }
  }

  _placeText(x, y) {
    const { textContent, textFont } = this.state;
    if (!textContent) return;
    const font = window.FONTS[textFont] || window.FONTS['5x7'];
    window.renderTextToFrame(this.frame, textContent, x, y, font, this.drawColor, this.W, this.H);
    registerPlacedText(this.state, this.frame, x, y, textContent, textFont, this.drawColor, this.W, this.H);
  }

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  _saveHistory() {
    const snap = {
      frames: this.state.frames.map(f => cloneFrame(f)),
      editObjects: cloneEditObjects(this.state.editObjects),
    };
    this.state.history.splice(this.state.historyIndex + 1);
    this.state.history.push(snap);
    if (this.state.history.length > 50) this.state.history.shift();
    else this.state.historyIndex++;
    // Trigger auto-save
    if (typeof this.state.onFrameChange === 'function') this.state.onFrameChange();
  }

  _restoreHistorySnap(snap) {
    if (Array.isArray(snap)) {
      this.state.frames = snap.map(f => cloneFrame(f));
      this.state.editObjects = [];
    } else {
      this.state.frames = snap.frames.map(f => cloneFrame(f));
      this.state.editObjects = cloneEditObjects(snap.editObjects);
    }
  }

  undo() {
    if (this.state.historyIndex <= 0) return;
    this.state.historyIndex--;
    this._restoreHistorySnap(this.state.history[this.state.historyIndex]);
    this.render();
    if (typeof this.state.onCodeUpdate === 'function') this.state.onCodeUpdate();
  }

  redo() {
    if (this.state.historyIndex >= this.state.history.length - 1) return;
    this.state.historyIndex++;
    this._restoreHistorySnap(this.state.history[this.state.historyIndex]);
    this.render();
    if (typeof this.state.onCodeUpdate === 'function') this.state.onCodeUpdate();
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  render() {
    this._renderFrame(this.ctx, this.frame, this.W, this.H, this.scale, true);
    if (this.pCtx) this._renderFrame(this.pCtx, this.frame, this.W, this.H, this._previewScale(), false);
    if (typeof this.state.onRender === 'function') this.state.onRender();
  }

  renderFrame(frame) {
    if (this.pCtx) this._renderFrame(this.pCtx, frame, this.W, this.H, this._previewScale(), false);
  }

  _previewScale() {
    const maxW = 200, maxH = 100;
    return Math.min(Math.floor(maxW / this.W), Math.floor(maxH / this.H), 4) || 1;
  }

  _renderFrame(ctx, frame, W, H, scale, showGrid) {
    const cw = W * scale, ch = H * scale;
    if (ctx.canvas.width !== cw) ctx.canvas.width = cw;
    if (ctx.canvas.height !== ch) ctx.canvas.height = ch;

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, cw, ch);

    // Onion skin (previous frame, ghosted)
    if (showGrid && this.state.onionSkin && this.state.currentFrame > 0) {
      const prev = this.state.frames[this.state.currentFrame - 1];
      ctx.globalAlpha = 0.25;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (prev[y][x]) {
            ctx.fillStyle = '#ff6b35';
            ctx.fillRect(x*scale, y*scale, scale, scale);
          }
      ctx.globalAlpha = 1;
    }

    // Active pixels
    if (this.state.isPlaying || !showGrid) {
      // Hardware-accelerated rendering for playback or preview
      if (!this._offCanvas) {
        this._offCanvas = document.createElement('canvas');
        this._offCtx = this._offCanvas.getContext('2d');
      }
      if (this._offCanvas.width !== W) {
        this._offCanvas.width = W;
        this._offCanvas.height = H;
      }
      
      const imgData = this._offCtx.createImageData(W, H);
      const data = imgData.data;
      const colorMode = this.state.color || 'blue';
      
      for (let y = 0; y < H; y++) {
        const [r, g, b] = this._getCol(y, colorMode);
        for (let x = 0; x < W; x++) {
          const idx = (y * W + x) * 4;
          if (frame[y][x]) {
            data[idx] = r; data[idx+1] = g; data[idx+2] = b; data[idx+3] = 255;
          } else {
            data[idx+3] = 0;
          }
        }
      }
      this._offCtx.putImageData(imgData, 0, 0);
      
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this._offCanvas, 0, 0, cw, ch);
    } else {
      // High-quality rendering for editor (with grid and shadows)
      const colorMode = this.state.color || 'blue';
      for (let y = 0; y < H; y++) {
        const [r, g, b] = this._getCol(y, colorMode);
        const colorStr = `rgb(${r},${g},${b})`;
        for (let x = 0; x < W; x++) {
          if (frame[y][x]) {
            ctx.fillStyle = colorStr;
            if (scale > 3) {
              ctx.shadowColor = `rgba(${r},${g},${b},0.6)`;
              ctx.shadowBlur = 3;
            }
            ctx.fillRect(x*scale + 0.5, y*scale + 0.5, scale - 1, scale - 1);
          }
        }
      }
      ctx.shadowBlur = 0;
    }

    // Grid
    if (showGrid && this.state.showGrid && scale >= 4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= W; x++) { ctx.beginPath(); ctx.moveTo(x*scale,0); ctx.lineTo(x*scale,ch); ctx.stroke(); }
      for (let y = 0; y <= H; y++) { ctx.beginPath(); ctx.moveTo(0,y*scale); ctx.lineTo(cw,y*scale); ctx.stroke(); }
    }

    // Selection box + resize handles (editor canvas only, Move tool)
    if (showGrid) {
      const sel = this.state.selectedLayer;
      if (sel && !(this.state.editObjects || []).includes(sel)) {
        this.state.selectedLayer = null;
      } else if (sel && this.state.tool === 'move') {
        this._drawSelection(ctx, sel, scale);
      }
    }
  }

  clearFrame() {
    this._saveHistory();
    const f = this.state.frames[this.state.currentFrame];
    for (let y = 0; y < this.H; y++) f[y].fill(0);
    this.state.editObjects = [];
    this.state.selectedLayer = null;
    this.render();
    if (typeof this.state.onCodeUpdate === 'function') this.state.onCodeUpdate();
  }

  invertFrame() {
    this._saveHistory();
    const f = this.state.frames[this.state.currentFrame];
    for (let y = 0; y < this.H; y++)
      for (let x = 0; x < this.W; x++)
        f[y][x] = f[y][x] ? 0 : 1;
    this.render();
    if (typeof this.state.onCodeUpdate === 'function') this.state.onCodeUpdate();
  }

  invertAllFrames() {
    this._saveHistory();
    this.state.frames.forEach(f => {
      for (let y = 0; y < this.H; y++)
        for (let x = 0; x < this.W; x++)
          f[y][x] = f[y][x] ? 0 : 1;
    });
    this.render();
    if (typeof this.state.onCodeUpdate === 'function') this.state.onCodeUpdate();
  }

  setFrameFromPixels(pixelData) {
    this._saveHistory();
    this.state.frames[this.state.currentFrame] = pixelData;
    this.render();
    if (typeof this.state.onCodeUpdate === 'function') this.state.onCodeUpdate();
  }

  _getCol(y, mode) {
    if (mode === 'yellow-blue') return y < 16 ? [255, 230, 0] : [0, 239, 255];
    if (mode === 'white') return [255, 255, 255];
    if (mode === 'green') return [0, 255, 65];
    return [0, 239, 255];
  }
}

window.OLEDCanvas = OLEDCanvas;
