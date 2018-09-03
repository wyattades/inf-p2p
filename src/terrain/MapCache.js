import Dexie from 'dexie';


const disabled = false; // !!process.env.DEV;

export default class MapCache {

  constructor(name, version = 1) {
    this.name = name;
    this.version = version;

    this.db = new Dexie('mapcache');
    this.db.version(this.version).stores({
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

    // TODO: is this most efficient way to fetch a single item?
    return this.chunks
    .where({ x, z })
    .toArray()
    .then((res) => {
      if (res.length) {
        const row = res[0];
        if (row && row.chunkData) return row.chunkData;
      }
      return null;
    });
  }

  clear() {
    return this.chunks.clear();
  }

}
