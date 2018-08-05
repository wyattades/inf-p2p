import Dexie from 'dexie';

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

  saveChunk(x, z, terrain) {
    return this.chunks
    .put({ x, z, terrain, modified: Date.now() });
  }

  loadChunk(x, z) {
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
