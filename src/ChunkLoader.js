import * as THREE from 'three';

import Chunk from 'src/Chunk';
import { Subject } from 'src/utils/async';
import { LODs } from 'src/constants';
import { DEV } from 'src/env';

export default class ChunkLoader {
  /** @type {Map<string, Chunk>} */
  chunks = new Map();
  chunkCount = 0;
  loadedCount = 0;

  hasChunk(x, z) {
    return this.chunks.has(Chunk.loadKeyFor(x, z));
  }
  getChunk(x, z) {
    return this.chunks.get(Chunk.loadKeyFor(x, z));
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

    this.initialLoad = null;
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
      this.chunks.set(Chunk.loadKeyFor(x, z), chunk);
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

    if (DEV) console.debug('receiveLoadChunk:', x, z, lod);

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

    if (
      this.prevFollowPos &&
      followPos.distanceToSquared(this.prevFollowPos) <
        this.followerUpdateDistSq
    ) {
      return false;
    }
    this.prevFollowPos = followPos.clone();

    const chunksToUnload = new Map(this.chunks);

    // request the current chunk first so it loads first
    const currentChunk = this._requestLoadChunk(x, z);
    chunksToUnload.delete(currentChunk.loadKey);

    for (let i = 0, len = this.renderDist * 2 + 1; i < len; i++) {
      for (let j = 0; j < len; j++) {
        const cx = x + i - this.renderDist,
          cz = z + j - this.renderDist;
        if (cx === x && cz === z) continue; // we already requested the current chunk
        const chunk = this._requestLoadChunk(cx, cz);
        chunksToUnload.delete(chunk.loadKey);
      }
    }

    const unloadPadding = 2;
    for (const chunk of chunksToUnload.values()) {
      if (
        // only unload chunks that are outside of the render distance plus some padding
        Math.abs(chunk.x - x) >= this.renderDist + unloadPadding ||
        Math.abs(chunk.z - z) >= this.renderDist + unloadPadding
      ) {
        this.unloadChunk(chunk.loadKey);
      }
    }

    return true;
  }

  // updatePhysicsChunks(x2, z2) {
  //   // const chunkX = x2 * 2;
  //   // const chunkZ = z2 * 2;
  // }

  unloadChunk(key) {
    const chunk = this.chunks.get(key);
    if (chunk) {
      chunk.dispose();
      this.chunks.delete(key);
      this.chunkCount--;
      if (chunk.mesh) this.loadedCount--;
    }
  }

  getHeightAt(x, z) {
    const coords = ChunkLoader.worldPosToChunk(x, z);
    const chunk = this.getChunk(coords.x, coords.z);

    if (!chunk) return -99999;

    return chunk.getHeightAt(x, z);
  }

  async clearMapCache() {
    await this.workerCmd('clearCache', null, true);
  }

  unloadChunks() {
    for (const key of this.chunks.keys()) this.unloadChunk(key);
  }

  dispose() {
    this.unloadChunks();
    this.worker.terminate();
  }
}
