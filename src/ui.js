import options from 'src/options';
import * as GameState from 'src/GameState';
import EventManager from 'src/utils/EventManager';

export default class UI {
  vals = {
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

    this.em = new EventManager();

    for (const el of document.querySelectorAll('#options [name]')) {
      const type = el.getAttribute('type') || 'select';
      const valProp = type === 'checkbox' ? 'checked' : 'value';
      const key = el.getAttribute('name');

      el[valProp] = options.get(key);

      if (type === 'range') {
        el.nextSibling.textContent = el[valProp];
        this.em.on(el, 'input', () => {
          el.nextSibling.textContent = el[valProp];
        });
      }

      this.em.on(el, 'change', () => {
        let val = el[valProp];
        if (type === 'range') val = Number.parseInt(val, 10);
        options.set(key, val);
      });
    }

    this.em.on(document.getElementById('resume'), 'click', () => {
      this.game.setState(GameState.PLAYING);
    });

    this.em.on(document.getElementById('clearMapCache'), 'click', () => {
      this.game.chunkLoader.clearMapCache();
    });

    for (const key in this.vals) {
      const $el = document.createElement('p');
      this.$info.appendChild($el);
      this.vals[key] = $el;
    }
  }

  set(key, val) {
    const $el = this.vals[key];
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
