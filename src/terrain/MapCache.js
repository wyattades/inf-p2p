import { openDB } from 'idb';

export default class MapCache {
  constructor(name, version = 1) {
    this.name = name;
    this.version = version;
    this.storeName = `chunks-${name}`;
    this.disabled = false; // May enable for development

    this.db = openDB('mapcache', version, {
      upgrade(db) {
        db.createObjectStore(this.storeName, { keyPath: ['x', 'z'] });
      },
    });
  }

  async saveChunk(x, z, chunkData) {
    if (this.disabled) return;

    await (await this.db).put(this.storeName, {
      x,
      z,
      chunkData,
      modified: Date.now(),
    });
  }

  async loadChunk(x, z) {
    if (this.disabled) return null;

    const data = await (await this.db).get(this.storeName, [x, z]);
    return (data && data.chunkData) || null;
  }

  // async loadChunkRange({ x1, x2, z1, z2 }) {
  //   if (this.disabled) return null;
  //   // const count = (x2 - x1) * (z2 - z1);
  //   const res = await (await this.db).getAll(
  //     this.storeName,
  //     IDBKeyRange.bound([x1, z1], [x2, z2]),
  //     // count,
  //   );
  //   return res;
  // }

  async clear() {
    if (this.disabled) return;

    await (await this.db).clear(this.storeName);
  }
}
