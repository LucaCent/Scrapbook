/* ==========================================================================
   Game 5 — Cipher Dial  (reveals "E")

   Technique
   - A Caesar cipher wheel drawn as SVG. The OUTER ring is fixed and carries the
     cipher alphabet; the INNER ring rotates and carries the plain alphabet.
     With the inner ring turned k steps clockwise, the plain letter sitting
     under cipher letter j is  alphabet[(j - k) mod 26],  so decoding is
         plain = (cipher - k) mod 26
     and the dial is correct exactly when k equals the round's shift.
   - Dragging: the pointer's angle around the dial centre (atan2) is tracked,
     and each move adds the *shortest* angular difference since the last
     event (wrapped into -180..180). Accumulating deltas avoids the jump that
     occurs when the pointer crosses the +/-180 degree seam.
   - On release the ring snaps to the nearest of 26 positions. The angle is
     kept cumulative (never reset to 0..360), so the snap animation takes the
     short way round.
   ========================================================================== */
(function () {
  'use strict';

  const cfg = window.GAME_CONFIG;
  const stage = SB.init(cfg);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const STEP = 360 / 26;
  const mod = (n, m) => ((n % m) + m) % m;

  // ---- Build the SVG dial ---------------------------------------------------
  function svgEl(name, attrs, parent) {
    const node = document.createElementNS(SVG_NS, name);
    for (const k of Object.keys(attrs || {})) node.setAttribute(k, attrs[k]);
    if (parent) parent.append(node);
    return node;
  }

  const svg = svgEl('svg', { viewBox: '-160 -160 320 320', class: 'dial', role: 'img', 'aria-label': 'Cipher wheel' });
  svgEl('circle', { r: 156, fill: '#fffafb', stroke: '#5a2438', 'stroke-width': 2 }, svg);       // outer ring
  svgEl('circle', { r: 120, fill: 'none', stroke: '#8c5468', 'stroke-width': 1 }, svg);

  ALPHA.split('').forEach((ch, i) => {
    const t = svgEl('text', {
      class: 'outer-letter', 'text-anchor': 'middle', 'dominant-baseline': 'central',
      transform: 'rotate(' + i * STEP + ') translate(0,-138)',
    }, svg);
    t.textContent = ch;
  });

  const ring = svgEl('g', {}, svg);                                                              // rotating group
  svgEl('circle', { r: 118, fill: '#fbdce6', stroke: '#8c5468', 'stroke-width': 1 }, ring);
  svgEl('circle', { r: 80, fill: '#fffafb', stroke: '#8c5468', 'stroke-width': 1.5 }, ring);
  ALPHA.split('').forEach((ch, i) => {
    const t = svgEl('text', {
      class: 'inner-letter', 'text-anchor': 'middle', 'dominant-baseline': 'central',
      transform: 'rotate(' + i * STEP + ') translate(0,-99)',
    }, ring);
    t.textContent = ch;
  });
  // A small mark above inner "A" so the player can see where the alphabet starts.
  svgEl('path', { d: 'M -5 -113 L 5 -113 L 0 -106 Z', fill: '#e0457b' }, ring);

  // Fixed centre picture (does not rotate), clipped to a circle.
  const defs = svgEl('defs', {}, svg);
  const clip = svgEl('clipPath', { id: 'centre-clip' }, defs);
  svgEl('circle', { r: 76 }, clip);
  const centreImg = svgEl('image', {
    href: cfg.image, x: -76, y: -76, width: 152, height: 152,
    'clip-path': 'url(#centre-clip)', preserveAspectRatio: 'xMidYMid slice',
  }, svg);
  centreImg.addEventListener('error', () => centreImg.remove());

  // Fixed pointer at 12 o'clock marking the outer reading position.
  svgEl('path', { d: 'M -7 -160 L 7 -160 L 0 -148 Z', fill: '#9c2f5f' }, svg);

  // ---- Remaining DOM -------------------------------------------------------
  const frame = SB.el('div', { class: 'frame straight dial-frame' }, [svg]);
  const message = SB.el('div', { class: 'message', 'aria-live': 'polite' });
  const answer = SB.el('input', {
    class: 'answer', type: 'text', placeholder: 'Type the message', autocomplete: 'off',
    autocapitalize: 'characters', spellcheck: 'false', enterkeyhint: 'done',
  });
  const left = SB.el('button', { class: 'btn alt step-btn', type: 'button', 'aria-label': 'Turn ring back one letter', text: '◀' });
  const right = SB.el('button', { class: 'btn alt step-btn', type: 'button', 'aria-label': 'Turn ring forward one letter', text: '▶' });
  const lock = SB.el('button', { class: 'btn', type: 'button', text: 'Lock in' });
  const controls = SB.el('div', { class: 'row' }, [left, lock, right]);
  const roundEl = SB.el('span');
  const dots = SB.el('div', { class: 'dots' });
  const hud = SB.el('div', { class: 'hud' }, [roundEl, dots]);
  const hint = SB.el('div', { class: 'hint' });
  stage.append(frame, hud, message, answer, controls, hint);

  // ---- State ---------------------------------------------------------------
  let roundIndex = 0;
  let theta = 0;           // cumulative visual rotation in degrees
  let locked = false;
  let round = cfg.rounds[0];

  const kOf = () => mod(Math.round(theta / STEP), 26);

  function applyRotation(animated) {
    ring.style.transition = animated ? 'transform .18s ease-out' : 'none';
    ring.style.transform = 'rotate(' + theta + 'deg)';
  }

  function cipherText(plain, shift) {
    return plain.toUpperCase().replace(/[A-Z]/g, ch => ALPHA[mod(ALPHA.indexOf(ch) + shift, 26)]);
  }

  // Rebuilds the message display. Called when a round starts.
  let decodedCells = [];
  function renderMessage() {
    const enc = cipherText(round.plain, round.shift);
    message.replaceChildren();
    decodedCells = [];
    enc.split(' ').forEach(word => {
      const w = SB.el('div', { class: 'word' });
      word.split('').forEach(ch => {
        const d = SB.el('div', { class: 'd' });
        decodedCells.push({ el: d, ch });
        w.append(SB.el('div', { class: 'ch' }, [SB.el('div', { class: 'c', text: ch }), d]));
      });
      message.append(w);
    });
    refreshDecoded();
  }

  function refreshDecoded() {
    const k = kOf();
    decodedCells.forEach(c => {
      c.el.textContent = round.live ? ALPHA[mod(ALPHA.indexOf(c.ch) - k, 26)] : '';
    });
  }

  function renderDots() {
    dots.replaceChildren(...cfg.rounds.map((_, i) =>
      SB.el('i', { class: (i < roundIndex ? 'on ' : '') + (i === roundIndex ? 'cur' : '') })));
    roundEl.textContent = 'Message ' + (roundIndex + 1) + ' of ' + cfg.rounds.length;
  }

  function startRound() {
    round = cfg.rounds[roundIndex];
    locked = false;
    renderDots();

    // Start the ring somewhere that is NOT already the answer.
    let k0;
    do { k0 = Math.floor(Math.random() * 26); } while (k0 === round.shift);
    theta = k0 * STEP;
    applyRotation(false);

    answer.value = '';
    answer.style.display = round.live ? 'none' : 'block';
    hint.textContent = round.hint || '';
    renderMessage();
  }

  // ---- Dragging --------------------------------------------------------------
  let lastAngle = 0;
  const angleAt = (x, y) => {
    const r = svg.getBoundingClientRect();
    return Math.atan2(y - r.height / 2, x - r.width / 2) * 180 / Math.PI;
  };

  SB.drag(svg, {
    down(x, y) { if (!locked) lastAngle = angleAt(x, y); },
    move(x, y) {
      if (locked) return;
      const a = angleAt(x, y);
      let d = a - lastAngle;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      theta += d;
      lastAngle = a;
      applyRotation(false);
      refreshDecoded();
    },
    up() {
      if (locked) return;
      theta = Math.round(theta / STEP) * STEP;          // snap to the nearest letter
      applyRotation(true);
      refreshDecoded();
      SB.vibrate(10);
    },
  });

  function nudge(dir) {
    if (locked) return;
    theta = Math.round(theta / STEP) * STEP + dir * STEP;
    applyRotation(true);
    refreshDecoded();
    SB.vibrate(8);
  }
  left.addEventListener('click', () => nudge(-1));
  right.addEventListener('click', () => nudge(1));

  // ---- Checking the answer ---------------------------------------------------
  const letters = s => s.toUpperCase().replace(/[^A-Z]/g, '');

  function attempt() {
    if (locked) return;
    const correct = round.live
      ? kOf() === round.shift
      : letters(answer.value) === letters(round.plain);

    if (!correct) {
      SB.vibrate([20, 40, 20]);
      frame.classList.remove('shake'); void frame.offsetWidth; frame.classList.add('shake');
      hint.textContent = round.live
        ? 'Not quite. Keep turning until the message makes sense.'
        : 'Not quite. Check the key, then read the message off the dial.';
      return;
    }

    locked = true;
    // Show the plain text in the decoded row as a reward, even in typed rounds.
    const plainLetters = letters(round.plain);
    decodedCells.forEach((c, i) => { c.el.textContent = plainLetters[i]; });
    // Settle on the true position, choosing the equivalent angle (a multiple of
    // 360deg away) that is closest to the current one so the ring turns the short way.
    const base = round.shift * STEP;
    theta = base + Math.round((theta - base) / 360) * 360;
    applyRotation(true);
    SB.vibrate(60);
    hint.textContent = 'Decoded!';
    roundIndex++;
    setTimeout(() => {
      if (roundIndex < cfg.rounds.length) startRound();
      else { renderDots(); SB.win({ id: 'cipher', message: cfg.winMessage }); }
    }, 1400);
  }

  lock.addEventListener('click', attempt);
  answer.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });

  startRound();
})();
