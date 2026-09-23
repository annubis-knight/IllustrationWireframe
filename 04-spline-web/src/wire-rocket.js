/**
 * <wire-rocket> — élément HTML natif autonome (Shadow DOM), sans framework.
 *
 * Usage :
 *   <script src="wire-rocket.js"></script>
 *   <wire-rocket tier="nitro" color="#ff4fd8" label="PROPULSION" value="NITRO 340 %" module="03 / 03"></wire-rocket>
 *
 * Attributs : tier (starter|booster|nitro), color, label, value, module, glow ("off" pour couper),
 *             boost ("on" pour forcer l'état survolé).
 * Propriété : el.boost = true/false — pilotable depuis l'extérieur (Vue, React, WordPress…).
 *
 * L'élément s'anime seul, se met en pause hors écran et respecte prefers-reduced-motion.
 */
(() => {
  'use strict';

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = `
    <style>
      /* La page peut surcharger cette couleur (elle gagne sur :host) → le composant suit le thème */
      :host { position: relative; display: block; aspect-ratio: 400 / 420; color: #3ff0ff; contain: content; }
      canvas, svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
      svg { fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round;
            font-family: "JetBrains Mono", ui-monospace, Consolas, monospace; pointer-events: none; }
      text { fill: currentColor; stroke: none; }
      .back { opacity: .4; }
      .ring { stroke-width: .5; opacity: .6; }
      .dash { stroke-width: .6; stroke-dasharray: 1 5; }
      .cross { stroke-width: .6; }
      .corners { stroke-width: 1.2; opacity: .8; }
      .k { font-size: 7.5px; letter-spacing: .18em; opacity: .6; }
      .v { font-size: 11px; font-weight: 600; letter-spacing: .08em; }
      [data-layer][hidden] { display: none; }
    </style>
    <canvas part="canvas"></canvas>
    <svg viewBox="0 0 400 420" aria-hidden="true" part="hud">
      <g class="back" data-layer="ring">
        <circle class="ring" cx="200" cy="200" r="178"/>
        <circle class="dash" cx="200" cy="200" r="150"/>
        <path class="cross" d="M193 200h14M200 193v14"/>
      </g>
      <g data-layer="labels">
        <text class="k" x="18" y="30" data-label></text>
        <text class="v" x="18" y="45" data-value></text>
        <text class="k" x="382" y="30" text-anchor="end">MODULE</text>
        <text class="v" x="382" y="45" text-anchor="end" data-module></text>
      </g>
      <path class="corners" data-layer="overlay" d="M10 30V10H30M370 10H390V30M390 390V410H370M30 410H10V390"/>
    </svg>`;

  const lerp = (a, b, k) => a + (b - a) * k;

  class WireRocket extends HTMLElement {
    static observedAttributes = ['tier', 'color', 'label', 'value', 'module', 'glow', 'boost', 'paused'];

    #raf = 0;
    #hover = 0;
    #target = 0;
    #intro = 0;
    #t = 0;
    #last = 0;
    #visible = true;
    #mq = null;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).append(TEMPLATE.content.cloneNode(true));
      this.canvas = this.shadowRoot.querySelector('canvas');
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    connectedCallback() {
      const tier = this.getAttribute('tier') || 'starter';
      // Sans attribut `color`, on hérite de la couleur de la page → le composant suit son thème
      const color = this.#resolveColor();
      if (this.getAttribute('color')) this.style.color = color;
      this.renderer = new scope.WIRE.Renderer(this.canvas, { color });
      this.scene = scope.SCENES[tier](this.renderer);
      this.basePitch = this.renderer.pitch;
      this.#intro = this.reduced ? 1 : 0;
      this.#syncText();

      this.addEventListener('pointerenter', () => (this.boost = true));
      this.addEventListener('pointerleave', () => (this.boost = false));

      this.observer = new IntersectionObserver(([e]) => (this.#visible = e.isIntersecting));
      this.observer.observe(this);

      // Thème clair / sombre : piloté par la page (événement) ou par le système
      this.#mq = matchMedia('(prefers-color-scheme: light)');
      this.#mq.addEventListener('change', this.#applyTheme);
      addEventListener('themechange', this.#applyTheme);
      this.#applyTheme();
      addEventListener('layerchange', this.#applyLayers);
      this.#applyLayers();
      this.#last = performance.now();
      this.#loop(this.#last);
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.#raf);
      this.observer?.disconnect();
      this.#mq?.removeEventListener('change', this.#applyTheme);
      removeEventListener('themechange', this.#applyTheme);
      removeEventListener('layerchange', this.#applyLayers);
    }

    attributeChangedCallback(name, _old, value) {
      if (!this.renderer) return;
      if (name === 'color') {
        this.renderer.color = value;
        this.style.color = value;
      } else if (name === 'glow') {
        this.renderer.glow = value !== 'off';
      } else if (name === 'boost') {
        this.#target = value === null || value === 'off' ? 0 : 1;
      } else {
        this.#syncText();
      }
    }

    #resolveColor() {
      return this.getAttribute('color') || getComputedStyle(this).color || '#3ff0ff';
    }

    /** Calques : le moteur pour ce qu'il peint, le Shadow DOM pour le HUD. */
    #applyLayers = (e) => {
      if (!this.renderer) return;
      const layers = e?.detail?.layers ?? window.LabLayers?.state() ?? {};
      this.renderer.layers = layers;
      for (const el of this.shadowRoot.querySelectorAll('[data-layer]')) {
        el.hidden = layers[el.dataset.layer] === false;
      }
    };

    #applyTheme = () => {
      if (!this.renderer) return;
      const t = document.documentElement.dataset.theme;
      this.renderer.light = t ? t === 'light' : matchMedia('(prefers-color-scheme: light)').matches;
      this.renderer.color = this.#resolveColor();
    };

    get boost() {
      return this.#target > 0.5;
    }

    set boost(v) {
      this.#target = v ? 1 : 0;
      this.dispatchEvent(new CustomEvent('boostchange', { detail: { boost: !!v } }));
    }

    #syncText() {
      const q = (sel) => this.shadowRoot.querySelector(sel);
      q('[data-label]').textContent = this.getAttribute('label') || '';
      q('[data-value]').textContent = this.getAttribute('value') || '';
      q('[data-module]').textContent = this.getAttribute('module') || '';
    }

    #loop = (now) => {
      this.#raf = requestAnimationFrame(this.#loop);
      const dt = Math.min(0.05, (now - this.#last) / 1000);
      this.#last = now;
      if (!this.#visible || this.hasAttribute('paused')) return;

      this.#t += dt;
      this.#hover = lerp(this.#hover, this.#target, 0.09);
      this.#intro = lerp(this.#intro, 1, 0.05);
      this.scene.update(this.#t, this.#hover, { x: 0, y: 0 });
      this.renderer.alpha = this.#intro;
      this.renderer.pitch = this.basePitch;
      this.scene.root.scale = 0.88 + 0.12 * this.#intro;
      this.renderer.draw(this.scene.root, { time: this.#t });
    };
  }

  customElements.define('wire-rocket', WireRocket);
})();
