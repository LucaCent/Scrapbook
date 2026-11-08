/* ==========================================================================
   Game 3 — Hot & Cold Hunt  (reveals "O")

   Technique
   - Targets live in PERCENT coordinates of the photo, so they stay correct at
     any rendered size. Distances are converted to pixels with the live
     bounding box, which keeps the horizontal and vertical axes in proportion
     (a 10% horizontal gap is not the same length as a 10% vertical gap).
   - Feedback is based on distance to the NEAREST UNFOUND target, expressed as
     a multiple of that target's own radius, so the bands scale with difficulty.
   - ?calibrate=1 prints tap coordinates and outlines every target, which is
     the quickest way to position targets on a new photo.
   ========================================================================== */
(function () {
  'use strict';

  const cfg = window.GAME_CONFIG;
  const stage = SB.init(cfg);
  const calibrate = new URLSearchParams(location.search).has('calibrate');

  // Distance bands, in multiples of the target radius.
  const BANDS = [
    // Warm end runs crimson -> rose -> pink; cold end runs lavender -> periwinkle
    // -> indigo, so "closer" and "further" stay unmistakable within the palette.
    { max: 2,        label: 'Burning hot!', color: '#d81b60', pct: 100, buzz: [30, 40, 30] },
    { max: 3.5,      label: 'Hot',          color: '#e0457b', pct: 82,  buzz: 25 },
    { max: 5.5,      label: 'Warm',         color: '#f08cae', pct: 62,  buzz: 12 },
    { max: 8,        label: 'Cool',         color: '#b39ddb', pct: 42,  buzz: 0 },
    { max: 12,       label: 'Cold',         color: '#7986cb', pct: 24,  buzz: 0 },
    { max: Infinity, label: 'Freezing',     color: '#3f51b5', pct: 8,   buzz: 0 },
  ];

  // ---- DOM ---------------------------------------------------------------
  const img = SB.el('img', { alt: '', draggable: 'false' });
  const layer = SB.el('div', { class: 'layer' });
  const wrap = SB.el('div', { class: 'hunt-wrap' }, [img, layer]);
  // 'straight' = no decorative tilt: tap coordinates are mapped through the
  // element's bounding box, which a rotated parent would slightly distort.
  const frame = SB.el('div', { class: 'frame straight' }, [wrap]);

  const thermoFill = SB.el('i');
  const thermo = SB.el('div', { class: 'thermo' }, [thermoFill]);
  const tapsEl = SB.el('span');
  const dots = SB.el('div', { class: 'dots' });
  const hud = SB.el('div', { class: 'hud' }, [tapsEl, thermo, dots]);
  const hint = SB.el('div', { class: 'hint', text: 'Tap anywhere to start hunting.' });
  const clueList = SB.el('ul', { class: 'clues' });
  const calibOut = SB.el('div', { class: 'calib-out', text: 'Calibration mode: tap a hiding place' });

  stage.append(frame, hud, hint, clueList);
  if (calibrate) stage.append(calibOut);

  // ---- State ---------------------------------------------------------------
  let roundIndex = 0;
  let round = null;
  let found = new Set();
  let taps = 0;
  let locked = true;

  function renderDots() {
    dots.replaceChildren(...cfg.rounds.map((_, i) =>
      SB.el('i', { class: (i < roundIndex ? 'on ' : '') + (i === roundIndex ? 'cur' : '') })));
  }

  function renderClues() {
    clueList.replaceChildren(...round.targets.map((t, i) =>
      SB.el('li', { class: found.has(i) ? 'done' : '', text: found.has(i) ? t.label : t.clue })));
  }

  function placeAbs(node, xPct, yPct) {
    node.style.left = xPct + '%';
    node.style.top = yPct + '%';
  }

  async function startRound() {
    locked = true;
    renderDots();
    round = cfg.rounds[roundIndex];
    found = new Set();
    taps = 0;
    layer.replaceChildren();
    thermoFill.style.width = '0';
    tapsEl.textContent = 'Taps 0 · Found 0/' + round.targets.length;

    let image;
    try { image = await SB.loadImage(round.image); }
    catch (e) { SB.fail(e.message + ' (check games/hunt/config.js)'); return; }

    const ratio = image.naturalWidth / image.naturalHeight;
    img.src = round.image;
    wrap.style.width = 'min(100%, ' + (ratio * 62).toFixed(1) + 'vh)';
    wrap.style.aspectRatio = image.naturalWidth + ' / ' + image.naturalHeight;

    renderClues();

    if (calibrate) {
      round.targets.forEach(t => {
        const ring = SB.el('div', { class: 'calib-ring' });
        ring.style.width = t.r * 2 + '%';
        placeAbs(ring, t.x, t.y);
        layer.append(ring);
      });
    }
    locked = false;
  }

  // ---- Tap handling ------------------------------------------------------
  wrap.addEventListener('click', e => {
    if (locked) return;
    const rect = wrap.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const xPct = (px / rect.width) * 100, yPct = (py / rect.height) * 100;

    if (calibrate) {
      calibOut.textContent = '{ x: ' + xPct.toFixed(1) + ', y: ' + yPct.toFixed(1) + ', r: 7 }';
      console.log(calibOut.textContent);
    }

    // Find the nearest unfound target, measured in pixels.
    let best = -1, bestDist = Infinity, bestRatio = Infinity;
    round.targets.forEach((t, i) => {
      if (found.has(i)) return;
      const dx = px - (t.x / 100) * rect.width;
      const dy = py - (t.y / 100) * rect.height;
      const d = Math.hypot(dx, dy);
      if (d < bestDist) {
        bestDist = d; best = i;
        bestRatio = d / ((t.r / 100) * rect.width);
      }
    });
    if (best < 0) return;

    taps++;
    hint.textContent = '';

    if (bestRatio <= 1) { discover(best); return; }

    const band = BANDS.find(b => bestRatio <= b.max);
    thermoFill.style.width = band.pct + '%';
    thermoFill.style.background = band.color;
    if (band.buzz) SB.vibrate(band.buzz);

    const ripple = SB.el('div', { class: 'ripple' });
    ripple.style.borderColor = band.color;
    ripple.style.left = px + 'px';
    ripple.style.top = py + 'px';
    const tag = SB.el('div', { class: 'tag', text: band.label });
    tag.style.background = band.color;
    // Keep the label fully inside the photo even when tapping near an edge.
    tag.style.left = Math.min(Math.max(px, 56), rect.width - 56) + 'px';
    tag.style.top = Math.max(py, 40) + 'px';
    layer.append(ripple, tag);
    setTimeout(() => { ripple.remove(); tag.remove(); }, 1100);

    updateCounter();
  });

  function updateCounter() {
    tapsEl.textContent = 'Taps ' + taps + ' · Found ' + found.size + '/' + round.targets.length;
  }

  function discover(i) {
    const t = round.targets[i];
    found.add(i);
    SB.vibrate([70, 40, 70]);

    const mark = SB.el('div', { class: 'found-mark' }, [SB.el('span', { text: t.label })]);
    mark.style.width = t.r * 2 + '%';
    placeAbs(mark, t.x, t.y);
    layer.append(mark);

    thermoFill.style.width = '100%';
    thermoFill.style.background = '#3a9b6e';
    renderClues();
    updateCounter();

    if (found.size === round.targets.length && !calibrate) {
      locked = true;
      roundIndex++;
      setTimeout(() => {
        if (roundIndex < cfg.rounds.length) {
          hint.textContent = 'All found. On to the next picture!';
          startRound();
        } else {
          renderDots();
          SB.win({ id: 'hunt', message: cfg.winMessage });
        }
      }, 1400);
    }
  }

  startRound();
})();
