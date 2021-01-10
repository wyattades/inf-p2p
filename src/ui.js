import * as options from './options';

const $info = document.getElementById('info');
const $menu = document.getElementById('menu');

document.querySelectorAll('#options [name]').forEach((el) => {
  const type = el.getAttribute('type') || 'select';
  const valProp = type === 'checkbox' ? 'checked' : 'value';
  const key = el.getAttribute('name');
  el[valProp] = options.get(key);
  if (type === 'range') {
    el.nextSibling.textContent = el[valProp];
    el.oninput = () => {
      el.nextSibling.textContent = el[valProp];
    };
  }
  el.onchange = () => {
    let val = el[valProp];
    if (type === 'range') val = Number.parseInt(val, 10);
    options.set(key, val);
  };
});
document.getElementById('resume').onclick = () => window.cheat.resume();

const vals = {
  chunkX: null,
  chunkZ: null,
  x: null,
  y: null,
  z: null,
  FPS: null,
};

for (const key in vals) {
  const $el = document.createElement('p');
  $info.appendChild($el);
  vals[key] = $el;
}

export const set = (key, val) => {
  const $el = vals[key];
  if ($el) {
    if (typeof val === 'number') val = val.toFixed(2);
    $el.innerText = `${key}: ${val}`;
  } else console.info('Invalid option key:', key);
};

export const key = (keyCode, action) => {
  document.addEventListener('keydown', (e) => {
    if (e.which === keyCode.charCodeAt(0)) action();
  });
};

// export const toggleMenu = () => {
//   $menu.classList.toggle('hidden');
// };

export const setActiveMenu = (active) => {
  $menu.classList[active ? 'remove' : 'add']('hidden');
};

export const toggleInfo = () => {
  $info.classList.toggle('hidden');
};
