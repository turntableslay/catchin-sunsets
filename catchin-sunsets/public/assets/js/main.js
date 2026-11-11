/* Catchin' Sunsets — hero scene, crowd marquee and signup form. No dependencies. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hero = $('hero'), stage = $('stage'), sky = $('sky'), scene = $('scene');
  const halo = $('halo'), sunA = $('sunA'), sunB = $('sunB');
  const hoodG = $('hood'), farG = $('far'), planesG = $('planes'), cityG = $('city'), winsG = $('wins');
  const bridgeG = $('bridge'), river = $('river'), glintG = $('glint'), lightsG = $('lights'), deckG = $('deck'), ground = $('ground');
  const intro = $('intro'), lock = $('lock');

  /* ---------- helpers ---------- */
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { a = hex(a); b = hex(b); return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')'; };
  const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

  /* Sky runs from golden hour (pink over amber) to dusk (plum over the logo orange). */
  const K = [
    [0,   '#D9567E', '#F49A4C', '#FFD08A'],
    [0.5, '#9E3A70', '#F0703A', '#FFB45E'],
    [0.85,'#3E1F5C', '#B8336B', '#F26B1D'],
    [1,   '#2A1A45', '#9E2D66', '#EE6A2A']
  ];
  function skyAt(p) { let i = 0; while (i < K.length - 2 && p > K[i + 1][0]) i++; const a = K[i], b = K[i + 1], t = clamp((p - a[0]) / (b[0] - a[0])); return [1, 2, 3].map((j) => mix(a[j], b[j], t)); }

  /* ---------- scene geometry ---------- */
  let W = 0, H = 0, R = 80, BASE = 0, RIVER_B = 0, RAIL = 0, SX = 0, SX0 = 0, SY0 = 0, SY1 = 0, HS = 0;

  // Portland landmarks drawn as silhouettes. x = centre (fraction of width), w = width fraction, h = height (fraction of HS).
  const LANDMARKS = [
    { x: 0.385, w: 0.042, h: 0.24, type: 'koin' },        // KOIN Center, pyramid roof
    { x: 0.455, w: 0.055, h: 0.33, type: 'wellsfargo' },  // Wells Fargo Center
    { x: 0.535, w: 0.06,  h: 0.34, type: 'bigpink' },     // U.S. Bancorp Tower, "Big Pink"
    { x: 0.61,  w: 0.045, h: 0.22, type: 'step' },
    { x: 0.325, w: 0.04,  h: 0.17, type: 'antenna' },
    { x: 0.675, w: 0.04,  h: 0.18, type: 'slant' },
  ];

  function towerPath(x, w, top, type) {
    const b = BASE + 2;
    switch (type) {
      case 'koin': { const r = w * 0.7; return `M${x},${b}V${top + r}h${w * 0.1}V${top + r * 0.6}h${w * 0.8}V${top + r}h${w * 0.1}V${b}Z M${x + w * 0.1},${top + r * 0.6}L${x + w / 2},${top - r * 0.2}L${x + w * 0.9},${top + r * 0.6}Z M${x + w / 2 - 1},${top - r * 0.2}h2v${-w * 0.6}h-2Z`; }
      case 'wellsfargo': return `M${x},${b}V${top}h${w}V${b}Z M${x + w * 0.3},${top}v${-w * 0.25}h${w * 0.4}v${w * 0.25}Z`;
      case 'bigpink': { const c = w * 0.18; return `M${x},${b}V${top + c * 2}L${x + c},${top + c}V${top}h${w - 2 * c}V${top + c}L${x + w},${top + c * 2}V${b}Z`; }
      case 'step': { const s = w * 0.18; return `M${x},${b}V${top + w * 0.9}h${s}V${top + w * 0.45}h${s}V${top}h${w - 4 * s}V${top + w * 0.45}h${s}V${top + w * 0.9}h${s}V${b}Z`; }
      case 'slant': return `M${x},${b}V${top + w * 0.7}L${x + w},${top}V${b}Z`;
      case 'antenna': return `M${x},${b}V${top}h${w}V${b}Z M${x + w * 0.5 - 1.2},${top}v${-w * 1.1}h2.4v${w * 1.1}Z`;
      default: return `M${x},${b}V${top}h${w}V${b}Z`;
    }
  }
  function windows(x, w, top, r) {
    let d = '';
    const stepY = Math.max(8, H * 0.014), stepX = Math.max(7, w / 5);
    for (let wy = top + w * 0.5; wy < BASE - 6; wy += stepY)
      for (let wx = x + 3; wx < x + w - 5; wx += stepX) if (r() > 0.6) d += `M${wx.toFixed(1)},${wy.toFixed(1)}h3v4h-3Z`;
    return d;
  }

  function buildCity() {
    [hoodG, farG, cityG, winsG, bridgeG, glintG, lightsG, deckG].forEach((g) => (g.innerHTML = ''));
    const r = rng(23);

    // Mt. Hood behind the city
    const hx = W * 0.8, hy = BASE - HS * 0.34, hw = Math.max(W * 0.22, 160);
    el('path', { d: `M${hx - hw},${BASE} L${hx - hw * 0.12},${hy + HS * 0.03} L${hx},${hy} L${hx + hw * 0.08},${hy + HS * 0.025} L${hx + hw},${BASE} Z`, id: 'hoodBody' }, hoodG);
    el('path', { d: `M${hx - hw * 0.12},${hy + HS * 0.03} L${hx},${hy} L${hx + hw * 0.08},${hy + HS * 0.025} L${hx + hw * 0.2},${hy + HS * 0.07} L${hx + hw * 0.07},${hy + HS * 0.055} L${hx - hw * 0.02},${hy + HS * 0.08} L${hx - hw * 0.2},${hy + HS * 0.075} Z`, fill: '#FFF3E4', opacity: 0.65 }, hoodG);

    // far hazy blocks
    let fd = '', x = -10;
    while (x < W + 10) { const w = W * (0.025 + r() * 0.035), h = HS * (0.05 + r() * 0.12); fd += towerPath(x, w, BASE - h, 'flat'); x += w + W * 0.003; }
    el('path', { d: fd }, farG);

    // near city: filler blocks, then landmarks on top
    let nd = '', wd = '';
    x = -6;
    while (x < W + 6) {
      const w = Math.max(14, W * (0.022 + r() * 0.03));
      const c = (x + w / 2) / W;
      const core = c > 0.3 && c < 0.7;
      const h = HS * (core ? 0.07 + r() * 0.1 : 0.03 + r() * 0.08);
      nd += towerPath(x, w, BASE - h, r() > 0.85 ? 'antenna' : 'flat');
      wd += windows(x, w, BASE - h, r);
      x += w + (r() > 0.8 ? W * 0.004 : 0);
    }
    let pink = '';
    LANDMARKS.forEach((L) => {
      const w = Math.max(16, W * L.w), x0 = W * L.x - w / 2, top = BASE - HS * L.h;
      const d = towerPath(x0, w, top, L.type);
      if (L.type === 'bigpink') pink = d; else nd += d;
      wd += windows(x0, w, top + (L.type === 'koin' ? w * 0.7 : 0), r);
    });
    el('path', { d: nd, id: 'cityBody' }, cityG);
    el('path', { d: pink, id: 'bigPink' }, cityG);
    el('path', { d: wd }, winsG);

    // Fremont Bridge (tied arch) on the left, over the Willamette
    const bx0 = -W * 0.02, bx1 = W * 0.27, by = BASE - HS * 0.02, ba = HS * 0.17;
    let hangers = '';
    for (let i = 1; i < 12; i++) { const t = i / 12, hx2 = bx0 + (bx1 - bx0) * t, ay = by - ba * 4 * t * (1 - t); hangers += `M${hx2.toFixed(1)},${by}V${ay.toFixed(1)}`; }
    el('path', { d: `M${bx0},${by} Q${(bx0 + bx1) / 2},${by - ba * 2} ${bx1},${by}`, 'stroke-width': Math.max(3, W * 0.004), id: 'arch' }, bridgeG);
    el('path', { d: `M${bx0 - 20},${by}H${bx1 + 30}`, 'stroke-width': Math.max(4, W * 0.005), id: 'bdeck' }, bridgeG);
    el('path', { d: hangers, 'stroke-width': 1.2, id: 'hangers' }, bridgeG);

    // river
    river.setAttribute('x', 0); river.setAttribute('y', BASE); river.setAttribute('width', W); river.setAttribute('height', H - BASE);

    // sun glint on the river
    for (let i = 0; i < 6; i++) {
      const gw = R * (1.5 - i * 0.2) * (0.7 + r() * 0.4), gy = BASE + (RIVER_B - BASE) * (0.15 + i * 0.14);
      el('rect', { x: SX - gw / 2, y: gy, width: gw, height: Math.max(2, H * 0.004), rx: 2 }, glintG);
    }

    buildRooftop(r);

    // cream wave at the very bottom, cut like the logo's wave
    const g = H - H * 0.035, a = H * 0.018;
    ground.setAttribute('d', `M0,${g} C${W * 0.18},${g - a} ${W * 0.3},${g + a} ${W * 0.45},${g + a * 0.6} S${W * 0.68},${g - a * 1.2} ${W * 0.8},${g} S${W * 0.95},${g + a} ${W},${g - a * 0.3} V${H + 4} H0 Z`);
  }

  /* ---------- rooftop: railing and string lights ---------- */
  function buildRooftop(r) {
    // string lights swag
    const y0 = H * 0.66, sag = H * 0.07;
    const pts = (t) => [W * (-0.02 + 1.04 * t), y0 + sag * 4 * t * (1 - t) + (t < 0.5 ? 0 : 0)];
    let wire = `M${pts(0)[0]},${pts(0)[1]}`;
    for (let i = 1; i <= 40; i++) { const [px, py] = pts(i / 40); wire += `L${px.toFixed(1)},${py.toFixed(1)}`; }
    el('path', { d: wire, stroke: '#2A1424', 'stroke-width': 1.2, fill: 'none', opacity: 0.7 }, lightsG);
    const bulbs = el('g', { id: 'bulbs' }, lightsG);
    const n = Math.max(12, Math.round(W / 55));
    for (let i = 1; i < n; i++) {
      const [px, py] = pts(i / n);
      el('circle', { cx: px, cy: py + 5, r: 12, fill: 'url(#bulbGlow)', class: 'bglow' }, bulbs);
      el('circle', { cx: px, cy: py + 5, r: 2.6, fill: '#FFE7B5' }, bulbs);
    }

    // railing + deck floor
    const floorY = H * 0.94;
    el('rect', { x: 0, y: RAIL, width: W, height: floorY - RAIL, fill: '#3A1838', opacity: 0.45, id: 'glass' }, deckG);
    el('path', { d: `M0,${RAIL}H${W}`, stroke: '#2A1424', 'stroke-width': 4 }, deckG);
    el('path', { d: `M0,${RAIL - 1.5}H${W}`, stroke: '#F7924A', 'stroke-width': 1.2, opacity: 0.6, id: 'railGlow' }, deckG);
    let posts = '';
    for (let px = 0; px <= W; px += Math.max(60, W / 14)) posts += `M${px.toFixed(1)},${RAIL}V${floorY}`;
    el('path', { d: posts, stroke: '#2A1424', 'stroke-width': 3 }, deckG);
    el('rect', { x: 0, y: floorY, width: W, height: H - floorY, fill: '#24112A' }, deckG);

  }

  /* ---------- planes ---------- */
  const PLANES = [
    { y: 0.14, speed: 0.022, dir: 1,  climb: 0,     size: 1,   phase: 0.15 },
    { y: 0.27, speed: 0.016, dir: -1, climb: 0,     size: 0.8, phase: 0.55 },
    { y: 0.5,  speed: 0.03,  dir: -1, climb: 0.35,  size: 1.1, phase: 0.85 }   // climbing out, like a departure from PDX
  ];
  let planeEls = [];
  function buildPlanes() {
    planesG.innerHTML = ''; planeEls = [];
    PLANES.forEach(() => {
      const g = el('g', {}, planesG);
      const trail = el('path', { stroke: '#FFF3E4', 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round', opacity: 0.55 }, g);
      const body = el('g', {}, g);
      el('path', { d: 'M-14,0 Q-14,-2.2 -10,-2.2 L10,-1.6 Q15,-1 16,0 Q15,1 10,1.6 L-10,2.2 Q-14,2.2 -14,0 Z M-2,-1.5 L-7,-11 L-3.5,-11 L5,-1.5 Z M-2,1.5 L-7,9 L-3.5,9 L5,1.5 Z M-11,-1.6 L-15,-7 L-12.5,-7 L-8,-1.6 Z', fill: '#2A1424' }, body);
      const blink = el('circle', { cx: 0, cy: -10, r: 1.4, fill: '#FF5A4A' }, body);
      planeEls.push({ g, trail, body, blink });
    });
  }
  function drawPlanes(t, p) {
    const span = W + 400;
    PLANES.forEach((P, i) => {
      const e = planeEls[i]; if (!e) return;
      const k = ((t * P.speed + P.phase) % 1 + 1) % 1;
      const x = P.dir > 0 ? -200 + span * k : W + 200 - span * k;
      const y = H * P.y - P.climb * H * k * 0.8;
      const s = Math.max(0.9, W / 900) * P.size;
      const dx = P.dir * span, dy = -P.climb * H * 0.8, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      e.body.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${s.toFixed(2)},${(P.dir < 0 ? -s : s).toFixed(2)})`);
      const len = 170 * s;
      e.trail.setAttribute('d', `M${(x - ux * 14 * s).toFixed(1)},${(y - uy * 14 * s).toFixed(1)} L${(x - ux * len).toFixed(1)},${(y - uy * len).toFixed(1)}`);
      e.trail.setAttribute('opacity', (0.25 + 0.35 * (1 - p)).toFixed(2));
      e.blink.setAttribute('opacity', Math.floor(t * 1.4 + i) % 2 ? 1 : 0.15);
    });
  }

  /* ---------- layout + scroll render ---------- */
  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    scene.setAttribute('viewBox', `0 0 ${W} ${H}`);
    HS = Math.min(H, W * 0.95);
    BASE = H * 0.72; RIVER_B = H * 0.82; RAIL = H * 0.87;
    R = Math.min(W * 0.16, H * 0.16); SX = W * 0.5;
    const wide = W / H > 1.1, ib = intro.offsetTop + intro.offsetHeight;
    SX0 = wide ? W * 0.84 : SX;
    SY0 = wide ? H * 0.26 : Math.min(ib + R * 1.05, BASE - R * 1.4);
    SY1 = BASE - R * 0.25;
    sunA.setAttribute('r', R); sunB.setAttribute('r', R * 0.8);
    halo.setAttribute('r', Math.max(W, H) * 0.7);
    buildCity(); buildPlanes();
  }

  let P = 0;
  function render(p) {
    P = p;
    const [a, b, c] = skyAt(p);
    sky.style.background = `linear-gradient(180deg,${a} 0%,${b} 58%,${c} 100%)`;
    const sp = ease(clamp(p / 0.82));
    const sy = SY0 + (SY1 - SY0) * sp;
    const sx = SX0 + (SX - SX0) * sp;
    sunA.setAttribute('cy', sy); sunB.setAttribute('cy', sy + R * 0.06);
    [sunA, sunB, halo].forEach((c) => c.setAttribute('cx', sx));
    halo.setAttribute('cy', sy); halo.setAttribute('opacity', (0.45 + 0.55 * sp).toFixed(3));
    const dusk = clamp(p / 0.95);
    hoodG.querySelector('#hoodBody')?.setAttribute('fill', mix('#C77C93', '#7A3561', dusk));
    farG.setAttribute('fill', mix('#B5607E', '#6E2A5A', dusk)); farG.setAttribute('opacity', 0.75);
    const near = mix('#4A2340', '#21102A', dusk);
    cityG.querySelector('#cityBody')?.setAttribute('fill', near);
    cityG.querySelector('#bigPink')?.setAttribute('fill', mix('#8A3B5E', '#4A1E3E', dusk));
    bridgeG.setAttribute('stroke', near);
    river.setAttribute('fill', mix('#D9705A', '#3E1A42', dusk));
    deckG.querySelector('#glass')?.setAttribute('fill', mix('#5A2445', '#2E1232', dusk));
    glintG.setAttribute('opacity', (0.35 + 0.6 * sp).toFixed(3));
    winsG.setAttribute('opacity', clamp((p - 0.45) / 0.4).toFixed(3));
    lightsG.querySelector('#bulbs')?.setAttribute('opacity', (0.35 + 0.65 * clamp((p - 0.3) / 0.5)).toFixed(3));
    intro.classList.toggle('off', p > 0.18);
    lock.classList.toggle('on', p > 0.8);
  }
  function heroP() { const r = hero.getBoundingClientRect(), t = hero.offsetHeight - stage.offsetHeight; return t > 0 ? clamp(-r.top / t) : 1; }

  /* crowd photo rows slide in opposite directions */
  const rows = [...document.querySelectorAll('.row')], crowd = $('crowd');
  function rowsMove() {
    if (!crowd) return;
    const r = crowd.getBoundingClientRect(), t = clamp((innerHeight - r.top) / (innerHeight + r.height));
    rows.forEach((row) => {
      const span = Math.max(0, row.scrollWidth - innerWidth), d = +row.dataset.dir;
      const x = d < 0 ? -span * 0.15 - span * 0.55 * t : -span * 0.7 + span * 0.55 * t;
      row.style.transform = `translateX(${x.toFixed(1)}px)`;
    });
  }

  let last = -1, heroVisible = true;
  function onScroll() { const p = reduce ? 1 : heroP(); if (Math.abs(p - last) > 0.0005) { last = p; render(p); } if (!reduce) rowsMove(); }

  layout(); render(reduce ? 1 : heroP());
  if (reduce) { hero.style.height = 'auto'; stage.style.position = 'relative'; rows.forEach((r) => (r.style.transform = 'translateX(-80px)')); }
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
  addEventListener('resize', () => { layout(); last = -1; onScroll(); });
  onScroll();

  // planes fly on their own clock while the hero is on screen
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { heroVisible = en[0].isIntersecting; }).observe(stage);
  const t0 = performance.now();
  function frame(now) { if (heroVisible) drawPlanes((now - t0) / 1000, P); requestAnimationFrame(frame); }
  if (reduce) drawPlanes(4, 1); else requestAnimationFrame(frame);

  /* ---------- signup form ---------- */
  const form = $('signup'), status = $('status'), btn = $('submitBtn');
  if (!form) return;
  const say = (msg, err) => { status.textContent = msg; status.classList.toggle('err', !!err); };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say('Enter a valid email address, like you@example.com.', true); form.email.focus(); return; }
    if (!form.age_21.checked) { say('Confirm you are 21 or older to join.', true); return; }
    const data = { first_name: form.first_name.value.trim(), email, city: form.city.value.trim(), age_21: true, company: form.company.value };
    btn.disabled = true; say('Adding you to the list…');
    try {
      const res = await fetch(form.getAttribute('action'), { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(data) });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.ok) {
        const name = data.first_name ? ', ' + data.first_name : '';
        form.innerHTML = '';
        const done = document.createElement('div'); done.className = 'done';
        done.innerHTML = '<svg viewBox="0 0 880 470" aria-hidden="true"><use href="#logoMark"/></svg><h3></h3><p>Watch your inbox for the next city and early tickets.</p>';
        done.querySelector('h3').textContent = "You're on the list" + name + '.';
        form.appendChild(done);
        return;
      }
      if (res.status === 400 && out.message) { say(out.message, true); }
      else throw new Error('unavailable');
    } catch (_) {
      say('Signups open soon. Until then, follow @catchinsunsets on Instagram for new cities and dates.');
    } finally { btn.disabled = false; }
  });
})();
