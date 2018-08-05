
import ChunkLoader from './ChunkLoader';

const $canvas = document.getElementById('canvas');
const ctx = $canvas.getContext('2d');
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.imageSmoothingEnabled = false;

const CHUNK_SIZE = 64;

const drawWorld = (chunks, player) => {
  ctx.clearRect(0, 0, $canvas.width, $canvas.height);

  for (const chunk of chunks) {
    if (chunk.terrain) {
      ctx.fillStyle = 'green';
      // for (let i = 0; i < chunk.terrain.length; i++) {
      //   const x = i % CHUNK_SIZE;
      //   const y = chunk.terrain[i];
      //   const z = i / CHUNK_SIZE;


      //   const c = y & 255;
      //   ctx.fillStyle = `rgb(${c},${c},${c})`;
      //   ctx.fillRect(chunk.x*CHUNK_SIZE + x, chunk.z*CHUNK_SIZE + z, 1, 1);
      // }
    } else {
      ctx.fillStyle = 'pink';
    }
    ctx.strokeStyle = 'black';
    ctx.fillRect(chunk.x * CHUNK_SIZE, chunk.z * CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE);
    ctx.strokeRect(chunk.x * CHUNK_SIZE, chunk.z * CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE);
    
    if (chunk.terrain) {
      ctx.fillStyle = 'black';
      ctx.fillText(chunk.terrain[0], chunk.x * CHUNK_SIZE + 10, chunk.z * CHUNK_SIZE + 20);
    }
  }


  ctx.fillStyle = `rgb(255,0,0)`;
  ctx.fillRect(player.x, player.z, 5, 5);
};

export const init = () => {
  const player = { x: 456.92, z: 200.23 };

  const chunkLoader = new ChunkLoader(player, 2);

  // TEMP
  document.getElementById('clear-cache').onclick = () => chunkLoader.clearCache();

  const cntl = { l: false, u: false, r: false, d: false };

  const SPEED = 5;
  document.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowLeft': cntl.l = true; break;
      case 'ArrowRight': cntl.r = true; break;
      case 'ArrowUp': cntl.u = true; break;
      case 'ArrowDown': cntl.d = true; break;
    }
  });

  document.addEventListener('keyup', (event) => {
    switch (event.key) {
      case 'ArrowLeft': cntl.l = false; break;
      case 'ArrowRight': cntl.r = false; break;
      case 'ArrowUp': cntl.u = false; break;
      case 'ArrowDown': cntl.d = false; break;
    }
  });

  setInterval(() => {

    if (cntl.l && !cntl.r) player.x -= SPEED;
    else if (cntl.r && !cntl.l) player.x += SPEED;

    if (cntl.u && !cntl.d) player.z -= SPEED;
    else if (cntl.d && !cntl.u) player.z += SPEED;

    const chunkX = Math.floor(player.x / CHUNK_SIZE);
    const chunkZ = Math.floor(player.z / CHUNK_SIZE);
    if (chunkX !== chunkLoader.playerChunk.x || chunkZ !== chunkLoader.playerChunk.z) {
      chunkLoader.updatePlayerChunk(chunkX, chunkZ);
    }

    drawWorld(Object.values(chunkLoader.chunks), player);
  }, 16);
};
