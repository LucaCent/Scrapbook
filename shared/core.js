/* ==========================================================================
   Scrapbook games — shared core library (global namespace: SB)

   Responsibilities
     1. Game registry      — which game reveals which letter of "I LOVE U".
     2. Progress storage   — collected letters, kept in localStorage.
     3. Helpers            — image loading, seeded RNG, pointer handling,
                             canvas DPR scaling, haptics.
     4. Win overlay        — reveals the letter, shows progress, spawns hearts.
     5. Offline support    — registers the service worker (http/https only).
   ========================================================================== */
(function () {
  'use strict';

  const SB = {};
  window.SB = SB;

  /* ---- 1. Registry ------------------------------------------------------ */
  // The ORDER here is the order the letters appear in "I LOVE U".
  // Paths are relative to the site root, so they work under any GitHub Pages
  // sub-path (https://user.github.io/repo/...).
  SB.GAMES = [
    { id: 'scratch',    letter: 'I', title: 'Scratch Card',    path: 'games/scratch/' },
    { id: 'rotate',     letter: 'L', title: 'Twist & Turn',    path: 'games/rotate/' },
    { id: 'hunt',       letter: 'O', title: 'Hot & Cold Hunt', path: 'games/hunt/' },
    { id: 'wordsearch', letter: 'V', title: 'Word Search',     path: 'games/wordsearch/' },
    { id: 'cipher',     letter: 'E', title: 'Cipher Dial',     path: 'games/cipher/' },
    { id: 'paint',      letter: 'U', title: 'Paint by Numbers', path: 'games/paint/' },
  ];

  // Root URL of the site, derived from this script's own URL (…/shared/core.js).
  const scriptEl = document.currentScript;
  SB.root = scriptEl ? new URL('../', scriptEl.src).href : './';

  /* ---- 2. Progress storage --------------------------------------------- */
  const LS_KEY = 'scrapbook-letters-v1';

  SB.getLetters = function () {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
    catch (e) { return {}; }             // private mode / blocked storage
  };
  SB.saveLetter = function (id, letter) {
    try {
      const all = SB.getLetters();
      all[id] = letter;
      localStorage.setItem(LS_KEY, JSON.stringify(all));
    } catch (e) { /* storage unavailable: the game still works */ }
  };
  SB.resetLetters = function () {
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
  };

  /* ---- 3. Helpers ------------------------------------------------------- */
  SB.$ = (sel, root) => (root || document).querySelector(sel);

  SB.el = function (tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const k of Object.keys(props)) {
        if (k === 'class') node.className = props[k];
        else if (k === 'text') node.textContent = props[k];
        else if (k === 'style') Object.assign(node.style, props[k]);
        else node.setAttribute(k, props[k]);
      }
    }
    (children || []).forEach(c => node.append(c));
    return node;
  };

  // Seeded PRNG (mulberry32): deterministic when given a seed, which makes
  // puzzles reproducible while debugging.
  SB.rng = function (seed) {
    let a = (seed === undefined ? (Math.random() * 2 ** 32) : seed) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  SB.shuffle = function (arr, rand) {
    rand = rand || Math.random;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  SB.loadImage = function (src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load image: ' + src));
      img.src = src;
    });
  };

  // Largest centred source rectangle of an image having the target aspect
  // ratio (the equivalent of CSS object-fit: cover, for canvas drawImage).
  SB.coverRect = function (iw, ih, targetAspect) {
    let sw = iw, sh = iw / targetAspect;
    if (sh > ih) { sh = ih; sw = ih * targetAspect; }
    return { sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw, sh };
  };

  // Size a canvas for crisp rendering on high-DPI screens. Returns the 2D
  // context already scaled, so you keep drawing in CSS pixels.
  SB.fitCanvas = function (canvas, cssW, cssH, maxDpr) {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr || 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  };

  // Unified pointer handling (mouse + touch + pen) with pointer capture.
  // Callbacks receive (x, y, event) in CSS pixels relative to `el`.
  SB.drag = function (el, handlers) {
    el.style.touchAction = 'none';       // stop the browser scrolling mid-gesture
    let active = false;
    const local = e => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    el.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      active = true;
      el.setPointerCapture(e.pointerId);
      const [x, y] = local(e);
      handlers.down && handlers.down(x, y, e);
    });
    el.addEventListener('pointermove', e => {
      if (!active) return;
      const [x, y] = local(e);
      handlers.move && handlers.move(x, y, e);
    });
    const end = e => {
      if (!active) return;
      active = false;
      const [x, y] = local(e);
      handlers.up && handlers.up(x, y, e);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  };

  SB.vibrate = function (pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  };

  /* ---- Page bootstrap --------------------------------------------------- */
  // Fills the shared header and returns the <main> container.
  SB.init = function (cfg) {
    document.title = cfg.title + ' — Scrapbook';
    const t = SB.$('#title'), s = SB.$('#subtitle');
    if (t) t.textContent = cfg.title;
    if (s) s.textContent = cfg.subtitle || '';
    return SB.$('#stage');
  };

  SB.fail = function (message) {
    const stage = SB.$('#stage') || document.body;
    stage.append(SB.el('div', { class: 'error-box', text: message }));
    console.error(message);
  };

  /* ---- 4. Win overlay --------------------------------------------------- */
  function spawnHearts(count) {
    const glyphs = ['❤', '♥', '♡'];
    for (let i = 0; i < count; i++) {
      const h = SB.el('div', { class: 'heart', text: glyphs[i % glyphs.length] });
      const dur = 2.2 + Math.random() * 2.2;
      Object.assign(h.style, {
        left: Math.random() * 100 + 'vw',
        fontSize: 18 + Math.random() * 26 + 'px',
        color: ['#e0457b', '#f59ab8', '#ff6f9c', '#c2185b'][i % 4],
        animationDuration: dur + 's',
        animationDelay: Math.random() * 0.8 + 's',
      });
      document.body.append(h);
      setTimeout(() => h.remove(), (dur + 1) * 1000);
    }
  }

  function progressMarkup() {
    // Renders "I _ _ _ _ _" style progress with a gap between "I" and "LOVE U".
    const got = SB.getLetters();
    const frag = document.createDocumentFragment();
    SB.GAMES.forEach((g, i) => {
      const span = SB.el('span', { text: got[g.id] ? g.letter : '_' });
      if (!got[g.id]) span.className = 'missing';
      frag.append(span);
      if (i === 0 || i === 4) frag.append(SB.el('span', { class: 'space' }));
    });
    return frag;
  }

  // opts: { id, message }
  SB.win = function (opts) {
    const game = SB.GAMES.find(g => g.id === opts.id);
    if (!game) { console.error('Unknown game id', opts.id); return; }
    SB.saveLetter(game.id, game.letter);
    SB.vibrate([60, 40, 60, 40, 160]);
    spawnHearts(26);

    const progress = SB.el('div', { class: 'progress' });
    progress.append(progressMarkup());

    const card = SB.el('div', { class: 'card', role: 'dialog', 'aria-live': 'polite' }, [
      SB.el('p', { class: 'kicker', text: 'You found a letter' }),
      SB.el('div', { class: 'big-letter', text: game.letter }),
      SB.el('p', { class: 'msg', text: opts.message || 'Well done!' }),
      progress,
      SB.el('div', { class: 'row' }, [
        SB.el('a', { class: 'btn alt', href: SB.root + 'index.html', text: 'All letters' }),
        SB.el('button', { class: 'btn ghost', type: 'button', text: 'Play again' }),
      ]),
    ]);
    card.querySelector('button').addEventListener('click', () => location.reload());
    document.body.append(SB.el('div', { class: 'overlay' }, [card]));
  };

  /* ---- 5. Offline support ----------------------------------------------- */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(SB.root + 'sw.js').catch(err =>
        console.warn('Service worker registration failed:', err));
    });
  }
})();
