import * as THREE from 'three';

import Chunk from 'src/Chunk';
import { Subject } from 'src/utils/async';
import { LODs } from 'src/constants';
import { DEV } from 'src/env';
import type { LoadChunkResponse } from 'src/terrain/terrain.worker';
import type Game from 'src/Game';

export default class ChunkLoader {
  chunks = new Map<string, Chunk>();
  chunkCount = 0;
  loadedCount = 0;
  chunkGroup: THREE.Group;
  renderDist: number;
  scene: THREE.Scene;
  initialChunkAmount: number;
  worker: Worker;

  hasChunk(x: number, z: number) {
    return this.chunks.has(Chunk.loadKeyFor(x, z));
  }
  getChunk(x: number, z: number) {
    return this.chunks.get(Chunk.loadKeyFor(x, z));
  }

  static worldPosToChunk(x: number, z: number) {
    return {
      x: Math.floor(x / Chunk.SIZE),
      z: Math.floor(z / Chunk.SIZE),
    };
  }

  constructor(readonly game: Game, renderDist: number) {
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
  workerCmd<Res>(
    cmd: string,
    body: Record<string, any> | null = null,
    wait = false,
  ) {
    if (!wait) return this.worker.postMessage({ cmd, ...(body || {}) });

    return new Promise((resolve, reject) => {
      const cmdId = this.cmdIdCounter++;
      const cb = ({
        data,
      }: MessageEvent<{
        cmd: string;
        cmdId?: number;
        error?: string;
        response: Res;
      }>) => {
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

  initialLoad: Subject | null = null;
  async loadInitial() {
    if (!this.followPos) throw new Error('No follow positon set');

    this.unloadChunks();

    this.initialLoad = new Subject();

    this.updateFromFollower();

    await this.initialLoad.toPromise();

    this.initialLoad = null;
  }

  computeLod(chunkX: number, chunkZ: number) {
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
      .copy(chunkPos as THREE.Vector3)
      .distanceToSquared(normalFollowPos as THREE.Vector3);

    // sanity check
    if (distSq <= 4) return LODs[0];

    for (let i = LODs.length - 1; i >= 0; i--) {
      if (distSq >= LODs[i] * LODs[i] + 4) return LODs[i];
    }

    return LODs[0];
  }

  _requestLoadChunk(x: number, z: number) {
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
        caching: this.game.options!.get('cache'),
      });
    }

    return chunk;
  }

  _receiveLoadChunk(chunkData: LoadChunkResponse) {
    const { x, z, lod } = chunkData;

    if (DEV) console.debug('receiveLoadChunk:', x, z, lod);

    const chunk = this.getChunk(x, z);

    // Chunks have the possibility of unloading before this callback
    if (!chunk) return console.warn('Received uninitialized chunk', chunkData);

    chunk.setTerrain(chunkData);

    // TODO: only need to enable physics for 4 chunks max at a time
    chunk.enablePhysics();

    this.loadedCount++;

    if (this.loadedCount === this.initialChunkAmount)
      this.initialLoad?.complete();
  }

  followPos: THREE.Vector3 | null = null;
  setFollower(pos: THREE.Vector3 | null) {
    this.followPos = pos;
    return this;
  }

  prevFollowPos: THREE.Vector3 | null = null;

  followerUpdateDistSq = (Chunk.SIZE / 2) ** 2;

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

  unloadChunk(key: string) {
    const chunk = this.chunks.get(key);
    if (chunk) {
      chunk.dispose();
      this.chunks.delete(key);
      this.chunkCount--;
      if (chunk.mesh) this.loadedCount--;
    }
  }

  getHeightAt(x: number, z: number) {
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
