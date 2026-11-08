/* ==========================================================================
   Game 1 — Scratch Card  (reveals "I")

   Technique
   - Two stacked layers: the photo (<img>) underneath, a <canvas> of "foil" on top.
   - Scratching uses globalCompositeOperation = 'destination-out', which turns
     the pixels under the brush transparent instead of painting over them.
   - Coverage is measured on a tiny 64-px-wide "mask" canvas that receives the
     same strokes, scaled down. Reading ~5,000 pixels is far cheaper than
     calling getImageData on a full-resolution phone canvas (>1 million px).
   - Canvas coordinates are derived from the *current* bounding box on every
     event, so rotating the phone or resizing the window never misaligns it.
   ========================================================================== */
(function () {
  'use strict';

  const cfg = window.GAME_CONFIG;
  const stage = SB.init(cfg);

  const MASK_W = 64;

  // ---- DOM ---------------------------------------------------------------
  const wrap = SB.el('div', { class: 'scratch-wrap' });
  const img = SB.el('img', { alt: '', draggable: 'false' });
  const canvas = SB.el('canvas');
  wrap.append(img, canvas);

  const caption = SB.el('p', { class: 'caption' });
  // 'straight' = no decorative tilt, so pointer coordinates map exactly onto the canvas.
  const frame = SB.el('div', { class: 'frame straight' }, [wrap, caption]);

  const progressText = SB.el('span');
  const dots = SB.el('div', { class: 'dots' });
  const hud = SB.el('div', { class: 'hud' }, [progressText, dots]);
  const hint = SB.el('div', { class: 'hint', text: 'Use your finger to scratch.' });
  stage.append(frame, hud, hint);

  const ctx = canvas.getContext('2d');
  const mask = document.createElement('canvas');
  const mctx = mask.getContext('2d');

  // ---- Round state -------------------------------------------------------
  let roundIndex = 0;
  let locked = true;        // true while loading / transitioning
  let last = null;          // last stroke point in canvas pixels
  let lastCheck = 0;

  function renderDots() {
    dots.replaceChildren(...cfg.rounds.map((_, i) =>
      SB.el('i', { class: (i < roundIndex ? 'on ' : '') + (i === roundIndex ? 'cur' : '') })));
  }

  // Paints the opaque "foil" layer: metallic gradient, diagonal sheen, sparkle
  // dots and repeated "scratch me" text in the hand-written font.
  function drawFoil(w, h) {
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createLinearGradient(0, 0, w, h);
    // Rose-gold foil: alternating dark and light stops create the metallic sheen.
    g.addColorStop(0.00, '#e3a1b4');
    g.addColorStop(0.35, '#fbe0e7');
    g.addColorStop(0.65, '#d98ba3');
    g.addColorStop(1.00, '#f6c9d5');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = Math.max(2, w / 90);
    for (let x = -h; x < w; x += w / 9) {
      ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h, 0); ctx.stroke();
    }

    const rand = SB.rng(7);                 // fixed seed: same sparkle each round
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 260; i++) {
      ctx.fillRect(rand() * w, rand() * h, 1.5 + rand() * 2.5, 1.5 + rand() * 2.5);
    }

    ctx.fillStyle = 'rgba(140,40,80,.45)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = Math.round(w / 11) + 'px "Bradley Hand","Segoe Script","Comic Sans MS",cursive';
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      ctx.fillText(r % 2 ? '♥  scratch me  ♥' : 'scratch here', w / 2, (h * (r + 0.5)) / rows);
    }
  }

  async function startRound() {
    locked = true;
    renderDots();
    const round = cfg.rounds[roundIndex];
    progressText.textContent = 'Progress 0%';
    caption.textContent = '';

    let image;
    try { image = await SB.loadImage(round.image); }
    catch (e) { SB.fail(e.message + ' (check games/scratch/config.js)'); return; }

    const ratio = image.naturalWidth / image.naturalHeight;
    img.src = round.image;
    // Fit by width, but never taller than ~62% of the viewport height.
    wrap.style.width = 'min(100%, ' + (ratio * 62).toFixed(1) + 'vh)';
    wrap.style.aspectRatio = image.naturalWidth + ' / ' + image.naturalHeight;

    // Resolution of the foil canvas: CSS size x devicePixelRatio (capped at 2).
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));

    mask.width = MASK_W;
    mask.height = Math.max(1, Math.round(MASK_W / ratio));
    mctx.clearRect(0, 0, mask.width, mask.height);

    canvas.style.transition = 'none';
    canvas.style.opacity = '1';
    drawFoil(canvas.width, canvas.height);

    caption.textContent = round.caption || '';
    last = null;
    locked = false;
  }

  // ---- Scratching --------------------------------------------------------
  // Converts CSS-pixel pointer coordinates to canvas pixels using the live rect.
  function toCanvas(x, y) {
    const r = canvas.getBoundingClientRect();
    return [x * (canvas.width / r.width), y * (canvas.height / r.height)];
  }

  function stroke(x0, y0, x1, y1) {
    const r = canvas.getBoundingClientRect();
    const radius = cfg.brushRadius * (canvas.width / r.width);
    const k = mask.width / canvas.width;          // canvas px -> mask px

    // Erase from the visible foil.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.lineWidth = radius * 2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath(); ctx.arc(x1, y1, radius, 0, Math.PI * 2); ctx.fill();

    // Mirror the same stroke on the small mask (painted, not erased).
    mctx.globalCompositeOperation = 'source-over';
    mctx.strokeStyle = mctx.fillStyle = '#000';
    mctx.lineCap = mctx.lineJoin = 'round';
    mctx.lineWidth = radius * 2 * k;
    mctx.beginPath(); mctx.moveTo(x0 * k, y0 * k); mctx.lineTo(x1 * k, y1 * k); mctx.stroke();
    mctx.beginPath(); mctx.arc(x1 * k, y1 * k, radius * k, 0, Math.PI * 2); mctx.fill();
  }

  // Fraction of the mask that has been scratched (alpha channel > 50%).
  function coverage() {
    const d = mctx.getImageData(0, 0, mask.width, mask.height).data;
    let hit = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 128) hit++;
    return hit / (d.length / 4);
  }

  function checkProgress(force) {
    const now = performance.now();
    if (!force && now - lastCheck < 120) return;      // throttle during drags
    lastCheck = now;
    const c = coverage();
    const shown = Math.min(100, Math.round((c / cfg.revealThreshold) * 100));
    progressText.textContent = 'Progress ' + shown + '%';
    if (c >= cfg.revealThreshold && !locked) finishRound();
  }

  function finishRound() {
    locked = true;
    SB.vibrate(40);
    canvas.style.transition = 'opacity .6s ease';
    canvas.style.opacity = '0';                       // fade away the remaining foil
    roundIndex++;
    setTimeout(() => {
      if (roundIndex < cfg.rounds.length) {
        hint.textContent = 'Nice. Next photo!';
        startRound();
      } else {
        renderDots();
        SB.win({ id: 'scratch', message: cfg.winMessage });
      }
    }, 1100);
  }

  SB.drag(canvas, {
    down(x, y) {
      if (locked) return;
      hint.textContent = '';
      const [cx, cy] = toCanvas(x, y);
      last = [cx, cy];
      stroke(cx, cy, cx, cy);
    },
    move(x, y) {
      if (locked || !last) return;
      const [cx, cy] = toCanvas(x, y);
      stroke(last[0], last[1], cx, cy);
      last = [cx, cy];
      checkProgress(false);
    },
    up() {
      last = null;
      if (!locked) checkProgress(true);
    },
  });

  startRound();
})();
