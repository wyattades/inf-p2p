
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

// function opti(type, _default) {
//   this.type = type;
//   this.value = this.default = _default;
//   return this;
// }

// opti.prototype.min = function min(val) {
//   this.min = val;
//   return this;
// };

// opti.prototype.max = function max(val) {
//   this.max = val;
//   return this;
// };

// opti.prototype.set = function max(val) {
//   let valid = false;
//   if (this.type === 'float') valid = n === +n && n !== (n|0);
//   else if (this.type === 'int') valid = n === +n && n === (n|0);
//   else if (this.type === 'string') valid = typeof val === 'string';
//   else if (this.type === 'boolean') valid = typeof val === 'boolean';
//   if (valid)
//     this.value = val;
//   else console.warn('Set invalid option:', )
// };
