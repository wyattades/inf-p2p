import options, { OPTIONS } from 'src/options';
import * as GameState from 'src/GameState';
import EventManager from 'src/utils/EventManager';

const h = (tagName, attrs, ...children) => {
  const $el = document.createElement(tagName);
  for (const key in attrs || {}) {
    $el[key] = attrs[key];
  }
  for (const child of children) {
    if (typeof child === 'string' || typeof child === 'number') {
      $el.appendChild(document.createTextNode(child.toString()));
    } else if (child instanceof HTMLElement) {
      $el.appendChild(child);
    }
  }
  return $el;
};

export default class UI {
  static setMode(state) {
    const show = {};
    if (state === GameState.LOADING) {
      show.overlay = true;
      show.loader = true;
    } else if (state === GameState.PLAYING) {
      //
    } else if (state === GameState.PAUSED) {
      //
    } else if (state === GameState.ERROR) {
      show.error = true;
    }

    document
      .querySelector('#text-overlay')
      .classList.toggle('hidden', !show.overlay);
    document
      .querySelector('#text-overlay .error')
      .classList.toggle('hidden', !show.error);
    document
      .querySelector('#text-overlay .loader')
      .classList.toggle('hidden', !show.loader);
  }

  debugTextVals = {
    chunkX: null,
    chunkZ: null,
    x: null,
    y: null,
    z: null,
    FPS: null,
    tick: null,
    storage: null,
  };

  /** @param {import('src/Game').default} game */
  constructor(game) {
    this.game = game;

    this.$info = document.getElementById('info');
    this.$menu = document.getElementById('menu');
    const $options = document.getElementById('options');

    this.em = new EventManager();

    while ($options.firstChild) $options.removeChild($options.firstChild);
    for (const opt of OPTIONS) {
      const type = opt.min == null ? 'checkbox' : 'range';

      let $el;
      if (type === 'checkbox') {
        $el = h(
          'label',
          null,
          h('input', {
            type: 'checkbox',
            checked: opt.default,
            onchange: (e) => {
              options.set(opt.key, e.target.checked);
            },
          }),
          opt.label,
        );
      } else if (type === 'range') {
        $el = h(
          'label',
          null,
          opt.label,
          h('input', {
            type: 'range',
            min: opt.min,
            max: opt.max,
            value: opt.default,
            oninput: (e) => {
              e.target.nextSibling.textContent = e.target.value;
            },
            onchange: (e) => {
              options.set(opt.key, Number.parseInt(e.target.value, 10));
            },
          }),
          h('span', null, opt.default),
        );
      }
      $options.appendChild($el);
    }

    this.em.on(document.getElementById('resume'), 'click', () => {
      this.game.setState(GameState.PLAYING);
    });

    this.em.on(document.getElementById('clearMapCache'), 'click', () => {
      this.game.chunkLoader.clearMapCache();
    });

    for (const key in this.debugTextVals) {
      const $el = document.createElement('p');
      this.$info.appendChild($el);
      this.debugTextVals[key] = $el;
    }
  }

  set(key, val) {
    const $el = this.debugTextVals[key];
    if ($el) {
      if (typeof val === 'number') val = val.toFixed(2);
      $el.innerText = `${key}: ${val}`;
    } else console.info('Invalid option key:', key);
  }

  key(keyCode, action) {
    this.em.on(document, 'keydown', (e) => {
      if (e.which === keyCode.charCodeAt(0)) action();
    });
  }

  toggleMenu(active) {
    this.$menu.classList.toggle('hidden', active != null ? !active : undefined);
  }

  toggleInfo(active) {
    this.$info.classList.toggle('hidden', active != null ? !active : undefined);
  }

  dispose() {
    this.em.off();
    this.toggleMenu(false);
    this.toggleInfo(false);

    while (this.$info.firstChild) this.$info.removeChild(this.$info.lastChild);
  }
}
