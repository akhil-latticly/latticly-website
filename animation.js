/* =========================================================================
   Latticly — hero background animation
   Faithful reimplementation of the confident-ai.com ambient background:
     • a faint static dot grid on near-black (drawn in CSS, see #bg-grid)
     • a cursor-reactive canvas overlay: dots near the pointer light up and
       adjacent lit dots connect with short lines that "settle" into place.
   Idle state = just the static dots. All motion is driven by the cursor.
   ========================================================================= */
(function () {
  'use strict';

  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const root = getComputedStyle(document.documentElement);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- config (read from CSS vars, with confident-ai defaults) ----
  const GRID = parseInt(root.getPropertyValue('--grid-size')) || 44; // px between dots
  const HALF = GRID / 2;                                             // dot offset within a cell
  const LINE_LEN = GRID - 20;                                        // connector length (leaves a gap)
  const ACTIVE = (root.getPropertyValue('--grid-dot-active-color').trim()) || '255, 255, 255';
  const LINE = (root.getPropertyValue('--grid-line-color').trim()) || '34, 211, 238';

  let w = 0, h = 0, dpr = 1;
  const mouse = { x: -1, y: -1, active: false };
  const smooth = { x: -1, y: -1 };  // eased cursor (lerp)
  let master = 0;                   // global fade-in/out [0..1]
  const cells = new Map();          // "x,y" -> intensity [0..1]
  const settles = new Map();        // line id -> { settle, lastOpacity }
  let raf = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // deterministic per-line hash (FNV-1a) -> [0,1), picks wobble direction
  function hash(str) {
    let t = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      t ^= str.charCodeAt(i);
      t = Math.imul(t, 0x01000193);
    }
    return (t >>> 0) / 0xffffffff;
  }

  const snap = (v) => Math.round((v - HALF) / GRID) * GRID + HALF;

  // draw a connector that starts rotated and "settles" to its base angle
  function drawLine(midX, midY, baseAngle, opacity, id) {
    const dir = hash(id) < 0.5 ? -1 : 1;
    const prev = settles.get(id);
    const last = prev ? prev.lastOpacity : 0;
    let settle = prev ? prev.settle : 0;
    const delta = opacity - last;
    if (delta > 0.02 && opacity < 0.98) settle = Math.max(0, settle - 2.2 * delta);
    else settle = Math.min(1, settle + 0.02);
    settles.set(id, { settle: settle, lastOpacity: opacity });
    if (opacity < 0.02 && settle > 0.98) settles.delete(id);

    const rot = (1 - settle) * 1.2 * dir;
    ctx.strokeStyle = 'rgba(' + LINE + ', ' + opacity + ')';
    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(baseAngle + rot);
    ctx.beginPath();
    ctx.moveTo(-LINE_LEN / 2, 0);
    ctx.lineTo(LINE_LEN / 2, 0);
    ctx.stroke();
    ctx.restore();
  }

  function paintNeighborhood(cx, cy, ease) {
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const r = Math.sqrt(i * i + j * j);
        if (r > 2) continue;
        const x = cx + i * GRID;
        const y = cy + j * GRID;
        const key = x + ',' + y;
        const target = Math.min(1, (1 - r / 2) * 2);
        const cur = cells.get(key) || 0;
        if (target > cur) {
          // smoothed center eases in; raw center snaps to max (matches confident-ai)
          cells.set(key, ease ? cur + (target - cur) * 0.5 : Math.max(cur, target));
        }
      }
    }
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);

    // master opacity fades the whole effect in/out
    master = mouse.active ? Math.min(1, master + 0.024) : Math.max(0, master - 0.008);

    // ease the cursor
    if (mouse.active && mouse.x >= 0 && mouse.y >= 0) {
      if (smooth.x < 0) { smooth.x = mouse.x; smooth.y = mouse.y; }
      else {
        smooth.x += (mouse.x - smooth.x) * 0.06;
        smooth.y += (mouse.y - smooth.y) * 0.06;
      }
    }

    if (mouse.active && mouse.x >= 0 && mouse.y >= 0) {
      paintNeighborhood(snap(smooth.x), snap(smooth.y), true);  // eased trail
      paintNeighborhood(snap(mouse.x), snap(mouse.y), false);   // crisp head
    }

    // decay every lit cell
    cells.forEach((v, k) => {
      const nv = v - 0.008;
      if (nv <= 0.01) cells.delete(k);
      else cells.set(k, nv);
    });

    if (cells.size === 0 && master <= 0.001) {
      raf = requestAnimationFrame(frame);
      return;
    }

    ctx.lineWidth = 1;
    cells.forEach((v, key) => {
      const parts = key.split(',');
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      const op = v * master;

      // lit dot
      ctx.fillStyle = 'rgba(' + ACTIVE + ', ' + op + ')';
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();

      // connector to the right neighbor, if it's lit too
      const right = cells.get((x + GRID) + ',' + y) || 0;
      if (right > 0.01) {
        const o = Math.min(op, right * master);
        drawLine(x + GRID / 2, y, 0, o, x + ',' + y + '->r');
      }
      // connector to the bottom neighbor
      const down = cells.get(x + ',' + (y + GRID)) || 0;
      if (down > 0.01) {
        const o = Math.min(op, down * master);
        drawLine(x, y + GRID / 2, Math.PI / 2, o, x + ',' + y + '->d');
      }
    });

    raf = requestAnimationFrame(frame);
  }

  // ---- events ----
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  }, { passive: true });
  document.addEventListener('mouseleave', function () { mouse.active = false; });

  resize();
  if (!reduceMotion) {
    raf = requestAnimationFrame(frame);
  }
  // when reduced-motion is on we draw nothing on the canvas; the static CSS
  // dot grid (#bg-grid) still provides the confident-ai look.
})();

/* =========================================================================
   Small UI interactions: sticky-nav style, mobile menu
   ========================================================================= */
(function () {
  'use strict';

  const nav = document.getElementById('nav');
  const onScroll = function () {
    if (window.scrollY > 12) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const btn = document.getElementById('menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (btn && menu) {
    btn.addEventListener('click', function () { menu.classList.toggle('hidden'); });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { menu.classList.add('hidden'); });
    });
  }
})();
