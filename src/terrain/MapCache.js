import { openDB } from 'idb';

export default class MapCache {
  constructor(name, version = 4) {
    this.name = name;
    this.version = version;
    this.storeName = `chunks-${name}`;
    this.disabled = false; // May enable for development

    // use a temporary proxy to allow accessing this.db immediately
    this.db = new Proxy(
      {},
      {
        get: (_target, key) => {
          return async (...args) => {
            this.db = await (this._createDbPromise ||= this.createDb());

            return this.db[key](...args);
          };
        },
      },
    );
  }

  createDb() {
    return openDB('mapcache', this.version, {
      upgrade: (db, oldVersion, newVersion) => {
        console.log('Upgrading object store:', oldVersion, '->', newVersion);

        db.deleteObjectStore(this.storeName);

        const store = db.createObjectStore(this.storeName, {
          keyPath: ['x', 'z'],
        });

        console.log('Created object store:', store.name);
      },
    });
  }

  async saveChunk(x, z, chunkData) {
    if (this.disabled) return;

    await this.db.put(this.storeName, {
      x,
      z,
      chunkData,
      modified: Date.now(),
    });
  }

  async loadChunk(x, z) {
    if (this.disabled) return null;

    const data = await this.db.get(this.storeName, [x, z]);
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

    await this.db.clear(this.storeName);
  }
}
