/* ==========================================================================
   Game 6 — Paint by Numbers  (reveals "U")

   Technique (all done in the browser, so swapping the photo needs no tooling)
   1. Crop the photo to cols:rows and draw it at 8x the grid resolution, then
      average each 8x8 block of pixels into ONE colour per grid cell. Block
      averaging is more faithful than letting drawImage() shrink in one step.
   2. Cluster the cell colours into N palette colours with k-means:
        - seeding: k-means++ (each new centre is chosen with probability
          proportional to its squared distance from the nearest existing one),
        - then up to 25 rounds of "assign every cell to its nearest centre,
          move each centre to the mean of its cells".
      A seeded RNG keeps the palette identical on every visit.
   3. Palette entries are sorted dark to light and numbered from 1.
   4. Painting only succeeds when the selected colour matches the cell's number.
      Dragging paints continuously. Finishing reveals the real photo.
   ========================================================================== */
(function () {
  'use strict';

  const cfg = window.GAME_CONFIG;
  const stage = SB.init(cfg);
  const CELL = 44;                 // internal pixels per grid cell
  const SUPER = 8;                 // oversampling factor for block averaging

  const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const lum = c => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

  // ---- k-means -------------------------------------------------------------
  function kmeans(points, k, rand, maxIter) {
    const n = points.length;
    const centres = [points[Math.floor(rand() * n)].slice()];
    while (centres.length < k) {
      const d2 = points.map(p => Math.min.apply(null, centres.map(c => dist2(p, c))));
      const total = d2.reduce((a, b) => a + b, 0);
      if (total === 0) break;                          // fewer distinct colours than k
      let r = rand() * total, idx = 0;
      for (; idx < n - 1; idx++) { r -= d2[idx]; if (r <= 0) break; }
      centres.push(points[idx].slice());
    }

    const assign = new Array(n).fill(-1);
    for (let it = 0; it < maxIter; it++) {
      let changed = false;
      for (let i = 0; i < n; i++) {
        let best = 0, bd = Infinity;
        for (let j = 0; j < centres.length; j++) {
          const d = dist2(points[i], centres[j]);
          if (d < bd) { bd = d; best = j; }
        }
        if (assign[i] !== best) { assign[i] = best; changed = true; }
      }
      if (!changed) break;
      const sums = centres.map(() => [0, 0, 0, 0]);
      for (let i = 0; i < n; i++) {
        const s = sums[assign[i]];
        s[0] += points[i][0]; s[1] += points[i][1]; s[2] += points[i][2]; s[3]++;
      }
      sums.forEach((s, j) => { if (s[3]) centres[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
    }
    return { centres, assign };
  }

  // ---- DOM -----------------------------------------------------------------
  const canvas = SB.el('canvas');
  const reveal = SB.el('img', { alt: '' });
  const wrap = SB.el('div', { class: 'paint-wrap' }, [canvas, reveal]);
  const frame = SB.el('div', { class: 'frame straight' }, [wrap]);
  const paletteEl = SB.el('div', { class: 'palette' });
  const countEl = SB.el('span');
  const hud = SB.el('div', { class: 'hud' }, [countEl]);
  const hint = SB.el('div', { class: 'hint', text: 'Choose a colour below, then drag over matching squares.' });
  stage.append(frame, hud, paletteEl, hint);

  // ---- Build the puzzle, then play ----------------------------------------------
  SB.loadImage(cfg.image).then(setup).catch(e => SB.fail(e.message + ' (check games/paint/config.js)'));

  function setup(image) {
    const cols = cfg.cols;
    const ratio = image.naturalWidth / image.naturalHeight;
    const rows = Math.max(10, Math.min(28, Math.round(cols / ratio)));
    const total = cols * rows;

    // Step 1: crop to cols:rows and average each block into one cell colour.
    const { sx, sy, sw, sh } = SB.coverRect(image.naturalWidth, image.naturalHeight, cols / rows);
    const big = document.createElement('canvas');
    big.width = cols * SUPER; big.height = rows * SUPER;
    const bctx = big.getContext('2d', { willReadFrequently: true });
    bctx.imageSmoothingQuality = 'high';
    bctx.drawImage(image, sx, sy, sw, sh, 0, 0, big.width, big.height);
    const px = bctx.getImageData(0, 0, big.width, big.height).data;

    const cellColours = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let R = 0, G = 0, B = 0;
        for (let y = 0; y < SUPER; y++) {
          for (let x = 0; x < SUPER; x++) {
            const o = ((r * SUPER + y) * big.width + (c * SUPER + x)) * 4;
            R += px[o]; G += px[o + 1]; B += px[o + 2];
          }
        }
        const m = SUPER * SUPER;
        cellColours.push([R / m, G / m, B / m]);
      }
    }

    // Steps 2 and 3: cluster, drop empty clusters, sort dark -> light.
    const { centres, assign } = kmeans(cellColours, cfg.colors, SB.rng(42), 25);
    const used = [...new Set(assign)];
    const order = used.sort((a, b) => lum(centres[a]) - lum(centres[b]));
    const remap = new Map(order.map((old, i) => [old, i]));
    const palette = order.map(old => centres[old].map(Math.round));
    const cellIdx = assign.map(a => remap.get(a));

    // ---- State -----------------------------------------------------------------
    const painted = new Array(total).fill(false);
    const remaining = palette.map((_, i) => cellIdx.filter(v => v === i).length);
    let selected = 0;
    let paintedCount = 0;
    let finished = false;

    // ---- Canvas ------------------------------------------------------------------
    canvas.width = cols * CELL;
    canvas.height = rows * CELL;
    wrap.style.width = 'min(100%, ' + ((cols / rows) * 62).toFixed(1) + 'vh)';
    wrap.style.aspectRatio = cols + ' / ' + rows;
    reveal.src = cfg.image;
    const ctx = canvas.getContext('2d');
    const rgb = c => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';

    function drawCell(i) {
      const c = i % cols, r = (i / cols) | 0, x = c * CELL, y = r * CELL;
      const idx = cellIdx[i], col = palette[idx];
      if (painted[i]) {
        ctx.fillStyle = rgb(col);
        ctx.fillRect(x, y, CELL, CELL);
        return;
      }
      ctx.fillStyle = '#fff3f6';
      ctx.fillRect(x, y, CELL, CELL);
      // A tint of the true colour; stronger for the selected colour so the
      // squares you should paint next are easy to spot.
      ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (idx === selected ? 0.5 : 0.12) + ')';
      ctx.fillRect(x, y, CELL, CELL);
      ctx.strokeStyle = 'rgba(90,36,56,.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      ctx.fillStyle = '#5a2438';
      ctx.font = '700 ' + Math.round(CELL * 0.5) + 'px ui-rounded,"Trebuchet MS",system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), x + CELL / 2, y + CELL / 2 + 1);
    }
    const drawAll = () => { for (let i = 0; i < total; i++) drawCell(i); };

    // ---- Palette UI ----------------------------------------------------------------
    const swatches = palette.map((col, i) => {
      const left = SB.el('span', { class: 'left', text: String(remaining[i]) });
      const b = SB.el('button', { class: 'sw', type: 'button', 'aria-label': 'Colour ' + (i + 1) }, [
        document.createTextNode(String(i + 1)), left,
      ]);
      b.style.background = rgb(col);
      b.style.color = lum(col) > 140 ? '#3d1626' : '#fff';
      b.addEventListener('click', () => select(i));
      paletteEl.append(b);
      return { b, left };
    });

    function select(i) {
      if (remaining[i] === 0) return;
      selected = i;
      swatches.forEach((s, j) => s.b.classList.toggle('sel', j === i));
      drawAll();
    }

    function updateCount() {
      countEl.innerHTML = 'Painted <strong>' + paintedCount + '/' + total + '</strong>';
    }

    // ---- Painting ------------------------------------------------------------------
    function cellFromPoint(x, y) {
      const w = canvas.getBoundingClientRect().width, h = canvas.getBoundingClientRect().height;
      const c = Math.floor((x / w) * cols), r = Math.floor((y / h) * rows);
      if (c < 0 || c >= cols || r < 0 || r >= rows) return -1;
      return r * cols + c;
    }

    function paintAt(x, y, isTap) {
      if (finished) return;
      const i = cellFromPoint(x, y);
      if (i < 0 || painted[i]) return;
      if (cellIdx[i] !== selected) {
        if (isTap) {
          hint.textContent = 'That square is number ' + (cellIdx[i] + 1) + '.';
          SB.vibrate(12);
        }
        return;
      }
      painted[i] = true;
      paintedCount++;
      remaining[selected]--;
      drawCell(i);
      swatches[selected].left.textContent = remaining[selected] === 0 ? '✓' : String(remaining[selected]);
      updateCount();

      if (remaining[selected] === 0) {
        swatches[selected].b.classList.remove('sel');
        swatches[selected].b.classList.add('full');
        SB.vibrate([30, 30, 30]);
        const next = remaining.findIndex(n => n > 0);
        if (next >= 0) { select(next); hint.textContent = 'Colour complete. Next: ' + (next + 1) + '.'; }
      }
      if (paintedCount === total) finish();
    }

    function finish() {
      finished = true;
      hint.textContent = 'Look what you made!';
      reveal.style.opacity = '1';                       // cross-fade to the real photo
      setTimeout(() => SB.win({ id: 'paint', message: cfg.winMessage }), 2000);
    }

    SB.drag(canvas, {
      down(x, y) { hint.textContent = ''; paintAt(x, y, true); },
      move(x, y) { paintAt(x, y, false); },
    });

    select(0);
    updateCount();
  }
})();
