/* eslint-disable no-restricted-globals */

import _ from 'lodash';
import { BufferAttribute, PlaneGeometry } from 'three';

import { SEGMENT_SIZE, CHUNK_SEGMENTS } from 'src/constants';
import { serializeBufferAttr } from 'src/utils/geometry';

import MapCache from './MapCache';
import { generateHeightMap, generateNoiseMap } from './terrainGenerator';
import { iterateColorMap } from './colorMap';

console.log('Init terrain worker');

// TODO reduce cached data

const mapCache = new MapCache('world1');

const PLANE_GEOM = new PlaneGeometry(
  CHUNK_SEGMENTS * SEGMENT_SIZE,
  CHUNK_SEGMENTS * SEGMENT_SIZE,
  CHUNK_SEGMENTS - 1,
  CHUNK_SEGMENTS - 1,
);
PLANE_GEOM.rotateX(-Math.PI / 2);
PLANE_GEOM.setAttribute(
  'color',
  new BufferAttribute(
    new Uint8Array(PLANE_GEOM.attributes.position.count * 3),
    // new Uint8Array((CHUNK_SEGMENTS - 1) * (CHUNK_SEGMENTS - 1) * 18),
    3,
    true,
  ),
);

// convert array from row-major to column-major (for 2d square representation)
const rowToColumnMajor = (from, to = new from.constructor(from.length)) => {
  const l = Math.sqrt(from.length) | 0;

  for (let i = 0; i < l; i++) {
    for (let j = 0; j < l; j++) {
      to[i * l + j] = from[j * l + i];
    }
  }
  return to;
};

const SEED = 'a-19sgfu4281';

const generateChunk = (x, z) => {
  const geom = PLANE_GEOM.clone();

  let heightMap = generateNoiseMap(SEED, x, z);

  const colorsAttr = geom.attributes.color;
  let j = 0;
  // let i =0;
  for (const ch of iterateColorMap(heightMap)) {
    colorsAttr.setXYZ(j, ch.r, ch.g, ch.b);
    // colorsArray[j] = colorsArray[j + 3] = colorsArray[j + 6] = ch.r;
    // colorsArray[j + 1] = colorsArray[j + 4] = colorsArray[j + 7] = ch.g;
    // colorsArray[j + 2] = colorsArray[j + 5] = colorsArray[j + 8] = ch.b;
    j++;
    // j += 9;
  }
  // geom.attributes.color.copyColorsArray(iterateColorMap(heightMap));

  heightMap = generateHeightMap(heightMap);

  // const indexAttr = geom.index; // `geom.clone()` doesn't clone `.index`

  const positionAttr = geom.attributes.position;
  for (let i = 0, len = heightMap.length; i < len; i++) {
    positionAttr.setY(i, heightMap[i]);
  }

  const heightsArray = rowToColumnMajor(heightMap);

  return {
    ..._.mapValues(geom.attributes, serializeBufferAttr),
    heightsArray,
    // indexAttr: serializeBufferAttr(indexAttr),
  };
};

// TODO: send error message on failure?
const loadChunk = async ({ x, z }) => {
  if (!_.isInteger(x) || !_.isInteger(z))
    return console.warn(`Invalid loadChunk args: ${x},${z}`);

  console.debug('terrain.worker request loadChunk:', x, z);

  // Attempt to load from cache
  let chunkData;
  try {
    chunkData = await mapCache.loadChunk(x, z);
  } catch (err) {
    console.warn('loadChunk error:', err);
  }

  if (!chunkData) {
    chunkData = generateChunk(x, z);
    try {
      await mapCache.saveChunk(x, z, chunkData);
    } catch (err) {
      console.warn('saveChunk error:', err);
    }
  }

  console.debug('terrain.worker sending chunk:', x, z);

  self.postMessage(
    { cmd: 'terrain', x, z, attributes: chunkData },
    Object.values(chunkData)
      .map((a) => a.buffer || a.array?.buffer)
      .filter(Boolean),
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
