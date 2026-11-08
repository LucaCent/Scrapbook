/* ==========================================================================
   Game 2 — Twist & Turn  (reveals "L")

   Technique
   - The photo is cropped to the board's aspect ratio (so every tile is an
     exact square), then each tile gets its own small canvas holding its slice.
   - A quarter-turn is stored as an integer 0..3 (the *logical* state used for
     the win check) and as a cumulative angle in degrees (the *visual* state).
     Keeping the angle cumulative means the CSS transition always spins
     clockwise; going from 270deg to 0deg would otherwise spin backwards.
   - Every orientation is reachable from every other, so any random shuffle
     is guaranteed solvable.
   ========================================================================== */
(function () {
  'use strict';

  const cfg = window.GAME_CONFIG;
  const stage = SB.init(cfg);
  const TILE_PX = 220;                 // internal resolution of each tile canvas

  const board = SB.el('div', { class: 'board' });
  const frame = SB.el('div', { class: 'frame straight' }, [board]);
  const movesEl = SB.el('span');
  const dots = SB.el('div', { class: 'dots' });
  const hud = SB.el('div', { class: 'hud' }, [movesEl, dots]);
  const hint = SB.el('div', { class: 'hint', text: 'Tap a tile to rotate it.' });
  stage.append(frame, hud, hint);

  let levelIndex = 0;
  let rot = [];        // logical orientation per tile: 0..3 (quarter-turns clockwise)
  let angle = [];      // visual cumulative angle per tile, in degrees
  let tiles = [];      // <button> elements
  let moves = 0;
  let locked = true;

  function renderDots() {
    dots.replaceChildren(...cfg.levels.map((_, i) =>
      SB.el('i', { class: (i < levelIndex ? 'on ' : '') + (i === levelIndex ? 'cur' : '') })));
  }

  function updateStatus() {
    const right = rot.filter(r => r === 0).length;
    movesEl.innerHTML = 'Moves <strong>' + moves + '</strong> · Upright <strong>' +
      right + '/' + rot.length + '</strong>';
  }

  function paintTileState(i) {
    tiles[i].classList.toggle('ok', cfg.showCorrect && rot[i] === 0);
  }

  async function startLevel() {
    locked = true;
    renderDots();
    board.classList.remove('solved');
    board.replaceChildren();

    const level = cfg.levels[levelIndex];
    let image;
    try { image = await SB.loadImage(level.image); }
    catch (e) { SB.fail(e.message + ' (check games/rotate/config.js)'); return; }

    const { cols, rows } = level;
    const n = cols * rows;
    board.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    board.style.width = 'min(100%, ' + ((cols / rows) * 62).toFixed(1) + 'vh)';

    // Crop the photo to the board's aspect ratio so tiles are exact squares.
    const { sx, sy, sw, sh } = SB.coverRect(image.naturalWidth, image.naturalHeight, cols / rows);
    const tw = sw / cols, th = sh / rows;

    // Shuffle: random orientation per tile, but insist that most tiles are
    // wrong so the puzzle is never trivially (or already) solved.
    const rand = SB.rng();
    do {
      rot = Array.from({ length: n }, () => Math.floor(rand() * 4));
    } while (rot.filter(r => r !== 0).length < Math.ceil(n * 0.75));
    angle = rot.map(r => r * 90);

    tiles = [];
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const cv = document.createElement('canvas');
      cv.width = cv.height = TILE_PX;
      cv.getContext('2d').drawImage(image, sx + c * tw, sy + r * th, tw, th, 0, 0, TILE_PX, TILE_PX);
      cv.style.transition = 'none';
      cv.style.transform = 'rotate(' + angle[i] + 'deg)';

      const btn = SB.el('button', { class: 'tile', type: 'button', 'aria-label': 'Tile ' + (i + 1) + ', rotate' });
      btn.append(cv);
      btn.addEventListener('click', () => rotateTile(i));
      board.append(btn);
      tiles.push(btn);
      paintTileState(i);
    }
    // Re-enable transitions on the next frame so the initial pose does not animate.
    requestAnimationFrame(() => requestAnimationFrame(() => tiles.forEach(t => { t.firstChild.style.transition = ''; })));

    moves = 0;
    updateStatus();
    locked = false;
  }

  function rotateTile(i) {
    if (locked) return;
    rot[i] = (rot[i] + 1) % 4;
    angle[i] += 90;
    tiles[i].firstChild.style.transform = 'rotate(' + angle[i] + 'deg)';
    moves++;
    paintTileState(i);
    updateStatus();
    SB.vibrate(8);
    if (rot.every(r => r === 0)) solved();
  }

  function solved() {
    locked = true;
    hint.textContent = '';
    setTimeout(() => {
      board.classList.add('solved');              // closes the gaps between tiles
      levelIndex++;
      setTimeout(() => {
        if (levelIndex < cfg.levels.length) {
          hint.textContent = 'Lovely. One more!';
          startLevel();
        } else {
          renderDots();
          SB.win({ id: 'rotate', message: cfg.winMessage });
        }
      }, 1300);
    }, 350);
  }

  startLevel();
})();
