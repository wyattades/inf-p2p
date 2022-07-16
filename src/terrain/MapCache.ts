import { IDBPDatabase, openDB } from 'idb';

export default class MapCache {
  storeName: string;
  disabled?: boolean;

  db: IDBPDatabase;

  _createDbPromise?: Promise<IDBPDatabase>;

  constructor(name: string, private readonly version = 5) {
    this.storeName = `chunks-${name}`;
    this.disabled = false; // May enable for development

    // HACK: use a temporary proxy to allow accessing this.db immediately
    this.db = new Proxy({} as IDBPDatabase, {
      get: (_target, key: 'put' | 'clear' | 'get') => {
        return async (...args: any[]) => {
          this.db = await (this._createDbPromise ||= this.createDb());

          // @ts-expect-error unknown
          return this.db[key](...args);
        };
      },
    });
  }

  async createDb() {
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

  async saveChunk(x: number, z: number, chunkData: any) {
    if (this.disabled) return;

    await this.db.put(this.storeName, {
      x,
      z,
      chunkData,
      modified: Date.now(),
    });
  }

  async loadChunk(x: number, z: number) {
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
