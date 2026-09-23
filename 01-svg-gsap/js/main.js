/**
 * Prototype 01 — SVG inline + GSAP 3.15 (core + MotionPathPlugin).
 *
 * 1. Intro « tracé » : stroke-dashoffset sur les chemins `.draw` (pathLength="1" → aucun getTotalLength)
 * 2. Boucles idle : lévitation, radar, socle holo, balayage + effets propres à chaque offre
 * 3. Survol / focus « boost » : une timeline par offre, jouée puis inversée
 * 4. Pointeur : parallaxe par calques SVG, inclinaison 3D CSS, réticule HUD
 *
 * Script classique (pas de module) : la page reste ouvrable en file://.
 */
(() => {
  'use strict';

  const { gsap } = window;
  gsap.registerPlugin(window.MotionPathPlugin);

  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (el, s) => el.querySelector(s);
  const $$ = (el, s) => [...el.querySelectorAll(s)];
  const rand = gsap.utils.random;
  const pad = (n, l = 2) => String(Math.floor(n)).padStart(l, '0');
  // fr-FR sépare les milliers par U+202F, absent de Chakra Petch → espace insécable classique
  const nf = new Intl.NumberFormat('fr-FR');
  const fmt = { format: (n) => nf.format(n).replace(/ /g, ' ') };

  /* ── Texte « décodage » HUD ─────────────────────────────────────────── */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%/<>';

  function scramble(el, duration) {
    const final = (el.dataset.final ??= el.textContent);
    if (!(el instanceof SVGElement)) el.setAttribute('aria-label', final);
    const o = { p: 0 };
    return gsap.to(o, {
      p: 1,
      duration,
      ease: 'none',
      onUpdate() {
        const n = Math.floor(o.p * final.length);
        let s = final.slice(0, n);
        for (let i = n; i < final.length; i++) s += final[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        el.textContent = s;
      },
      onComplete() {
        el.textContent = final;
      },
    });
  }

  /* ── Carte d'offre ──────────────────────────────────────────────────── */
  class OfferCard {
    constructor(card, index) {
      this.card = card;
      this.index = index;
      this.tier = card.dataset.tier;
      this.svg = $(card, 'svg.illu');
      this.q = (s) => $$(this.svg, s);
      this.idle = [];
      this.boosted = false;

      if (reduced) {
        gsap.set(card, { autoAlpha: 1 });
        return;
      }
      this.intro = this.buildIntro();
      this.bindHover();
      this.bindPointer();
    }

    buildIntro() {
      const { card, q } = this;
      const draws = q('.draw');
      const texts = [...q('text:not(.ret-txt)'), ...$$(card, '.offer__name, .offer__code')];

      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' }, onComplete: () => this.startIdle() });
      // Les éléments diffèrent d'une offre à l'autre : on ignore les sélections vides
      const from = (targets, vars, pos) => targets.length && tl.from(targets, vars, pos);

      from([$(card, '.offer__frame')], { autoAlpha: 0, y: 28, duration: 0.7 }, 0);
      from(q('.hud-back > *'), { autoAlpha: 0, scale: 0.8, svgOrigin: '200 200', duration: 0.7, stagger: 0.06 }, 0.1);
      from(q('.holo-base > :not(.hb-pulse)'), { autoAlpha: 0, scaleX: 0.2, svgOrigin: '200 398', duration: 0.6, stagger: 0.05 }, 0.2);
      tl.fromTo(draws, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, ease: 'power1.inOut', stagger: { amount: 1.1 } }, 0.3);
      from(q('.g-back, .g-truss-b, .g-grid, .g-planet-b, .g-orbit, .g-orbit-b, .g-shock, .trail, .stars, .streaks'), { autoAlpha: 0, duration: 1, stagger: 0.1 }, 0.9);
      from(q('.fx, .satellite, .c-dot, .dim-ext, .dim-arrows'), { autoAlpha: 0, duration: 0.6, stagger: 0.04 }, 1.5);
      from(texts, { autoAlpha: 0, duration: 0.15, stagger: 0.02 }, 1.2);
      tl.add(() => texts.forEach((el, i) => scramble(el, 0.45 + i * 0.025)), 1.2);
      from($$(card, '.offer__power i'), { autoAlpha: 0, scaleY: 0, duration: 0.25, stagger: 0.035 }, 1.1);
      from($$(card, '.offer__stage, .offer__price, .offer__specs > div, .offer__cta'), { autoAlpha: 0, x: -12, duration: 0.45, stagger: 0.06 }, 1.2);
      from($$(card, '.offer__badge'), { autoAlpha: 0, duration: 0.5 }, 1.4);
      tl.add(this.countUp(), 1.3);
      tl.set(draws, { clearProps: 'strokeDasharray,strokeDashoffset' });

      gsap.set(card, { autoAlpha: 1 }); // les `from` ci-dessus ont déjà masqué le contenu
      return tl;
    }

    countUp() {
      const el = $(this.card, '[data-count]');
      const o = { v: 0 };
      return gsap.to(o, {
        v: +el.dataset.count,
        duration: 1.3,
        ease: 'power3.out',
        onUpdate: () => (el.textContent = fmt.format(Math.round(o.v / 10) * 10)),
      });
    }

    /** Enregistre une animation idle (pausée hors écran). */
    keep(tween) {
      this.idle.push(tween);
      return tween;
    }

    startIdle() {
      if (this.idle.length) return; // déjà lancé (rejouer l'intro ne duplique pas les boucles)
      const { q } = this;
      this.keep(gsap.to(q('.hud-rot'), { rotation: 360, svgOrigin: '200 200', duration: 70, repeat: -1, ease: 'none' }));
      this.keep(gsap.to(q('.hud-rot-rev'), { rotation: -360, svgOrigin: '200 200', duration: 110, repeat: -1, ease: 'none' }));
      this.keep(gsap.fromTo(q('.hb-pulse'), { scale: 0.4, opacity: 0.8, svgOrigin: '200 398' }, { scale: 1.15, opacity: 0, svgOrigin: '200 398', duration: 2.6, repeat: -1, ease: 'power1.out' }));
      this.keep(gsap.fromTo(q('.scan'), { y: 0 }, { y: 480, duration: 4.5, repeat: -1, repeatDelay: 1.2, ease: 'none' }));
      this.keep(gsap.to(q('.levitate'), { y: -7, duration: 2.4 + this.index * 0.4, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
      this.keep(gsap.to(q('.plume-flk'), {
        scaleY: () => rand(0.84, 1.1),
        scaleX: () => rand(0.92, 1.06),
        transformOrigin: '50% 0%',
        duration: 0.07,
        repeat: -1,
        repeatRefresh: true,
        ease: 'none',
      }));

      this[`idle_${this.tier}`]();
      this.boostTl = this[`boost_${this.tier}`]();
      if (this.boosted) this.boostTl.play();

      new IntersectionObserver(([entry]) => {
        this.idle.forEach((t) => t.paused(!entry.isIntersecting));
      }).observe(this.card);
    }

    /* ── STARTER : balise, vapeurs, compte à rebours ── */
    idle_starter() {
      const { q } = this;
      this.keep(gsap.to(q('.beacon, .beacon-halo'), { opacity: 0.12, duration: 0.6, repeat: -1, yoyo: true, ease: 'steps(1)' }));
      this.vapors = q('.vapor').map((el) => {
        gsap.set(el, { opacity: 0, scale: 0.5, transformOrigin: '50% 50%' });
        return this.keep(gsap.to(el, {
          keyframes: [
            { opacity: 0.6, scale: 1, y: -5, duration: 1.1, ease: 'sine.out' },
            { opacity: 0, scale: 1.6, y: -18, duration: 1.6, ease: 'sine.in' },
          ],
          repeat: -1,
          delay: rand(0, 2.5),
          repeatDelay: rand(0.2, 1.2),
        }));
      });

      const el = q('[data-countdown]')[0];
      let n = 10;
      const tick = () => {
        n = n <= 0 ? 10 : n - 1;
        el.textContent = n === 0 ? 'IGNITION' : `T-00:00:${pad(n)}`;
        gsap.delayedCall(this.boosted ? 0.18 : 1, tick);
      };
      gsap.delayedCall(1, tick);
    }

    boost_starter() {
      const { q } = this;
      const tl = gsap.timeline({ paused: true });
      // Bras ombilicaux : morph du `d` vers la géométrie rétractée pré-calculée (même structure)
      q('.arm').forEach((arm, i) => {
        tl.to(arm, { attr: { d: arm.dataset.retract }, duration: 0.9, ease: 'power2.inOut' }, i * 0.12);
      });
      // Échappement des réacteurs : chaque bouffée part de la tuyère, file vers l'extérieur
      // en grossissant, puis se dissipe — et recommence. L'émission tourne en boucle tant que
      // la carte est survolée, ce qui donne un jet continu plutôt qu'un nuage figé.
      this.jet = q('.puff').map((el) => {
        const dx = +el.dataset.dx;
        const dy = +el.dataset.dy;
        const s = +el.dataset.scale;
        const loop = gsap.timeline({ repeat: -1, delay: +el.dataset.delay, paused: true })
          .fromTo(el.firstChild,
            { x: 0, y: 0, scale: 0.2, opacity: 0, transformOrigin: '50% 50%' },
            { x: dx * 0.45, y: dy * 0.5, scale: s * 0.6, opacity: 0.62, duration: 1, ease: 'power2.out' })
          .to(el.firstChild, { x: dx, y: dy - 14, scale: s, opacity: 0, duration: 1.5, ease: 'power1.in' });
        return this.keep(loop);
      });

      // L'émission démarre avec l'allumage et s'arrête à la sortie du survol
      tl.add(() => this.jet.forEach((t) => (tl.reversed() ? t.pause() : t.play())), 0.3);
      tl.eventCallback('onReverseComplete', () => this.jet.forEach((t) => t.pause().progress(0)));

      return tl
        .to(q('.ignite'), { opacity: 1, duration: 0.25 }, 0.45)
        .fromTo(q('.ignite .plume'), { scaleY: 0.1 }, { scaleY: 1, transformOrigin: '50% 0%', duration: 0.6, ease: 'back.out(2)' }, 0.45)
        .to(this.vapors, { timeScale: 2.6, duration: 0.5 }, 0)
        .to(q('.vapors'), { scale: 1.3, transformOrigin: '50% 100%', duration: 0.8, ease: 'power2.out' }, 0.3);
    }

    /* ── BOOSTER : étoiles, flux orbite/trajectoire, satellite MotionPath ── */
    idle_booster() {
      const { q } = this;
      q('.star.tw').forEach((s) => this.keep(gsap.to(s, { opacity: 0.08, duration: rand(0.5, 1.6), repeat: -1, yoyo: true, delay: rand(0, 2), ease: 'sine.inOut' })));
      this.keep(gsap.to(q('.g-orbit path'), { strokeDashoffset: -100, duration: 7, repeat: -1, ease: 'none' }));
      this.trail = this.keep(gsap.to(q('.trail'), { strokeDashoffset: 70, duration: 1.6, repeat: -1, ease: 'none' }));

      // Satellite : masqué quand il passe derrière la planète (plages calculées au build)
      const sat = q('.satellite')[0];
      const guide = q('.orbit-guide')[0];
      const hidden = (sat.dataset.hidden || '').split(',').filter(Boolean).map((r) => r.split('-').map(Number));
      let behind = null;
      this.sat = this.keep(gsap.to(sat, {
        motionPath: { path: guide, align: guide, alignOrigin: [0.5, 0.5] },
        duration: 16,
        repeat: -1,
        ease: 'none',
        onUpdate() {
          const p = this.progress();
          const off = hidden.some(([a, b]) => p >= a && p <= b);
          if (off !== behind) {
            behind = off;
            gsap.to(sat, { opacity: off ? 0 : 1, duration: 0.25, overwrite: 'auto' });
          }
        },
      }));

      const vel = q('[data-vel]')[0];
      const upd = () => {
        const v = (this.boosted ? 11.2 : 7.62) + Math.random() * 0.08;
        vel.textContent = `${v.toFixed(2).replace('.', ',')} KM/S`;
        gsap.delayedCall(this.boosted ? 0.12 : 0.6, upd);
      };
      upd();
    }

    boost_booster() {
      const { q } = this;
      const craft = q('.craft')[0];
      return gsap.timeline({ paused: true })
        .to(q('.plume'), { scaleY: 1.55, scaleX: 1.2, transformOrigin: '50% 0%', duration: 0.6, ease: 'power2.out' }, 0)
        .to(craft, { x: +craft.dataset.dx * 0.1, y: +craft.dataset.dy * 0.1, duration: 0.9, ease: 'power2.out' }, 0)
        .to(this.trail, { timeScale: 3, duration: 0.6 }, 0)
        .to(this.sat, { timeScale: 2.2, duration: 0.6 }, 0);
    }

    /* ── NITRO : traînées warp, anneaux de post-combustion, vibration ── */
    idle_nitro() {
      const { q } = this;
      this.streaks = q('.streak').map((el) => {
        const dash = +el.dataset.dash;
        const L = +el.dataset.len;
        const tw = gsap.fromTo(el, { strokeDasharray: `${dash} ${L + dash}`, strokeDashoffset: dash }, { strokeDashoffset: -L, duration: +el.dataset.dur, repeat: -1, ease: 'none' });
        tw.progress(Math.random());
        return this.keep(tw);
      });
      gsap.set(q('.streaks'), { opacity: 0.6 });
      this.burn = this.keep(gsap.fromTo(q('.g-burn path'), { opacity: 1 }, { opacity: 0.12, duration: 0.3, ease: 'sine.inOut', stagger: { each: 0.1, repeat: -1, yoyo: true } }));
      this.keep(gsap.to(q('.g-shock'), { opacity: 0.18, duration: 0.8, repeat: -1, yoyo: true, ease: 'sine.inOut' }));

      this.amp = { v: 0.3 };
      this.keep(gsap.to(q('.craft'), {
        x: () => rand(-1, 1) * this.amp.v,
        y: () => rand(-1, 1) * this.amp.v,
        duration: 0.05,
        repeat: -1,
        repeatRefresh: true,
        ease: 'none',
      }));

      const out = q('[data-boost]')[0];
      const upd = () => {
        out.textContent = `NITRO ${Math.round((this.boosted ? 512 : 338) + Math.random() * 6)} %`;
        gsap.delayedCall(this.boosted ? 0.1 : 0.45, upd);
      };
      upd();
    }

    boost_nitro() {
      const { q } = this;
      return gsap.timeline({ paused: true })
        .to(this.streaks, { timeScale: 4, duration: 0.8, ease: 'power2.in' }, 0)
        .to(q('.streaks'), { opacity: 1, duration: 0.5 }, 0)
        .to(q('.plume'), { scaleY: 1.8, scaleX: 1.25, transformOrigin: '50% 0%', duration: 0.6, ease: 'power2.out' }, 0)
        .to(this.burn, { timeScale: 2.5, duration: 0.5 }, 0)
        .to(this.amp, { v: 1.3, duration: 0.5 }, 0);
    }

    /* ── Interactions ── */
    bindHover() {
      const on = () => {
        this.card.classList.add('is-active');
        this.boosted = true;
        this.boostTl?.timeScale(1).play();
      };
      const off = () => {
        this.card.classList.remove('is-active');
        this.boosted = false;
        this.boostTl?.timeScale(1.4).reverse();
      };
      this.card.addEventListener('pointerenter', on);
      this.card.addEventListener('pointerleave', off);
      this.card.addEventListener('focusin', on);
      this.card.addEventListener('focusout', (e) => {
        if (!this.card.contains(e.relatedTarget)) off();
      });
      this.setBoost = (v) => (v ? on() : off());
    }

    bindPointer() {
      if (!finePointer) return;
      const { card, q, svg } = this;
      const vis = $(card, '.offer__visual');
      const qt = (el, prop, d) => gsap.quickTo(el, prop, { duration: d, ease: 'power3' });

      const tilt = { rx: qt(svg, 'rotationX', 0.7), ry: qt(svg, 'rotationY', 0.7) };
      // Parallaxe : chaque calque SVG se décale selon sa « profondeur »
      const layers = [['.hud-back', -6], ['.stars, .streaks', -3], ['.scene', 8], ['.annot', 13]]
        .flatMap(([s, k]) => q(s).map((el) => ({ k, x: qt(el, 'x', 0.9), y: qt(el, 'y', 0.9) })));

      const ret = q('.reticle')[0];
      const [rh, rv, mark, txt] = ['.ret-h', '.ret-v', '.ret-mark', '.ret-txt'].map((s) => q(s)[0]);
      const r = { hy: qt(rh, 'y', 0.25), vx: qt(rv, 'x', 0.25), mx: qt(mark, 'x', 0.25), my: qt(mark, 'y', 0.25) };
      let rect = null;

      card.addEventListener('pointerenter', () => {
        rect = vis.getBoundingClientRect();
        gsap.to(ret, { opacity: 1, duration: 0.3 });
      });
      card.addEventListener('pointermove', (e) => {
        rect ??= vis.getBoundingClientRect();
        const u = (e.clientX - rect.left) / rect.width;
        const v = (e.clientY - rect.top) / rect.height;
        const nx = gsap.utils.clamp(-1, 1, u * 2 - 1);
        const ny = gsap.utils.clamp(-1, 1, v * 2 - 1);
        tilt.ry(nx * 10);
        tilt.rx(-ny * 7);
        layers.forEach((l) => { l.x(nx * l.k); l.y(ny * l.k * 0.6); });

        const x = u * 400;
        const y = v * 420;
        r.hy(y); r.vx(x); r.mx(x); r.my(y);
        txt.textContent = `X ${pad(Math.max(0, x), 3)} · Y ${pad(Math.max(0, y), 3)}`;
        ret.style.visibility = u >= 0 && u <= 1 && v >= 0 && v <= 1 ? '' : 'hidden';
      });
      card.addEventListener('pointerleave', () => {
        tilt.rx(0);
        tilt.ry(0);
        layers.forEach((l) => { l.x(0); l.y(0); });
        gsap.to(ret, { opacity: 0, duration: 0.3 });
        rect = null;
      });
      addEventListener('scroll', () => (rect = null), { passive: true });
    }
  }

  /* ── Initialisation ─────────────────────────────────────────────────── */
  const cards = $$(document, '.offer').map((el, i) => new OfferCard(el, i));

  if (!reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const c = cards.find((x) => x.card === e.target);
        gsap.delayedCall(c.index * 0.18, () => c.intro.play());
      });
    }, { threshold: 0.2 });
    cards.forEach((c) => io.observe(c.card));
  }

  // Horloge de mission
  const clock = $(document, '[data-clock]');
  const t0 = performance.now();
  setInterval(() => {
    const s = (performance.now() - t0) / 1000;
    clock.textContent = `T+ ${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}`;
  }, 1000);

  // Panneau du lab : glow / animations / rejouer
  $(document, '.lab-panel').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const pressed = btn.getAttribute('aria-pressed') !== 'true';
    if (btn.dataset.toggle === 'glow') {
      btn.setAttribute('aria-pressed', pressed);
      root.classList.toggle('no-glow', !pressed);
      window.PerfHUD?.set('glow', pressed ? 'on' : 'off');
    } else if (btn.dataset.toggle === 'anim') {
      btn.setAttribute('aria-pressed', pressed);
      gsap.globalTimeline.paused(!pressed);
      root.classList.toggle('no-anim', !pressed);
    } else if (btn.dataset.action === 'replay') {
      cards.forEach((c) => c.intro?.restart());
    }
  });

  window.PerfHUD?.set('nœuds SVG', $$(document, 'svg.illu *').length);
  window.PerfHUD?.set('glow', 'on');

  // Hook pour tools/measure.mjs : forcer l'état « boost » sur toutes les cartes
  window.__lab = {
    boostAll: (v) => cards.forEach((c) => c.setBoost?.(v)),
    setGlow: (v) => root.classList.toggle('no-glow', !v),
  };
})();
