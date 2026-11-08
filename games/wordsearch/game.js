/* ==========================================================================
   Game 4 — Word Search  (reveals "V")

   Technique
   - Generator: words are placed longest-first in random positions and in all
     eight directions; a placement is valid when every cell is either empty or
     already holds the same letter (so words may cross). If a word cannot be
     placed after many attempts, the whole grid is regenerated.
   - Selection: the pointer position is converted to a (col,row) cell. Rather
     than letting the player draw any shape, the gesture is *snapped* to the
     nearest of the 8 compass directions (angle rounded to a multiple of 45deg)
     and the length is the projection of the drag onto that direction. This
     makes diagonal selection forgiving on a small touch screen.
   - Highlights are drawn as rounded SVG capsules over the grid.
   ========================================================================== */
(function () {
  'use strict';

  const cfg = window.GAME_CONFIG;
  const stage = SB.init(cfg);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const DIRS = [[1, 0], [0, 1], [1, 1], [-1, 1], [-1, 0], [0, -1], [-1, -1], [1, -1]];
  // Pink, magenta, lavender and peach hues (HSL degrees) for found-word highlights.
  const HUES = [340, 290, 15, 315, 260, 355, 30, 330];

  // ---- Normalise config --------------------------------------------------
  const entries = cfg.words.map(w => typeof w === 'string' ? { word: w, clue: '' } : w)
    .map(w => ({ word: w.word.toUpperCase().replace(/[^A-Z]/g, ''), clue: w.clue || '' }));
  const maxLen = Math.max(cfg.cols, cfg.rows);
  const tooLong = entries.find(e => e.word.length > maxLen);
  if (tooLong) { SB.fail('The word "' + tooLong.word + '" does not fit a ' + cfg.cols + 'x' + cfg.rows + ' grid.'); return; }

  // ---- Generator ---------------------------------------------------------
  function generate() {
    const { cols, rows } = cfg;
    const order = entries.map((e, i) => i).sort((a, b) => entries[b].word.length - entries[a].word.length);

    for (let attempt = 0; attempt < 60; attempt++) {
      const grid = Array.from({ length: rows }, () => Array(cols).fill(''));
      const placed = new Array(entries.length);
      let ok = true;

      for (const idx of order) {
        const word = entries[idx].word;
        let done = false;
        for (let t = 0; t < 400 && !done; t++) {
          const [dx, dy] = DIRS[Math.floor(Math.random() * DIRS.length)];
          const x0 = Math.floor(Math.random() * cols), y0 = Math.floor(Math.random() * rows);
          const x1 = x0 + dx * (word.length - 1), y1 = y0 + dy * (word.length - 1);
          if (x1 < 0 || x1 >= cols || y1 < 0 || y1 >= rows) continue;
          let fits = true;
          for (let k = 0; k < word.length; k++) {
            const cell = grid[y0 + dy * k][x0 + dx * k];
            if (cell !== '' && cell !== word[k]) { fits = false; break; }
          }
          if (!fits) continue;
          for (let k = 0; k < word.length; k++) grid[y0 + dy * k][x0 + dx * k] = word[k];
          placed[idx] = { x0, y0, dx, dy, len: word.length };
          done = true;
        }
        if (!done) { ok = false; break; }
      }
      if (!ok) continue;

      // Fill the gaps. Drawing filler letters from the words themselves makes
      // the grid harder to scan than uniformly random letters would.
      const pool = entries.map(e => e.word).join('') + 'ABCDEFGHIJKLMNOPRSTUW';
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++)
          if (grid[y][x] === '') grid[y][x] = pool[Math.floor(Math.random() * pool.length)];
      return { grid, placed };
    }
    throw new Error('Could not fit all words; enlarge the grid or shorten the list.');
  }

  let puzzle;
  try { puzzle = generate(); } catch (e) { SB.fail(e.message); return; }
  const { grid } = puzzle;

  // ---- DOM ---------------------------------------------------------------
  const banner = SB.el('img', { class: 'banner', src: cfg.image, alt: '' });
  banner.addEventListener('error', () => { banner.style.display = 'none'; });
  const frame = SB.el('div', { class: 'frame' }, [banner, SB.el('p', { class: 'caption', text: cfg.caption || '' })]);

  const lettersGrid = SB.el('div', { class: 'letters-grid' });
  lettersGrid.style.gridTemplateColumns = 'repeat(' + cfg.cols + ', 1fr)';
  grid.forEach(row => row.forEach(ch => lettersGrid.append(SB.el('div', { class: 'cell', text: ch }))));

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'overlay-svg');
  svg.setAttribute('viewBox', '0 0 ' + cfg.cols + ' ' + cfg.rows);
  svg.setAttribute('preserveAspectRatio', 'none');

  const gridWrap = SB.el('div', { class: 'grid-wrap' }, [lettersGrid]);
  gridWrap.append(svg);

  const chips = entries.map(e => SB.el('span', { class: 'chip', text: cfg.showClues && e.clue ? e.clue : e.word }));
  const wordsEl = SB.el('div', { class: 'words' }, chips);
  const countEl = SB.el('span');
  const hud = SB.el('div', { class: 'hud' }, [countEl]);
  const hint = SB.el('div', { class: 'hint', text: 'Drag from the first letter to the last.' });
  stage.append(frame, gridWrap, hud, hint, wordsEl);

  // ---- Geometry helpers ----------------------------------------------------
  function capsule(x0, y0, x1, y1, color, opacity) {
    // Cell centres in SVG units (1 unit = 1 cell). Stroke-linecap makes the capsule.
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', x0 + 0.5); line.setAttribute('y1', y0 + 0.5);
    line.setAttribute('x2', x1 + 0.5); line.setAttribute('y2', y1 + 0.5);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-opacity', opacity);
    line.setAttribute('stroke-width', 0.78);
    line.setAttribute('stroke-linecap', 'round');
    svg.append(line);
    return line;
  }

  // Pointer (CSS px relative to the letter grid) -> clamped cell coordinates.
  function cellAt(x, y) {
    const w = lettersGrid.clientWidth, h = lettersGrid.clientHeight;
    const c = Math.min(cfg.cols - 1, Math.max(0, Math.floor((x / w) * cfg.cols)));
    const r = Math.min(cfg.rows - 1, Math.max(0, Math.floor((y / h) * cfg.rows)));
    return [c, r];
  }

  // Snap a drag from (c0,r0) towards (c1,r1) to the nearest of the 8 directions.
  function snap(c0, r0, c1, r1) {
    const dx = c1 - c0, dy = r1 - r0;
    if (dx === 0 && dy === 0) return { sx: 0, sy: 0, len: 0 };
    const step = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));   // -4..4 in 45deg steps
    const sx = Math.round(Math.cos(step * Math.PI / 4));
    const sy = Math.round(Math.sin(step * Math.PI / 4));
    // Length = projection of the drag onto the snapped direction, in whole cells.
    let len = Math.max(0, Math.round((dx * sx + dy * sy) / (sx * sx + sy * sy)));
    // Clamp so the line never leaves the grid.
    while (len > 0) {
      const ex = c0 + sx * len, ey = r0 + sy * len;
      if (ex >= 0 && ex < cfg.cols && ey >= 0 && ey < cfg.rows) break;
      len--;
    }
    return { sx, sy, len };
  }

  // ---- Interaction ---------------------------------------------------------
  const foundSet = new Set();
  let start = null, preview = null;
  let finished = false;

  function updateCount() {
    countEl.innerHTML = 'Found <strong>' + foundSet.size + '/' + entries.length + '</strong>';
  }
  updateCount();

  // The selection is always derived from the pointer's CURRENT position (never
  // cached from an earlier event), so a quick flick that ends before the next
  // animation frame still selects exactly what the finger covered.
  function selectionFor(x, y) {                       // x, y relative to the letter grid
    const [c, r] = cellAt(x, y);
    const s = snap(start[0], start[1], c, r);
    return { x0: start[0], y0: start[1], x1: start[0] + s.sx * s.len, y1: start[1] + s.sy * s.len, sx: s.sx, sy: s.sy, len: s.len };
  }

  function showPreview(sel) {
    if (preview) preview.remove();
    preview = capsule(sel.x0, sel.y0, sel.x1, sel.y1, '#9c2f5f', 0.4);
  }

  // Pointer coordinates arrive relative to gridWrap, which has 6px of padding
  // around the letter grid, so every handler subtracts 6.
  SB.drag(gridWrap, {
    down(x, y) {
      if (finished) return;
      start = cellAt(x - 6, y - 6);
      hint.textContent = '';
      showPreview(selectionFor(x - 6, y - 6));
    },
    move(x, y) { if (start) showPreview(selectionFor(x - 6, y - 6)); },
    up(x, y) {
      if (!start) return;
      const sel = selectionFor(x - 6, y - 6);
      if (preview) { preview.remove(); preview = null; }
      start = null;
      if (sel.len === 0) return;

      let text = '';
      for (let k = 0; k <= sel.len; k++) text += grid[sel.y0 + sel.sy * k][sel.x0 + sel.sx * k];
      const reversed = text.split('').reverse().join('');
      const idx = entries.findIndex((e, i) => !foundSet.has(i) && (e.word === text || e.word === reversed));

      if (idx === -1) {
        SB.vibrate(15);
        gridWrap.classList.remove('shake'); void gridWrap.offsetWidth; gridWrap.classList.add('shake');
        return;
      }
      foundSet.add(idx);
      const hue = HUES[idx % HUES.length];
      capsule(sel.x0, sel.y0, sel.x1, sel.y1, 'hsl(' + hue + ',70%,55%)', 0.5);
      chips[idx].classList.add('done');
      chips[idx].textContent = entries[idx].word;       // reveal the word even in clue mode
      SB.vibrate([40, 30, 40]);
      updateCount();

      if (foundSet.size === entries.length) {
        finished = true;
        setTimeout(() => SB.win({ id: 'wordsearch', message: cfg.winMessage }), 700);
      }
    },
  });
})();
