import { isInteger } from 'lodash-es';
import { BufferAttribute, PlaneGeometry } from 'three';

import { SEGMENT_SIZE, CHUNK_SEGMENTS, LODs } from 'src/constants';
import { serializeGeometry } from 'src/utils/geometry';
import { enforceSqrt } from 'src/utils/math';
// import Perf from 'src/utils/Perf';
import { DEV } from 'src/env';

import MapCache from './MapCache';
import { generateHeightMap, generateNoiseMap } from './terrainGenerator';
import { iterateColorMap } from './colorMap';

console.log('Init terrain worker');

// TODO reduce cached data

const mapCache = new MapCache('world1');

const PLANE_GEOMS = LODs.map((lod) => {
  const chunkSegments = CHUNK_SEGMENTS / lod;
  if (!isInteger(chunkSegments))
    throw new Error(`Invalid chunkSegments: ${chunkSegments}, lod=${lod}`);

  const geom = new PlaneGeometry(
    CHUNK_SEGMENTS * SEGMENT_SIZE,
    CHUNK_SEGMENTS * SEGMENT_SIZE,
    chunkSegments,
    chunkSegments,
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

// function* iterateSquareArrayBorder(len) {
//   // start at top-left
//   let x = 0;
//   let y = 0;

//   // point to the right
//   let dx = 1;
//   let dy = 0;

//   // 0, -1
//   // 1, 0
//   // 0, 1
//   // -1, 0

//   for (let side = 0; side < 4; side++) {
//     for (let i = 1; i < len; i++) {
//       yield [x * len + y, -dy, -dx];
//       x += dx;
//       y += dy;
//     }
//     // turn right
//     const t = dx;
//     dx = -dy;
//     dy = t;
//   }
// }

const SEED = 'The-0rig1n-oF-lif3';

const generateChunk = (x, z, lod) => {
  // const perf = new Perf(`generateChunk ${x},${z} | ${lod} : `);

  // perf.start(`geom.clone`);

  const planeGeom = PLANE_GEOMS[LODs.indexOf(lod)];

  let geom = planeGeom.clone();

  // perf.end(`geom.clone`);

  // perf.start('generateNoiseMap');

  let heightMap = generateNoiseMap(SEED, x, z, lod, 0, CHUNK_SEGMENTS);

  const secondary = generateNoiseMap(SEED, x, z, lod, 1, CHUNK_SEGMENTS);

  // perf.next('generateNoiseMap', 'colors');

  const colorItemSize = 3;
  const colorAttr = new BufferAttribute(
    new Uint8Array(
      (planeGeom.parameters.widthSegments + 1) *
        (planeGeom.parameters.heightSegments + 1) *
        colorItemSize *
        6,
    ),
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

  const positionArray = geom.attributes.position.array;

  // if (lod > 1) {
  //   // TODO: this creates ugly ditches
  //   for (const [i, dx, dz] of iterateSquareArrayBorder(size)) {
  //     heightMap[i] *= 0.9;

  //     positionArray[i * 3] += dx * SEGMENT_SIZE * lod;
  //     positionArray[i * 3 + 2] += dz * SEGMENT_SIZE * lod;
  //   }
  // }

  // perf.next('heights', 'positions');

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

  if (DEV) console.debug('terrain.worker request loadChunk:', x, z, lod);

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

  if (DEV) console.debug('terrain.worker sending chunk:', x, z, lod);

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
  if (DEV) console.debug('terrain.worker request clearCache');

  try {
    await mapCache.clear();

    if (DEV) console.debug('terrain.worker clearCache complete');
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
