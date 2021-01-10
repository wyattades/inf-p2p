// Defaults
const opt = {
  renderDist: 2,
  quality: 1.0,
  shadows: true,
  mouseSensitivity: 8,
  antialias: false,
  fog: true,
  debug: false,
};
let changed = {};

const load = () => {
  let data;
  try {
    data = JSON.parse(localStorage.getItem('options'));
  } catch (_) {
    // Do nothing
  }

  if (data && typeof data === 'object') {
    return data;
  } else {
    return {};
  }
};

const save = () => {
  localStorage.setItem('options', JSON.stringify({ ...opt, ...changed }));
};

const loaded = load();
for (const key in opt) {
  const val = loaded[key];
  if (typeof val === typeof opt[key]) opt[key] = val;
}

export const set = (key, val) => {
  if (!(key in opt)) {
    console.error('Invalid option:', key);
    return;
  }

  if (opt[key] === val) delete changed[key];
  else changed[key] = val;

  save();
};

export const get = (key) => {
  if (!(key in opt)) console.error('Invalid option:', key);
  return opt[key];
};

export const checkChanged = () => {
  for (const _ in changed) {
    Object.assign(opt, changed);
    const _changed = changed;
    changed = {};
    return _changed;
  }
  return {};
};
