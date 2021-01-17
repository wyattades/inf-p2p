class Options {
  vals = {
    renderDist: 2,
    quality: 1.0,
    shadows: true,
    mouseSensitivity: 8,
    antialias: false,
    fog: true,
    debug: false,
    mapCache: true,
  };
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
