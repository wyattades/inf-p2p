import { EventEmitter } from 'events';

const DEBUG_STATS = {
  chunkX: null,
  chunkZ: null,
  x: null,
  y: null,
  z: null,
  FPS: null,
  tick: null,
  storage: null,
};

export default class UI {
  debugStats = { ...DEBUG_STATS };

  events = new EventEmitter();

  set(key, val) {
    if (key in this.debugStats) {
      this.debugStats[key] = val;
      this.events.emit('update_stats', this.debugStats);
    } else console.info('Invalid option key:', key);
  }

  dispose() {}
}
