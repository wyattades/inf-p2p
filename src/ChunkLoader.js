import TerrainWorker from './terrain/terrain.worker';
import Chunk from './Chunk';


const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

export default class ChunkLoader {

  constructor(scene, renderDist) {
    this.scene = scene;
    this.renderDist = Math.max(1, renderDist | 0);
    this.chunks = {};
    this.chunkCount = 0;
    this.loadedCount = 0;
    this.playerChunk = null;
    this.ready = false;
    
    this.worker = new TerrainWorker();

    this.worker.onmessage = ({ data }) => {
      switch (data.cmd) {
        case 'terrain': this._receiveLoadChunk(data.x, data.z, data.attributes);
      }
    };
  }

  loadInitial(playerX, playerZ) {
    this.unloadChunks();

    const px = Math.floor(playerX / Chunk.SIZE);
    const pz = Math.floor(playerZ / Chunk.SIZE);

    for (let i = 0; i < this.renderDist * 2 + 1; i++) {
      for (let j = 0; j < this.renderDist * 2 + 1; j++) {
        const chunk = this._requestLoadChunk(
          px + i - this.renderDist,
          pz + j - this.renderDist,
        );
        if (i === this.renderDist && j === this.renderDist) this.playerChunk = chunk;
      }
    }

    const initialChunkAmount = (this.renderDist * 2 + 1) ** 2;

    // What a hack...
    return new Promise((resolve) => {
      const intervalId = window.setInterval(() => {
        if (this.loadedCount >= initialChunkAmount) {
          this.ready = true;
          window.clearInterval(intervalId);
          resolve();
        }
      }, 200);
    });
  }

  _requestLoadChunk(x, z) {
    const chunk = new Chunk(x, z);
    this.chunks[`${x},${z}`] = chunk;
    this.chunkCount++;

    const lod = 1; // (this.playerChunk.x - x)this.renderDist

    this.worker.postMessage({ cmd: 'loadChunk', x: chunk.x, z: chunk.z, lod });
    return chunk;
  }

  _receiveLoadChunk(x, z, attr) {
    const chunk = this.chunks[`${x},${z}`];
    if (chunk) { // Chunks have the possibility of unloading before load is finished
      chunk.setTerrain(attr);
      this.scene.add(chunk.mesh);
      this.loadedCount++;
    }
  }

  // Only works if deltaX and deltaY are 0, 1, or -1
  // TODO: make not glitchy!
  updatePlayerChunk(x, z) {
    const deltaX = x - this.playerChunk.x,
          deltaZ = z - this.playerChunk.z;

    // Edges
    if (deltaX) {
      for (let i = -this.renderDist; i <= this.renderDist; i++) {
        const newX = this.playerChunk.x + (deltaX > 0 ? this.renderDist : -this.renderDist) + deltaX;
        const newZ = this.playerChunk.z + i;
        if (!(`${newX},${newZ}` in this.chunks)) this._requestLoadChunk(newX, newZ);
      }
    }
    if (deltaZ) {
      for (let i = -this.renderDist; i <= this.renderDist; i++) {
        const newX = this.playerChunk.x + i;
        const newZ = this.playerChunk.z + (deltaZ > 0 ? this.renderDist : -this.renderDist) + deltaZ;
        if (!(`${newX},${newZ}` in this.chunks)) this._requestLoadChunk(newX, newZ);
      }
    }

    // Corners
    if (deltaX && deltaZ) {
      const newX = this.playerChunk.x + (deltaX > 0 ? this.renderDist : -this.renderDist) + deltaX;
      const newZ = this.playerChunk.z + (deltaZ > 0 ? this.renderDist : -this.renderDist) + deltaZ;
      if (!(`${newX},${newZ}` in this.chunks)) this._requestLoadChunk(newX, newZ);
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
        const chunk = this.chunks[key];
        if (chunk) {
          this.scene.remove(chunk.mesh);
          delete this.chunks[key];
        }
      }
    }
  }

  getHeightAt(x, z) {
    if (!this.playerChunk) return 0;
    
    return this.playerChunk.getHeightAt(x, z);
  }

  clearCache() {
    this.worker.postMessage({ cmd: 'clearCache' });
  }

  unloadChunks() {
    this.loadedCount = 0;
    this.scene.remove(Object.values(this.chunks).map((c) => c.mesh));
    this.chunks = {};
  }

}
