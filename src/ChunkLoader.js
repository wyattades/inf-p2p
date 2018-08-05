import ChunkWorker from './chunk.worker';

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

const CHUNK_SIZE = 64;

class Chunk {

  constructor(x, z) {
    this.x = x;
    this.z = z;
    this.terrain = null;
  }

}

export default class ChunkLoader {

  constructor(player, renderDist = 1) {
    this.renderDist = Math.max(1, renderDist);
    this.player = player;
    this.chunks = {};
    this.chunkCount = 0;
    this.loadedCount = 0;
    this.playerChunk = null;
    
    this.worker = new ChunkWorker();

    this.worker.onmessage = ({ data }) => {
      switch (data.cmd) {
        case 'terrain': this.receiveLoadChunk(data.x, data.z, data.terrain);
      }
    };
        
    const px = Math.floor(player.x / CHUNK_SIZE);
    const pz = Math.floor(player.z / CHUNK_SIZE);

    for (let i = 0; i < renderDist * 2 + 1; i++) {
      for (let j = 0; j < renderDist * 2 + 1; j++) {
        const chunk = this.requestLoadChunk(
          px + i - renderDist,
          pz + j - renderDist,
        );
        if (i === renderDist && j === renderDist) this.playerChunk = chunk;
      }
    }
  }

  requestLoadChunk(x, z) {
    const chunk = new Chunk(x, z);
    this.chunks[`${x},${z}`] = chunk;
    this.chunkCount++;
    this.worker.postMessage({ cmd: 'loadChunk', x: chunk.x, z: chunk.z });
    return chunk;
  }

  receiveLoadChunk(x, z, terrain) {
    const chunk = this.chunks[`${x},${z}`];
    if (chunk) { // Chunks have the possibility of unloading before load is finished
      chunk.terrain = terrain;
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
        if (!(`${newX},${newZ}` in this.chunks)) this.requestLoadChunk(newX, newZ);
      }
    }
    if (deltaZ) {
      for (let i = -this.renderDist; i <= this.renderDist; i++) {
        const newX = this.playerChunk.x + i;
        const newZ = this.playerChunk.z + (deltaZ > 0 ? this.renderDist : -this.renderDist) + deltaZ;
        if (!(`${newX},${newZ}` in this.chunks)) this.requestLoadChunk(newX, newZ);
      }
    }

    // Corners
    if (deltaX && deltaZ) {
      const newX = this.playerChunk.x + (deltaX > 0 ? this.renderDist : -this.renderDist) + deltaX;
      const newZ = this.playerChunk.z + (deltaZ > 0 ? this.renderDist : -this.renderDist) + deltaZ;
      if (!(`${newX},${newZ}` in this.chunks)) this.requestLoadChunk(newX, newZ);
    }

    // Set new playerChunk
    this.playerChunk = this.chunks[`${x},${z}`];
    if (!this.playerChunk) {
      this.requestLoadChunk(x, z);
      console.log('Invalid playerChunk', x, z);
    }

    // Unload chunks
    let _x = x - this.renderDist * 2,
        _z = z - this.renderDist * 2;
    for (const [dx, dz] of DIRS) {
      for (let i = 0; i < this.renderDist * 4; i++, _x += dx, _z += dz) {
        const key = `${_x},${_z}`;
        if (key in this.chunks) delete this.chunks[key];
      }
    }
  }

  clearCache() {
    this.worker.postMessage({ cmd: 'clearCache' });
  }

}
