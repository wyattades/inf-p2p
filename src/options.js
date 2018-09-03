
// TODO way for user to edit options

// Defaults
const opt = {
  renderDist: 2,
  quality: 1.0,
  shadows: true,
  mouseSensitivity: 1.0,
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
  if (val && typeof val === typeof opt[key])
    opt[key] = val;
}

export const set = (key, val) => {
  opt[key] = val;
  save();
};

export const get = (key) => opt[key];
