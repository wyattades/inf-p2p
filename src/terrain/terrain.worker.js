/* eslint-disable no-restricted-globals */

import { isInteger } from 'lodash';
import { PlaneGeometry } from 'three/src/geometries/PlaneGeometry';
import { BufferGeometry } from 'three/src/core/BufferGeometry';

import { SEGMENT_SIZE, CHUNK_SEGMENTS } from 'src/constants';

import MapCache from './MapCache';
import { generateHeightMap, generateNoiseMap } from './terrainGenerator';
import colorMap from './colorMap';

// TODO optimize geometry creation by using BufferPlaneGeometry
// TODO reduce cached data

const mapCache = new MapCache('world1');

const PLANE_GEOM = new PlaneGeometry(
  CHUNK_SEGMENTS * SEGMENT_SIZE,
  CHUNK_SEGMENTS * SEGMENT_SIZE,
  CHUNK_SEGMENTS - 1,
  CHUNK_SEGMENTS - 1,
);
PLANE_GEOM.rotateX(-Math.PI / 2);

// convert array from row-major to column-major (for 2d square representation)
const rotateArray = (from, to = []) => {
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

  for (let i = 0, j = 0; i < terrain.length; i++, j += 6) {
    geom.vertices[i].y = terrain[i];
  }

  const bufferGeom = new BufferGeometry().fromGeometry(geom);

  const colorsArray = bufferGeom.attributes.color.array;
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

  const heightsArray = rotateArray(
    terrain,
    new Float32Array(CHUNK_SEGMENTS * CHUNK_SEGMENTS),
  );

  return { ...bufferGeom.attributes, heightsArray };
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

  const { position, color, uv, normal, heightsArray } = chunkData;

  self.postMessage({ cmd: 'terrain', x, z, attributes: chunkData }, [
    position.array.buffer,
    color.array.buffer,
    uv.array.buffer,
    normal.array.buffer,
    heightsArray.buffer,
  ]);
};

// TODO: test if this is faster when initial loading
// const loadChunks = async ({ chunks }) => {
//   for (const chunk of chunks) loadChunk(chunk);
// };

self.onmessage = ({ data }) => {
  switch (data.cmd) {
    // case 'loadChunks':
    //   loadChunks(data);
    //   break;
    case 'loadChunk':
      loadChunk(data);
      break;
    case 'clearCache':
      mapCache.clear().catch((err) => console.warn('clearCache', err));
      break;
    default:
  }
};
