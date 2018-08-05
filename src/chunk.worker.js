import Seedrandom from 'seedrandom';

import MapCache from './MapCache';

/* eslint-disable no-restricted-globals */

const CHUNK_SIZE = 64;

const mapCache = new MapCache('world1');

const TERRAIN_TEMPLATE = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
const genTerrain = (x, z) => {
  // Generate for the first time
  const seed = `${x},${z}`;
  const rnd = new Seedrandom(seed);

  return TERRAIN_TEMPLATE.map(rnd.int32);
};

const loadChunk = ({ x, z }) => {
  // Attempt to load from cache
  mapCache.loadChunk(x, z)
  .then((cachedChunk) => {

    if (cachedChunk && cachedChunk.terrain) return cachedChunk.terrain;
    else {
      const terrain = genTerrain(x, z);
      return mapCache.saveChunk(x, z, terrain)
      .then(() => terrain);
    }
  })
  .then((terrain) => {
    // TODO: idk if Transferable has to be same instance as terrain
    self.postMessage({ cmd: 'terrain', x, z, terrain }, [ terrain.buffer ]);
  });
};

// const unloadChunk = ({ x, z }) => {
// };

self.onmessage = ({ data }) => {
  switch (data.cmd) {
    case 'loadChunk': loadChunk(data); break;
    case 'clearCache': mapCache.clear();
  }
};
