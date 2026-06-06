/* =========================================================================
   Latticly — hero background animation
   A faint dot grid over a dark base, with two slow-drifting radial glow
   "beams" (cyan + indigo) and a cursor spotlight that brightens nearby dots.
   Inspired by the confident-ai.com ambient background.
   ========================================================================= */
(function () {
  'use strict';

  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- config ----
  const GRID = 36;            // px spacing between dots
  const DOT = 1.1;            // base dot radius
  const SPOTLIGHT = 170;      // cursor influence radius
  const BASE = 'rgba(148, 163, 184, 0.16)'; // idle dot color (slate)

  let w = 0, h = 0, dpr = 1;
  const mouse = { x: -9999, y: -9999, active: false };
  let t = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth = window.innerWidth;
    h = canvas.clientHeight = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Two drifting glow centers (used both as light and to modulate dots)
  function beam(time, ox, oy, sx, sy, radius, color) {
    const x = w * (0.5 + ox + Math.sin(time * sx) * 0.32);
    const y = h * (0.5 + oy + Math.cos(time * sy) * 0.30);
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return { x, y, radius };
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // --- drifting glow beams ---
    ctx.globalCompositeOperation = 'lighter';
    const b1 = beam(t, -0.12, -0.18, 0.7, 0.9, Math.max(w, h) * 0.45, 'rgba(34, 211, 238, 0.10)');
    const b2 = beam(t * 1.15, 0.18, 0.14, 0.9, 0.6, Math.max(w, h) * 0.40, 'rgba(99, 102, 241, 0.10)');
    ctx.globalCompositeOperation = 'source-over';

    // --- dot grid, brightened near beams + cursor ---
    for (let gx = GRID / 2; gx < w; gx += GRID) {
      for (let gy = GRID / 2; gy < h; gy += GRID) {
        let intensity = 0;

        // beam influence
        const d1 = Math.hypot(gx - b1.x, gy - b1.y);
        const d2 = Math.hypot(gx - b2.x, gy - b2.y);
        intensity += Math.max(0, 1 - d1 / (b1.radius * 0.8)) * 0.5;
        intensity += Math.max(0, 1 - d2 / (b2.radius * 0.8)) * 0.5;

        // cursor spotlight
        if (mouse.active) {
          const dm = Math.hypot(gx - mouse.x, gy - mouse.y);
          if (dm < SPOTLIGHT) intensity += (1 - dm / SPOTLIGHT) * 1.2;
        }

        intensity = Math.min(intensity, 1);

        if (intensity > 0.02) {
          // blend slate -> cyan as intensity rises
          const r = 148 + (34 - 148) * intensity;
          const g = 163 + (211 - 163) * intensity;
          const bl = 184 + (238 - 184) * intensity;
          const alpha = 0.16 + intensity * 0.75;
          ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${bl | 0}, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(gx, gy, DOT + intensity * 1.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = BASE;
          ctx.beginPath();
          ctx.arc(gx, gy, DOT, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function loop() {
    t += 0.0016;
    draw();
    requestAnimationFrame(loop);
  }

  // ---- events ----
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  }, { passive: true });
  window.addEventListener('mouseout', function () { mouse.active = false; });

  resize();
  if (reduceMotion) {
    draw(); // single static frame
  } else {
    loop();
  }
})();

/* =========================================================================
   Small UI interactions: sticky-nav style, mobile menu, smooth anchor close
   ========================================================================= */
(function () {
  'use strict';

  // Navbar background on scroll
  const nav = document.getElementById('nav');
  const onScroll = function () {
    if (window.scrollY > 12) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu toggle
  const btn = document.getElementById('menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (btn && menu) {
    btn.addEventListener('click', function () { menu.classList.toggle('hidden'); });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { menu.classList.add('hidden'); });
    });
  }
})();
