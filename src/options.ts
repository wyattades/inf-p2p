import { fromPairs, isEmpty } from 'lodash-es';
import { EventEmitter } from 'events';

import { jsonStorage } from 'src/Saver';

export const MAX_RENDER_DIST = 10;

const OPTIONS_MAP = {
  renderDist: {
    label: 'Render Distance',
    min: 1,
    max: MAX_RENDER_DIST,
    default: 2,
  },
  antialias: { label: 'Antialiasing', default: false },
  fog: { label: 'Fog', default: true },
  shadows: { label: 'Shadows', default: true },
  // caching seems to help on older devices, but actually
  // slows down newer devices. so make it configurable
  cache: { label: 'Caching', default: true },
  debug: { label: 'Debug', default: false },
  showUi: { label: 'Show UI', default: true, updateImmediate: true },
  mouseSensitivity: {
    label: 'Sensitivity',
    min: 1,
    max: 100,
    default: 8,
  },
};

type OptionConfig = {
  label: string;
  min?: number;
  max?: number;
  default?: number | boolean | string;
  updateImmediate?: boolean;
};

export const OPTIONS = Object.entries(OPTIONS_MAP).map(([key, config]) => ({
  key,
  ...config,
})) as ({ key: OptionKey } & OptionConfig)[];

export type OptionKey = keyof typeof OPTIONS_MAP;

export type OptionTypes = {
  [key in OptionKey]: typeof OPTIONS_MAP[key]['default'];
};

export class Options {
  events = new EventEmitter();

  private vals = fromPairs(
    OPTIONS.map((o) => [o.key, o.default]),
  ) as OptionTypes;
  private changed: Partial<OptionTypes> = {};

  constructor() {
    const loaded = this.load();
    for (const key_ in this.vals) {
      const key = key_ as OptionKey;

      const val = loaded[key];
      // @ts-expect-error map values
      if (typeof val === typeof this.vals[key]) this.vals[key] = val;
    }
  }

  tentative(): OptionTypes {
    return { ...this.vals, ...this.changed };
  }

  load(): Partial<OptionTypes> {
    return jsonStorage.get('options') || {};
  }

  save() {
    jsonStorage.set('options', this.tentative());
  }

  set<Key extends OptionKey>(key: Key, val: OptionTypes[Key]) {
    const opt = OPTIONS_MAP[key] as OptionConfig;
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

  get<Key extends OptionKey>(key: Key): OptionTypes[Key] {
    if (!(key in this.vals)) console.error('Invalid option:', key);
    return this.vals[key];
  }

  checkChanged(): Partial<OptionTypes> {
    if (!isEmpty(this.changed)) {
      Object.assign(this.vals, this.changed);
      const _changed = this.changed;
      this.changed = {};
      return _changed;
    }
    return {};
  }
}
