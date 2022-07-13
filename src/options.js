import { fromPairs, isEmpty } from 'lodash';
import { EventEmitter } from 'events';

export const MAX_RENDER_DIST = 10;

export const OPTIONS = [
  {
    label: 'Render Distance',
    key: 'renderDist',
    min: 1,
    max: MAX_RENDER_DIST,
    default: 2,
  },
  { label: 'Antialiasing', key: 'antialias', default: false },
  { label: 'Fog', key: 'fog', default: true },
  { label: 'Shadows', key: 'shadows', default: true },
  { label: 'Debug', key: 'debug', default: false },
  { label: 'Show UI', key: 'show_ui', default: true, updateImmediate: true },
  {
    label: 'Sensitivity',
    key: 'mouseSensitivity',
    min: 1,
    max: 100,
    default: 8,
  },
];

// each opt in opts
//   if opt.min != null
//     label
//       = opt.label
//       input(type="range" min=(opt.min) max=(opt.max) step=(opt.step == null ? 1 : opt.step) name=(opt.key))
//       span.rangeval
//   else
//     label
//       input(type="checkbox" name=(opt.key))
//       = opt.label

export class Options {
  events = new EventEmitter();

  /** @type {Record<string, boolean | number | string>} */
  vals = fromPairs(OPTIONS.map((o) => [o.key, o.default]));
  /** @type {Record<string, boolean | number | string>} */
  changed = {};

  constructor() {
    const loaded = this.load();
    for (const key in this.vals) {
      const val = loaded[key];
      if (typeof val === typeof this.vals[key]) this.vals[key] = val;
    }
  }

  tentative() {
    return { ...this.vals, ...this.changed };
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem('options'));

      if (data && typeof data === 'object') return data;
    } catch {}

    return {};
  }

  save() {
    try {
      localStorage.setItem('options', JSON.stringify(this.tentative()));
    } catch {}
  }

  set(key, val) {
    const opt = OPTIONS.find((o) => o.key === key);
    if (!opt) {
      console.error('Invalid option:', key);
      return;
    }

    if (opt.updateImmediate) {
      this.vals[key] = val;
    } else if (this.vals[key] === val) delete this.changed[key];
    else this.changed[key] = val;

    this.save();

    this.events.emit('set_option', key, val);
  }

  get(key) {
    if (!(key in this.vals)) console.error('Invalid option:', key);
    return this.vals[key];
  }

  checkChanged() {
    if (!isEmpty(this.changed)) {
      Object.assign(this.vals, this.changed);
      const _changed = this.changed;
      this.changed = {};
      return _changed;
    }
    return {};
  }
}
