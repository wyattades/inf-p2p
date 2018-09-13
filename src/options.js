
// TODO way for user to edit options

// Defaults
const opt = {
  renderDist: 2,
  quality: 1.0,
  shadows: true,
  mouseSensitivity: 3,
  antialias: false,
  fog: true,
};

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
  localStorage.setItem('options', JSON.stringify(opt));
};

const loaded = load();
for (const key in opt) {
  const val = loaded[key];
  if (typeof val === typeof opt[key])
    opt[key] = val;
}

let changed = 0;
let oldOpt = Object.assign({}, opt);

export const set = (key, val) => {
  if (!(key in opt)) console.error('Invalid option:', key);
  opt[key] = val;
  if (oldOpt[key] === opt[key]) changed--;
  else changed++;
  save();
};

export const get = (key) => {
  if (!(key in opt)) console.error('Invalid option:', key);
  return opt[key];
};

export const checkChanged = () => {
  if (changed > 0) {
    changed = 0;
    oldOpt = Object.assign({}, opt);
    return true;
  }
  return false;
};
