/**
 * Prototype 03 — pilotage des 3 scènes Canvas 2D.
 *
 * Une boucle unique : pour chaque carte visible, on reprojette toute la scène et on repeint
 * son canvas. Aucune librairie : les transitions (intro, survol) sont de simples interpolations.
 */
(() => {
  'use strict';

  const COLORS = { starter: '#3ff0ff', booster: '#9d8cff', nitro: '#ff4fd8' };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = (n, l = 2) => String(Math.floor(n)).padStart(l, '0');
  const nf = new Intl.NumberFormat('fr-FR');
  const fmt = (n) => nf.format(n).replace(/ /g, ' ');

  const cards = [...document.querySelectorAll('.offer')].map((card) => {
    const tier = card.dataset.tier;
    const canvas = card.querySelector('canvas.wire');
    const renderer = new window.WIRE.Renderer(canvas, { color: COLORS[tier] });
    const scene = window.SCENES[tier](renderer);
    return {
      card,
      tier,
      canvas,
      renderer,
      scene,
      basePitch: renderer.pitch,
      visual: card.querySelector('.offer__visual'),
      callout: card.querySelector('[data-callout]'),
      hover: 0,
      hoverTarget: 0,
      intro: reduced ? 1 : 0,
      introTarget: reduced ? 1 : 0,
      pointer: { x: 0, y: 0 },
      pointerTarget: { x: 0, y: 0 },
      visible: true,
    };
  });

  /* ── Étiquette ancrée à un point 3D, reprojetée à chaque frame ── */
  const out = [0, 0, 0];
  function updateCallout(c) {
    if (!c.callout) return;
    c.renderer.project(c.scene.anchor[0], c.scene.anchor[1], c.scene.anchor[2], out);
    const x = (out[0] / c.renderer.w) * 400;
    const y = (out[1] / c.renderer.h) * 420;
    const left = x > 200;
    const ex = left ? x - 24 : x + 24;
    const ey = y - 18;
    const hx = left ? ex - 44 : ex + 44;
    c.callout.querySelector('.c-dot').setAttribute('cx', x.toFixed(1));
    c.callout.querySelector('.c-dot').setAttribute('cy', y.toFixed(1));
    c.callout.querySelector('.c-lead').setAttribute('d', `M${x.toFixed(1)} ${y.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)} ${hx.toFixed(1)} ${ey.toFixed(1)}`);
    for (const [sel, dy] of [['.c-txt', -4], ['.c-sub', 10]]) {
      const el = c.callout.querySelector(sel);
      el.setAttribute('x', (left ? ex - 1 : ex + 1).toFixed(1));
      el.setAttribute('y', (ey + dy).toFixed(1));
      el.setAttribute('text-anchor', left ? 'end' : 'start');
    }
  }

  /* ── Boucle ── */
  let t = 0;
  let running = true;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (running) t += dt;

    for (const c of cards) {
      if (!c.visible) continue;
      c.hover = lerp(c.hover, c.hoverTarget, 0.09);
      c.intro = lerp(c.intro, c.introTarget, 0.05);
      c.pointer.x = lerp(c.pointer.x, c.pointerTarget.x, 0.08);
      c.pointer.y = lerp(c.pointer.y, c.pointerTarget.y, 0.08);

      c.scene.update(t, c.hover, c.pointer);
      c.renderer.alpha = c.intro;
      // update() repose le cadrage de base ; le pointeur s'y ajoute (sinon la caméra dérive)
      c.renderer.yaw += c.pointer.x * 0.35;
      c.renderer.pitch = c.basePitch + c.pointer.y * 0.12;
      c.scene.root.scale = 0.88 + 0.12 * c.intro;
      c.renderer.draw(c.scene.root, { time: t });
      updateCallout(c);
    }
  }
  requestAnimationFrame((now) => {
    last = now;
    frame(now);
  });

  /* ── Interactions ── */
  for (const c of cards) {
    const on = () => {
      c.card.classList.add('is-active');
      c.hoverTarget = 1;
    };
    const off = () => {
      c.card.classList.remove('is-active');
      c.hoverTarget = 0;
      c.pointerTarget = { x: 0, y: 0 };
    };
    c.card.addEventListener('pointerenter', on);
    c.card.addEventListener('pointerleave', off);
    c.card.addEventListener('focusin', on);
    c.card.addEventListener('focusout', (e) => !c.card.contains(e.relatedTarget) && off());
    if (finePointer && !reduced) {
      c.card.addEventListener('pointermove', (e) => {
        const r = c.visual.getBoundingClientRect();
        c.pointerTarget = {
          x: clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1),
          y: clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1),
        };
      });
    }
  }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const c = cards.find((x) => x.card === e.target);
      c.visible = e.isIntersecting;
      if (e.isIntersecting) {
        c.card.classList.add('is-in');
        c.introTarget = 1;
      }
    }
  }, { threshold: 0.15 });
  cards.forEach((c) => io.observe(c.card));
  if (reduced) cards.forEach((c) => c.card.classList.add('is-in'));
  addEventListener('resize', () => cards.forEach((c) => c.renderer.resize()));

  /* ── Compteurs HUD ── */
  for (const c of cards) {
    const price = c.card.querySelector('[data-count]');
    const target = +price.dataset.count;
    let shown = 0;
    setInterval(() => {
      if (!c.card.classList.contains('is-in') || shown >= target) return;
      shown = Math.min(target, shown + Math.ceil(target / 24));
      price.textContent = fmt(Math.round(shown / 10) * 10);
    }, 40);
  }
  const cd = document.querySelector('[data-countdown]');
  const vel = document.querySelector('[data-vel]');
  const boost = document.querySelector('[data-boost]');
  let n = 10;
  setInterval(() => {
    const hot = cards.some((c) => c.hoverTarget > 0.5);
    n = n <= 0 ? 10 : n - 1;
    if (cd) cd.textContent = n === 0 ? 'IGNITION' : `T-00:00:${pad(n)}`;
    if (vel) vel.textContent = `${((hot ? 11.2 : 7.62) + Math.random() * 0.08).toFixed(2).replace('.', ',')} KM/S`;
    if (boost) boost.textContent = `NITRO ${Math.round((hot ? 512 : 338) + Math.random() * 6)} %`;
  }, 700);

  const clock = document.querySelector('[data-clock]');
  const t0 = performance.now();
  setInterval(() => {
    const s = (performance.now() - t0) / 1000;
    clock.textContent = `T+ ${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}`;
  }, 1000);

  /* ── Panneau LAB ── */
  document.querySelector('.lab-panel').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const pressed = btn.getAttribute('aria-pressed') !== 'true';
    if (btn.dataset.toggle === 'glow') {
      btn.setAttribute('aria-pressed', String(pressed));
      cards.forEach((c) => (c.renderer.glow = pressed));
      window.PerfHUD?.set('glow', pressed ? 'on' : 'off');
    } else if (btn.dataset.toggle === 'anim') {
      btn.setAttribute('aria-pressed', String(pressed));
      running = pressed;
      document.documentElement.classList.toggle('no-anim', !pressed);
    } else if (btn.dataset.action === 'replay') {
      cards.forEach((c) => {
        c.intro = 0;
        c.introTarget = 1;
      });
    }
  });

  const segments = cards.reduce((sum, c) => {
    const count = (node) => node.strokes.reduce((s, st) => s + st.p.length / 3 - 1, 0) + node.children.reduce((s, ch) => s + count(ch), 0);
    return sum + count(c.scene.root);
  }, 0);
  window.PerfHUD?.set('segments 3D', segments);
  window.PerfHUD?.set('glow', 'on');

  window.__lab = {
    boostAll: (v) => cards.forEach((c) => {
      c.hoverTarget = v ? 1 : 0;
      c.card.classList.toggle('is-active', v);
    }),
    setGlow: (v) => cards.forEach((c) => (c.renderer.glow = v)),
  };
})();
