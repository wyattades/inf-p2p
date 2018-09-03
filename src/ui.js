
const $info = document.createElement('div');
$info.id = 'info';
document.body.appendChild($info);

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
