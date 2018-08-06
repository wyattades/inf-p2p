import ChunkWorker from './chunk.worker';
import Chunk from './Chunk';

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

export default class ChunkLoader {

  constructor(scene, spawnPos, renderDist = 1) {
    this.scene = scene;
    this.spawnPos = spawnPos;
    this.renderDist = Math.max(1, renderDist) | 0;
    this.chunks = {};
    this.chunkCount = 0;
    this.loadedCount = 0;
    this.playerChunk = null;
    this.ready = false;
    
    this.worker = new ChunkWorker();

    this.worker.onmessage = ({ data }) => {
      switch (data.cmd) {
        case 'terrain': this._receiveLoadChunk(data.x, data.z, data.terrain);
      }
    };
  }

  loadInitial() {
    return new Promise((resolve) => {
      const px = Math.floor(this.spawnPos.x / Chunk.SIZE);
      const pz = Math.floor(this.spawnPos.z / Chunk.SIZE);
  
      for (let i = 0; i < this.renderDist * 2 + 1; i++) {
        for (let j = 0; j < this.renderDist * 2 + 1; j++) {
          const chunk = this._requestLoadChunk(
            px + i - this.renderDist,
            pz + j - this.renderDist,
          );
          if (i === this.renderDist && j === this.renderDist) this.playerChunk = chunk;
        }
      }

      // What a hack...
      const intervalId = window.setInterval(() => {
        if (this.loadedCount >= (this.renderDist * 2 + 1) * (this.renderDist * 2 + 1)) {
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
    this.worker.postMessage({ cmd: 'loadChunk', x: chunk.x, z: chunk.z });
    return chunk;
  }

  _receiveLoadChunk(x, z, terrain) {
    const chunk = this.chunks[`${x},${z}`];
    if (chunk) { // Chunks have the possibility of unloading before load is finished
      chunk.setTerrain(terrain);
      this.scene.add(chunk.mesh);
      this.loadedCount++;
    }
  }

  // Only works if deltaX and deltaY are 0, 1, or -1
  // TODO: make not glitchy!
  updatePlayerChunk(x, z) {
    const deltaX = x - this.playerChunk.x,
          deltaZ = z - this.playerChunk.z;

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
      this._requestLoadChunk(x, z);
      console.log('Invalid playerChunk', x, z);
    }

    // Unload chunks
    let _x = x - this.renderDist * 2,
        _z = z - this.renderDist * 2;
    for (const [dx, dz] of DIRS) {
      for (let i = 0; i < this.renderDist * 4; i++, _x += dx, _z += dz) {
        const key = `${_x},${_z}`;
        const chunk = this.chunks[key];
        if (chunk) {
          this.scene.remove(chunk.mesh);
          delete this.chunks[key];
        }
      }
    }
  }

  clearCache() {
    this.worker.postMessage({ cmd: 'clearCache' });
  }

}
