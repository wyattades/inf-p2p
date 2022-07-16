import { isInteger } from 'lodash';
import { BufferAttribute, PlaneGeometry } from 'three';

import { SEGMENT_SIZE, CHUNK_SEGMENTS, LODs } from 'src/constants';
import { serializeGeometry } from 'src/utils/geometry';
import { enforceSqrt } from 'src/utils/math';
// import Perf from 'src/utils/Perf';

import MapCache from './MapCache';
import { generateHeightMap, generateNoiseMap } from './terrainGenerator';
import { iterateColorMap } from './colorMap';

console.log('Init terrain worker');

// TODO reduce cached data

const mapCache = new MapCache('world1');

const PLANE_GEOMS = LODs.map((lod) => {
  const size = CHUNK_SEGMENTS / lod;
  if (!isInteger(size)) throw new Error(`Invalid size: ${size}, lod=${lod}`);

  const geom = new PlaneGeometry(
    CHUNK_SEGMENTS * SEGMENT_SIZE,
    CHUNK_SEGMENTS * SEGMENT_SIZE,
    size - 1,
    size - 1,
  );
  geom.rotateX(-Math.PI / 2);
  return geom;
});

// convert array from row-major to column-major (for 2d square representation)
const rowToColumnMajor = (from, to = new from.constructor(from.length)) => {
  const l = enforceSqrt(from.length);

  for (let i = 0; i < l; i++) {
    for (let j = 0; j < l; j++) {
      to[i * l + j] = from[j * l + i];
    }
  }
  return to;
};

const SEED = 'The-0rig1n-oF-lif3';

const generateChunk = (x, z, lod) => {
  // const perf = new Perf(`generateChunk ${x},${z} | ${lod} : `);

  // perf.start(`geom.clone`);

  let geom = PLANE_GEOMS[LODs.indexOf(lod)].clone();

  // perf.end(`geom.clone`);

  const size = CHUNK_SEGMENTS / lod;

  // perf.start('generateNoiseMap');

  let heightMap = generateNoiseMap(SEED, x, z, lod, 0);

  const secondary = generateNoiseMap(SEED, x, z, lod, 1);

  // perf.next('generateNoiseMap', 'colors');

  const colorItemSize = 3;
  const colorAttr = new BufferAttribute(
    new Uint8Array(size * size * colorItemSize * 6),
    colorItemSize,
    true,
  );
  const colorArray = colorAttr.array;
  let ci = 0;
  for (const ch of iterateColorMap(heightMap, secondary)) {
    colorArray[ci] = colorArray[ci + 3] = colorArray[ci + 6] = ch.r;
    colorArray[ci + 1] = colorArray[ci + 4] = colorArray[ci + 7] = ch.g;
    colorArray[ci + 2] = colorArray[ci + 5] = colorArray[ci + 8] = ch.b;
    ci += 9;
  }

  // perf.next('colors', 'heights');

  // mutates `heightMap`
  heightMap = generateHeightMap(heightMap, secondary);

  if (lod > 1) {
    // TODO: don't need to iterate every x,y
    // TODO: this creates ugly ditches
    for (let hx = 0; hx < size; hx++) {
      for (let hy = 0; hy < size; hy++) {
        // is on the edge
        if (hx === 0 || hy === 0 || hx === size - 1 || hy === size - 1) {
          const i = hx + hy * size;
          heightMap[i] = Math.floor(heightMap[i] * 0.5) / 0.5;
        }
      }
    }
  }

  // perf.next('heights', 'positions');

  const positionArray = geom.attributes.position.array;
  for (let i = 0, j = 0, len = heightMap.length; i < len; i++, j += 3) {
    // faster than `positionAttr.setY(i, heightMap[i])`
    positionArray[j + 1] = heightMap[i];
  }

  // perf.next('positions', 'toNonIndexed');

  // this is required to support flat face colors (otherwise a face's color will be a blend of its vertex colors)
  geom = geom.toNonIndexed();

  geom.setAttribute('color', colorAttr);

  const heightsArray = rowToColumnMajor(heightMap);

  // perf.end('toNonIndexed');

  return {
    ...serializeGeometry(geom),
    heightsArray,
  };
};

// TODO: send error message on failure?
const loadChunk = async ({ x, z, lod, caching }) => {
  if (!isInteger(x) || !isInteger(z) || !LODs.includes(lod))
    return console.warn(`Invalid loadChunk args: ${x},${z}:${lod}`);

  const shouldUseCache = caching && lod === LODs[0];

  console.debug('terrain.worker request loadChunk:', x, z, lod);

  // Attempt to load from cache
  /** @type {ReturnType<typeof generateChunk>} */
  let chunkData;
  if (shouldUseCache) {
    // Perf.default.start(`mapCache.loadChunk: ${x},${z} | ${lod}`);
    try {
      chunkData = await mapCache.loadChunk(x, z);
    } catch (err) {
      console.warn('loadChunk error:', err);
    }
    // Perf.default.end(
    //   `mapCache.loadChunk: ${x},${z} | ${lod}`,
    //   `was-loaded: ${!!chunkData}`,
    // );
  }

  if (!chunkData) {
    chunkData = generateChunk(x, z, lod);
    if (shouldUseCache) {
      // Perf.default.start(`mapCache.saveChunk: ${x},${z} | ${lod}`);
      try {
        await mapCache.saveChunk(x, z, chunkData);
      } catch (err) {
        console.warn('saveChunk error:', err);
      }
      // Perf.default.end(`mapCache.saveChunk: ${x},${z} | ${lod}`);
    }
  }

  console.debug('terrain.worker sending chunk:', x, z, lod);

  self.postMessage(
    { cmd: 'terrain', x, z, lod, ...chunkData },
    [
      chunkData.heightsArray.buffer,
      chunkData.indexAttribute?.array.buffer,
      ...Object.values(chunkData.attributes).map((attr) => attr?.array.buffer),
    ].filter(Boolean),
  );
};

const clearCache = async () => {
  console.debug('terrain.worker request clearCache');

  try {
    await mapCache.clear();

    console.debug('terrain.worker clearCache complete');
  } catch (err) {
    console.warn('clearCache', err);
  }
};

// TODO: test if this is faster when initial loading
// const loadChunks = async ({ chunks }) => {
//   for (const chunk of chunks) loadChunk(chunk);
// };

self.onmessage = async ({ data }) => {
  // console.debug('terrain.worker onmessage:', data);

  let res = null,
    error = null;
  try {
    switch (data.cmd) {
      // case 'loadChunks':
      //   loadChunks(data);
      //   break;
      case 'loadChunk':
        res = await loadChunk(data);
        break;
      case 'clearCache':
        res = await clearCache();
        break;
      default:
        throw new Error(`Unknown command: ${data.cmd}`);
    }
  } catch (err) {
    console.error('terrain.worker error:', err);
    error = err;
  }

  if (data.cmdId != null)
    self.postMessage({
      cmd: 'worker_response',
      cmdId: data.cmdId,
      response: res,
      error: error ? error.toString() : null,
    });
};
