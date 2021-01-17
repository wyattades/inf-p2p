import * as THREE from 'three';

import TerrainWorker from 'src/terrain/terrain.worker';
import Chunk from 'src/Chunk';
import { Subject } from 'src/utils/async';

const DIRS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

export default class ChunkLoader {
  /** @type {Object<string, Chunk>} */
  chunks = {};
  chunkCount = 0;
  loadedCount = 0;
  playerChunk = null;

  static worldPosToChunk(x, z) {
    return {
      x: Math.floor(x / Chunk.SIZE),
      z: Math.floor(z / Chunk.SIZE),
    };
  }

  /**
   * @param {import('three').Scene} scene
   * @param {number} renderDist
   */
  constructor(scene, renderDist) {
    this.scene = scene;
    this.renderDist = Math.max(1, renderDist | 0);
    this.initialChunkAmount = (this.renderDist * 2 + 1) ** 2;

    this.chunkGroup = new THREE.Group();
    scene.add(this.chunkGroup);

    this.worker = new TerrainWorker();
    this.worker.onmessage = ({ data }) => {
      switch (data.cmd) {
        case 'terrain':
          this._receiveLoadChunk(data.x, data.z, data.attributes);
          break;
        default:
      }
    };
  }

  async loadInitial(playerX, playerZ) {
    this.unloadChunks();

    this.initialLoad = new Subject();

    const { x: px, z: pz } = ChunkLoader.worldPosToChunk(playerX, playerZ);

    for (let i = 0; i < this.renderDist * 2 + 1; i++) {
      for (let j = 0; j < this.renderDist * 2 + 1; j++) {
        this._requestLoadChunk(
          px + i - this.renderDist,
          pz + j - this.renderDist,
        );
      }
    }

    this.playerChunk = this.chunks[`${px},${pz}`];

    await this.initialLoad.toPromise();
  }

  _requestLoadChunk(x, z) {
    const key = `${x},${z}`;
    if (key in this.chunks) console.warn('Already requested chunk', x, z);

    const chunk = new Chunk(this.chunkGroup, x, z);
    this.chunks[key] = chunk;
    this.chunkCount++;

    const lod = 1; // (this.playerChunk.x - x)this.renderDist

    this.worker.postMessage({ cmd: 'loadChunk', x: chunk.x, z: chunk.z, lod });
    return chunk;
  }

  _receiveLoadChunk(x, z, attr) {
    const chunk = this.chunks[`${x},${z}`];
    // Chunks have the possibility of unloading before load is finished
    if (chunk) {
      chunk.setTerrain(attr);

      // TODO: only need to enable physics for 4 chunks max at a time
      chunk.enablePhysics();

      this.loadedCount++;

      if (this.loadedCount === this.initialChunkAmount)
        this.initialLoad.complete();
    } else console.warn('Received uninitialized chunk', x, z);
  }

  // Only works if deltaX and deltaY are 0, 1, or -1
  // TODO: make not glitchy!
  updatePlayerChunk(x, z) {
    if (x === this.playerChunk.x && z === this.playerChunk.z) return false;

    const deltaX = x - this.playerChunk.x,
      deltaZ = z - this.playerChunk.z;
    const dirX = Math.sign(deltaX),
      dirZ = Math.sign(deltaZ);

    // Edges
    if (deltaX) {
      for (let i = -this.renderDist; i <= this.renderDist; i++) {
        const newX = this.playerChunk.x + dirX * this.renderDist + deltaX;
        const newZ = this.playerChunk.z + i;
        if (!(`${newX},${newZ}` in this.chunks))
          this._requestLoadChunk(newX, newZ);
      }
    }
    if (deltaZ) {
      for (let i = -this.renderDist; i <= this.renderDist; i++) {
        const newX = this.playerChunk.x + i;
        const newZ = this.playerChunk.z + dirZ * this.renderDist + deltaZ;
        if (!(`${newX},${newZ}` in this.chunks))
          this._requestLoadChunk(newX, newZ);
      }
    }

    // Corners
    if (deltaX && deltaZ) {
      const newX = this.playerChunk.x + dirX * this.renderDist + deltaX;
      const newZ = this.playerChunk.z + dirZ * this.renderDist + deltaZ;
      if (!(`${newX},${newZ}` in this.chunks))
        this._requestLoadChunk(newX, newZ);
    }

    // Set new playerChunk
    this.playerChunk = this.chunks[`${x},${z}`];
    if (!this.playerChunk) {
      this.playerChunk = this._requestLoadChunk(x, z);
      console.warn('Invalid playerChunk', x, z);
    }

    // Unload chunks
    const unloadDist = Math.max(this.renderDist + 2, this.renderDist * 2);
    let _x = x - unloadDist,
      _z = z - unloadDist;
    for (const [dx, dz] of DIRS) {
      for (let i = 0; i < unloadDist * 2; i++, _x += dx, _z += dz) {
        const key = `${_x},${_z}`;
        this.unloadChunk(key);
      }
    }

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
    if (!this.playerChunk) return 0;

    return this.playerChunk.getHeightAt(x, z);
  }

  clearMapCache() {
    this.worker.postMessage({ cmd: 'clearCache' });
  }

  unloadChunks() {
    for (const key in this.chunks) this.unloadChunk(key);
  }

  dispose() {
    this.unloadChunks();
  }
}
