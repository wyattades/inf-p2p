import Dexie from 'dexie';


const disabled = !!process.env.DEV;

export default class MapCache {

  constructor(name, version = 2) {
    this.name = name;
    this.version = version;

    this.db = new Dexie('mapcache');
    this.db.version(this.version).stores({
      [`chunks-${name}`]: '[x+z],modified',
    });
    this.chunks = this.db[`chunks-${name}`];
  }

  saveChunk(x, z, terrain) {
    if (disabled) return Promise.resolve();

    return this.chunks
    .put({ x, z, terrain, modified: Date.now() });
  }

  loadChunk(x, z) {
    if (disabled) return Promise.resolve();

    return this.chunks
    .where({ x, z })
    .toArray()
    .then((res) => {
      if (res.length) return res[0];
      else return null;
    });
  }

  clear() {
    return this.chunks.clear();
  }

}
