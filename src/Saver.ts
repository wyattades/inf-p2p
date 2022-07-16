import { isNumber } from 'src/utils/math';

export const jsonStorage = new (class JsonStorage {
  prefix = 'inf-p2p:';

  set(key: string, val: any) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(val));
    } catch {}
  }

  get(key: string) {
    try {
      const str = localStorage.getItem(this.prefix + key);
      if (str) return JSON.parse(str);
    } catch {}
  }
})();

const startPos = {
  x: 1,
  y: 100,
  z: 1,
};

const isPoint = (p: any): p is Point3 =>
  p && typeof p === 'object' && isNumber(p.x) && isNumber(p.y) && isNumber(p.z);

export default class Saver {
  constructor(
    readonly posGet: () => Point3,
    readonly posSet: (pos: Point3) => void,
  ) {}

  savePos = () => jsonStorage.set('player-position', this.posGet());

  saveInterval?: number;
  start() {
    const loaded = jsonStorage.get('player-position');

    this.posSet(isPoint(loaded) ? loaded : startPos);

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
