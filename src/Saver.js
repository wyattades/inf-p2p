const startPos = {
  x: 1,
  y: 100,
  z: 1,
};

const save = (pos) => {
  const data = {
    x: pos.x,
    y: pos.y,
    z: pos.z,
  };
  localStorage.setItem('save', JSON.stringify(data));
};

const load = () => {
  let data;
  try {
    data = JSON.parse(localStorage.getItem('save'));
  } catch (_) {
    // Do nothing
  }
  
  const pos = { ...startPos };
  if (data && typeof data === 'object') {
    const { x, y, z } = data;
    if (x === +x) pos.x = x;
    if (y === +y) pos.y = y;
    if (z === +z) pos.z = z;
    return pos;
  } else {
    return pos;
  }
};

export default class Saver {
  constructor(pos) {
    this.pos = pos;

    this.start();
  }

  savePos = () => save(this.pos);

  start() {
    this.pos.copy(load());

    // Save position every 5 seconds, and before unload
    this.saveInterval = window.setInterval(this.savePos, 5000);
    window.addEventListener('beforeunload', this.savePos);
  }

  stop() {
    window.clearInterval(this.saveInterval);
    window.removeEventListener('beforeunload', this.savePos);
  }
}
