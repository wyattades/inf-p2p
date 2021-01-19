import { fromPairs } from 'lodash';

export const OPTIONS = [
  { label: 'Render Distance', key: 'renderDist', min: 1, max: 5, default: 2 },
  { label: 'Antialiasing', key: 'antialias', default: false },
  { label: 'Fog', key: 'fog', default: true },
  { label: 'Shadows', key: 'shadows', default: true },
  { label: 'Debug', key: 'debug', default: false },
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

class Options {
  vals = fromPairs(OPTIONS.map((o) => [o.key, o.default]));
  changed = {};

  constructor() {
    const loaded = this.load();
    for (const key in this.vals) {
      const val = loaded[key];
      if (typeof val === typeof this.vals[key]) this.vals[key] = val;
    }
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
      localStorage.setItem(
        'options',
        JSON.stringify({ ...this.vals, ...this.changed }),
      );
    } catch {}
  }

  set(key, val) {
    if (!(key in this.vals)) {
      console.error('Invalid option:', key);
      return;
    }

    if (this.vals[key] === val) delete this.changed[key];
    else this.changed[key] = val;

    this.save();
  }

  get(key) {
    if (!(key in this.vals)) console.error('Invalid option:', key);
    return this.vals[key];
  }

  checkChanged() {
    for (const _ in this.changed) {
      Object.assign(this.vals, this.changed);
      const _changed = this.changed;
      this.changed = {};
      return _changed;
    }
    return {};
  }
}

export default new Options();
