import Dexie from 'dexie';


const disabled = false; // !!process.env.DEV;

export default class MapCache {

  constructor(name, version = 1) {
    this.name = name;
    this.version = version;

    this.db = new Dexie('mapcache');
    this.db.version(version).stores({
      [`chunks-${name}`]: '[x+z],modified',
    });
    this.chunks = this.db[`chunks-${name}`];
  }

  saveChunk(x, z, chunkData) {
    if (disabled) return Promise.resolve();

    return this.chunks
    .put({ x, z, chunkData, modified: Date.now() });
  }

  loadChunk(x, z) {
    if (disabled) return Promise.resolve(null);

    return this.chunks
    .get({ x, z })
    .then((res) => {
      if (res && res.chunkData) return res.chunkData;
      return null;
    });
  }

  clear() {
    return this.chunks.clear();
  }

}
