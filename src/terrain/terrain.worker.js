/* eslint-disable no-restricted-globals */

import { isInteger } from 'lodash';
import { BufferAttribute, PlaneGeometry } from 'three';

import { SEGMENT_SIZE, CHUNK_SEGMENTS } from 'src/constants';

import MapCache from './MapCache';
import { generateHeightMap, generateNoiseMap } from './terrainGenerator';
import colorMap from './colorMap';

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
    new Float32Array((CHUNK_SEGMENTS - 1) * (CHUNK_SEGMENTS - 1) * 18),
    3,
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

const generateChunk = (x, z) => {
  let terrain = generateNoiseMap(x, z);

  const colors = colorMap(terrain);

  terrain = generateHeightMap(terrain);

  const geom = PLANE_GEOM.clone();

  const positionAttr = geom.attributes.position;
  for (let i = 0; i < terrain.length; i++) {
    positionAttr.setY(i, terrain[i]);
  }

  const colorsArray = geom.attributes.color.array;
  for (let i = 0, j = 0; i < colors.length; i++, j += 9) {
    const c = colors[i];
    colorsArray[j] =
      colorsArray[j + 3] =
      colorsArray[j + 6] =
        ((c >> 16) & 255) * 0.00390625;
    colorsArray[j + 1] =
      colorsArray[j + 4] =
      colorsArray[j + 7] =
        ((c >> 8) & 255) * 0.00390625;
    colorsArray[j + 2] =
      colorsArray[j + 5] =
      colorsArray[j + 8] =
        (c & 255) * 0.00390625;
  }

  const heightsArray = rowToColumnMajor(terrain);

  return { ...geom.attributes, heightsArray };
};

const loadChunk = async ({ x, z }) => {
  if (!isInteger(x) || !isInteger(z))
    return console.warn(`Invalid loadChunk args: ${x},${z}`);

  // Attempt to load from cache
  let chunkData;
  try {
    chunkData = await mapCache.loadChunk(x, z);
  } catch (err) {
    console.warn('loadChunk', err);
  }

  if (!chunkData) {
    chunkData = generateChunk(x, z);
    try {
      await mapCache.saveChunk(x, z, chunkData);
    } catch (err) {
      console.warn('saveChunk', err);
    }
  }

  self.postMessage({ cmd: 'terrain', x, z, attributes: chunkData }, [
    ...Object.values(chunkData)
      .map((a) => a?.array?.buffer)
      .filter(Boolean),
    chunkData.heightsArray.buffer,
  ]);
};

const clearCache = async () => {
  try {
    await mapCache.clear();
  } catch (err) {
    console.warn('clearCache', err);
  }
};

// TODO: test if this is faster when initial loading
// const loadChunks = async ({ chunks }) => {
//   for (const chunk of chunks) loadChunk(chunk);
// };

self.onmessage = async ({ data }) => {
  // console.log('terrain worker onmessage:', data);

  let res;
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

  if (data.cmdId != null)
    self.postMessage({
      cmd: 'worker_response',
      cmdId: data.cmdId,
      response: res,
    });
};
