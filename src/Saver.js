const startPos = {
  x: 1,
  y: 100,
  z: 1,
};

const isNumber = (v) => typeof v === 'number' && !Number.isNaN(v);

const save = ({ x, y, z }) => {
  const data = {
    x,
    y,
    z,
  };
  localStorage.setItem('inf-p2p:save', JSON.stringify(data));
};

const load = () => {
  let data;
  try {
    data = JSON.parse(localStorage.getItem('inf-p2p:save'));
  } catch (_) {
    // Do nothing
  }

  if (data && typeof data === 'object') {
    const { x, y, z } = data;
    if (isNumber(x) && isNumber(y) && isNumber(z)) return { x, y, z };
  }

  return { ...startPos };
};

export default class Saver {
  constructor(posGet, posSet) {
    this.posGet = posGet;
    this.posSet = posSet;

    this.start();
  }

  savePos = () => save(this.posGet());

  start() {
    const loaded = load();

    this.posSet(loaded);

    // Save position every 5 seconds, and before unload
    this.saveInterval = window.setInterval(this.savePos, 5000);
    window.addEventListener('beforeunload', this.savePos);
  }

  stop() {
    window.clearInterval(this.saveInterval);
    window.removeEventListener('beforeunload', this.savePos);
  }

  dispose() {
    this.stop();
  }
}
