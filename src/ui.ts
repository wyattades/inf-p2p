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
  debugStats: Record<keyof typeof DEBUG_STATS, null | string> = {
    ...DEBUG_STATS,
  };

  events = new EventEmitter();

  set(key: keyof typeof DEBUG_STATS, val: number | string | null) {
    if (key in this.debugStats) {
      this.debugStats[key] = val?.toString();
      this.events.emit('update_stats', this.debugStats);
    } else console.info('Invalid option key:', key);
  }

  dispose() {}
}
