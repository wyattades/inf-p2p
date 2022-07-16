import * as THREE from 'three';

import Chunk from 'src/Chunk';
import { Subject } from 'src/utils/async';
import { LODs } from 'src/constants';

// const DIRS = [
//   [1, 0],
//   [0, 1],
//   [-1, 0],
//   [0, -1],
// ];

export default class ChunkLoader {
  /** @type {Record<string, Chunk>} */
  chunks = {};
  chunkCount = 0;
  loadedCount = 0;
  playerChunk = null;

  hasChunk(x, z) {
    return Chunk.loadKeyFor(x, z) in this.chunks;
  }
  getChunk(x, z) {
    return this.chunks[Chunk.loadKeyFor(x, z)];
  }

  static worldPosToChunk(x, z) {
    return {
      x: Math.floor(x / Chunk.SIZE),
      z: Math.floor(z / Chunk.SIZE),
    };
  }

  /**
   * @param {import('src/Game')} game
   * @param {number} renderDist
   */
  constructor(game, renderDist) {
    this.game = game;
    this.scene = game.scene;
    this.renderDist = Math.max(1, renderDist | 0);
    this.initialChunkAmount = (this.renderDist * 2 + 1) ** 2;

    this.chunkGroup = new THREE.Group();
    this.scene.add(this.chunkGroup);

    // FIXME: workers are loaded twice in Firefox, not in Chrome
    this.worker = new Worker(
      new URL('src/terrain/terrain.worker', import.meta.url),
      {
        name: 'terrain_worker',
      },
    );

    this.worker.addEventListener('message', ({ data }) => {
      switch (data.cmd) {
        case 'terrain':
          this._receiveLoadChunk(data);
          break;
        default:
      }
    });
  }

  cmdIdCounter = 0;
  workerCmd(cmd, body, wait = false) {
    if (!wait) return this.worker.postMessage({ cmd, ...(body || {}) });

    return new Promise((resolve, reject) => {
      const cmdId = this.cmdIdCounter++;
      const cb = ({ data }) => {
        if (data.cmd === 'worker_response' && data.cmdId === cmdId) {
          this.worker.removeEventListener('message', cb);
          if (data.error != null) reject(new Error(data.error));
          else resolve(data.response);
        }
      };
      this.worker.addEventListener('message', cb);

      this.worker.postMessage({ cmd, cmdId, ...(body || {}) });
    });
  }

  async loadInitial() {
    if (!this.followPos) throw new Error('No follow positon set');

    this.unloadChunks();

    this.initialLoad = new Subject();

    this.updateFromFollower();

    await this.initialLoad.toPromise();
  }

  computeLod(chunkX, chunkZ) {
    if (!this.followPos) {
      console.warn(`Missing followPos in computeLod: ${chunkX},${chunkZ}`);
      return LODs[0];
    }

    const chunkPos = {
      x: chunkX + 0.5,
      y: 0,
      z: chunkZ + 0.5,
    };

    const normalFollowPos = {
      x: this.followPos.x / Chunk.SIZE,
      y: this.followPos.y / Chunk.SIZE,
      z: this.followPos.z / Chunk.SIZE,
    };

    const distSq = new THREE.Vector3()
      .copy(chunkPos)
      .distanceToSquared(normalFollowPos);

    // sanity check
    if (distSq <= 4) return LODs[0];

    for (let i = LODs.length - 1; i >= 0; i--) {
      if (distSq >= LODs[i] * LODs[i] + 4) return LODs[i];
    }

    return LODs[0];
  }

  _requestLoadChunk(x, z) {
    let chunk = this.getChunk(x, z);

    if (!chunk) {
      chunk = new Chunk(this.game, this.chunkGroup, x, z);
      this.chunks[Chunk.loadKeyFor(x, z)] = chunk;
      this.chunkCount++;
    }

    const lod = this.computeLod(x, z);

    if (chunk.lod == null || chunk.lod !== lod) {
      chunk.lod = lod; // this line prevents the chunk from be loaded again

      this.workerCmd('loadChunk', {
        x: chunk.x,
        z: chunk.z,
        lod,
        caching: this.game.options.get('cache'),
      });
    }

    return chunk;
  }

  _receiveLoadChunk(chunkData) {
    const { x, z, lod } = chunkData;
    console.debug('receiveLoadChunk:', x, z, lod);

    const chunk = this.getChunk(x, z);

    // Chunks have the possibility of unloading before this callback
    if (!chunk) return console.warn('Received uninitialized chunk', x, z, lod);

    chunk.setTerrain(chunkData);

    // TODO: only need to enable physics for 4 chunks max at a time
    chunk.enablePhysics();

    this.loadedCount++;

    if (this.loadedCount === this.initialChunkAmount)
      this.initialLoad?.complete();
  }

  followPos = null;
  setFollower(pos) {
    this.followPos = pos;
    return this;
  }

  prevFollowPos = null;

  followerUpdateDistSq = (Chunk.SIZE / 2) ** 2;

  /**
   * @param {THREE.Vector3} followPos
   */
  updateFromFollower() {
    const followPos = this.followPos;
    if (!followPos) return false;

    const { x, z } = ChunkLoader.worldPosToChunk(followPos.x, followPos.z);

    // Set new playerChunk. this makes sure it's always accurate
    this.playerChunk = this.getChunk(x, z) || this._requestLoadChunk(x, z);

    if (
      this.prevFollowPos &&
      followPos.distanceToSquared(this.prevFollowPos) <
        this.followerUpdateDistSq
    ) {
      return false;
    }
    this.prevFollowPos = followPos.clone();

    const { x: px, z: pz } = this.playerChunk;

    const chunkKeys = new Set(Object.keys(this.chunks));

    for (let i = 0, len = this.renderDist * 2 + 1; i < len; i++) {
      for (let j = 0; j < len; j++) {
        const cx = x + i - this.renderDist,
          cz = z + j - this.renderDist;
        if (cx === x && cz === z) continue;
        const chunk = this._requestLoadChunk(cx, cz);
        chunkKeys.delete(chunk.loadKey);
      }
    }

    const unloadPadding = 2;
    for (const key of chunkKeys) {
      const chunk = this.chunks[key];
      if (chunk) {
        if (
          Math.abs(chunk.x - px) >= this.renderDist + unloadPadding ||
          Math.abs(chunk.z - pz) >= this.renderDist + unloadPadding
        ) {
          this.unloadChunk(key);
        }
      }
    }

    // const deltaX = x - px,
    //   deltaZ = z - pz;
    // const dirX = Math.sign(deltaX),
    //   dirZ = Math.sign(deltaZ);

    // // Edges
    // if (deltaX !== 0) {
    //   for (let i = -this.renderDist; i <= this.renderDist; i++) {
    //     const newX = px + dirX * this.renderDist + deltaX;
    //     const newZ = pz + i;
    //     this._requestLoadChunk(newX, newZ);
    //   }
    // }
    // if (deltaZ !== 0) {
    //   for (let i = -this.renderDist; i <= this.renderDist; i++) {
    //     const newX = px + i;
    //     const newZ = pz + dirZ * this.renderDist + deltaZ;
    //     this._requestLoadChunk(newX, newZ);
    //   }
    // }

    // // Corners
    // if (deltaX !== 0 && deltaZ !== 0) {
    //   const newX = px + dirX * this.renderDist + deltaX;
    //   const newZ = pz + dirZ * this.renderDist + deltaZ;
    //   this._requestLoadChunk(newX, newZ);
    // }

    // // Set new playerChunk
    // this.playerChunk = this.getChunk(x, z);
    // if (!this.playerChunk) {
    //   this.playerChunk = this._requestLoadChunk(x, z);
    //   console.warn('Invalid playerChunk', x, z);
    // }

    // // Unload chunks
    // const unloadDist = Math.max(this.renderDist + 2, this.renderDist * 2);
    // let mx = x - unloadDist,
    //   mz = z - unloadDist;
    // for (const [dx, dz] of DIRS) {
    //   for (let i = 0; i < unloadDist * 2; i++, mx += dx, mz += dz) {
    //     this.unloadChunk(Chunk.loadKeyFor(mx, mz));
    //   }
    // }

    return true;
  }

  updatePhysicsChunks(x2, z2) {
    // const chunkX = x2 * 2;
    // const chunkZ = z2 * 2;
  }

  unloadChunk(key) {
    const chunk = this.chunks[key];
    if (chunk) {
      chunk.dispose();
      delete this.chunks[key];
      this.chunkCount--;
      this.loadedCount--;
    }
  }

  getHeightAt(x, z) {
    if (!this.playerChunk) return -99999;

    return this.playerChunk.getHeightAt(x, z);
  }

  async clearMapCache() {
    await this.workerCmd('clearCache', null, true);
  }

  unloadChunks() {
    for (const key in this.chunks) this.unloadChunk(key);
  }

  dispose() {
    this.unloadChunks();
    this.worker.terminate();
  }
}
