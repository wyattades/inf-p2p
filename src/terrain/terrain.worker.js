/* eslint-disable no-restricted-globals */

import { PlaneGeometry } from 'three/src/geometries/PlaneGeometry';
import { BufferGeometry } from 'three/src/core/BufferGeometry';

import MapCache from './MapCache';
import { generateHeightMap, generateNoiseMap } from './terrainGenerator';
import colorMap from './colorMap';
import { SEGMENT_SIZE, CHUNK_SEGMENTS } from '../constants';

// TODO optimize geometry creation by using BufferPlaneGeometry
// TODO reduce cached data

const mapCache = new MapCache('world1');

const PLANE_GEOM = new PlaneGeometry(
  CHUNK_SEGMENTS * SEGMENT_SIZE,
  CHUNK_SEGMENTS * SEGMENT_SIZE,
  CHUNK_SEGMENTS - 1,
  CHUNK_SEGMENTS - 1,
);
// PLANE_GEOM.toNonIndexed();
PLANE_GEOM.rotateX(-Math.PI / 2);

// buffer 1-3 2-5-6 4-7-9 8-11-12 10-13-15 14-17-18
// [22.213417053222656,
// 23.900897979736328,
// 19.624378204345703,
// 23.900897979736328,
// 19.83494758605957,
// 19.624378204345703,
// 19.624378204345703,
// 19.83494758605957,
// 17.451622009277344,
// 19.83494758605957,
// 18.0756778717041,
// 17.451622009277344,
// 17.451622009277344,
// 18.0756778717041,
// 15.849067687988281,
// 18.0756778717041,
// 17.990488052368164,
// 15.849067687988281,
// 15.849067687988281,
// 17.990488052368164,
// 14.949737548828125, 17.990488052368164, 15.999839782714844, 14.949737548828125, 14.949737548828125, 15.999839782714844, 13.064962387084961, 15.999839782714844, 14.722564697265625, 13.064962387084961, 13.064962387084961, 14.722564697265625, 11.9563627243042, 14.722564697265625, 14.09786605834961, 11.9563627243042, 11.9563627243042, 14.09786605834961, 11.851956367492676, 14.09786605834961]
// // terrain 0=0 1=2-5-6 2=8-11-12 3=14-17-18 4=20...
// [22.213417053222656,
// 19.624378204345703,
// 17.451622009277344,
// 15.849067687988281,
// 14.949737548828125,
// 13.064962387084961,
// 11.9563627243042, 11.851956367492676, 12.469766616821289, 12.071660041809082, 10.423206329345703, 9.66915225982666, 8.554792404174805, 8.028532981872559, 7.5821943283081055, 7.237419128417969, 6.551785469055176, 6.86392879486084, 6.909767150878906, 6.6425700187683105, 5.320933818817139, 4.005702972412109, 3.1838173866271973, 2.4338157176971436, 2.069237232208252, 1.81547212600708, 1.3608949184417725, 1.2024128437042236, 1.2168320417404175, 1.1210914850234985, 0.8771668076515198, 0.7578551769256592, 0.5793547630310059, 0.6635622382164001, 0.7477814555168152, 0.8091505765914917, 0.7855967283248901, 0.7987046837806702, 0.7563491463661194, 0.7435653209686279]

// const pos = (p, i) => {
// // geom.vertices[i].y = terrain[i];
// const p = CHUNK_SEGMENTS + 1;
// const _x = i * CHUNK_SEGMENTS,
//       _z = Math.floor(i / CHUNK_SEGMENTS);
// // p[j - 4] = p[j - 1] = p[j] = terrain[i]
// if (_x > 0)

// // if (_x > 0)

// // p[i * 3 + 1] = terrain[i];
// };

const perf = new (class Perf {
  data = {};

  start(name) {
    this.data[name] = performance.now();
  }

  end(name) {
    const start = this.data[name];
    const end = performance.now();
    if (start != null && start <= end) {
      const delta = end - start;
      console.log(`PERF(${name}): ${delta}ms`);
    }
    delete this.data[name];
  }

  measure(fn, name = '?') {
    this.start(name);
    const res = fn();
    this.end(name);
    return res;
  }
})();

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

  // const p = geom.attributes.position.array;
  // console.log(p.length, terrain.length, CHUNK_SEGMENTS);
  for (let i = 0, j = 0; i < terrain.length; i++, j += 6) {
    geom.vertices[i].y = terrain[i];
  }

  // const bufferGeom = geom;

  // for (let i = 0; i < colors.length; i++) {
  //   geom.faces[i].color.setHex(colors[i]);
  // }

  // geom.computeFaceNormals();
  // geom.computeVertexNormals();

  const bufferGeom = new BufferGeometry().fromGeometry(geom);

  // const bufferGeom = geom;

  // const n = [], b = bufferGeom.attributes.position.array;
  // for (let i = 1; i < 120; i += 3) n.push(b[i]);
  // console.log(n, terrain.slice(0, 40));

  // bufferGeom.computeVertexNormals();
  // console.log(geom.vertices.length);
  // console.log(bufferGeom);

  const colorsArray = bufferGeom.attributes.color.array;
  // const colorsArray = new Float32Array(colors.length * 9);
  for (let i = 0, j = 0; i < colors.length; i++, j += 9) {
    const c = colors[i];
    colorsArray[j] = colorsArray[j + 3] = colorsArray[j + 6] =
      ((c >> 16) & 255) * 0.00390625;
    colorsArray[j + 1] = colorsArray[j + 4] = colorsArray[j + 7] =
      ((c >> 8) & 255) * 0.00390625;
    colorsArray[j + 2] = colorsArray[j + 5] = colorsArray[j + 8] =
      (c & 255) * 0.00390625;
  }
  // bufferGeom.addAttribute('color', new BufferAttribute(colorsArray, 3));

  const heightsArray = rotateArray(
    terrain,
    new Float32Array(CHUNK_SEGMENTS * CHUNK_SEGMENTS),
  );

  return { ...bufferGeom.attributes, heightsArray };
};

const loadChunk = async ({ x, z }) => {
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

// const loadChunkRange = async ({ x1, x2, z1, z2 }) => {
// for (let x = x1; x <= x2; x++) {
//   for (let z = z1; z <= z2; z++) {
//     loadChunk({ x, z });
//   }
// }
//   console.log(await mapCache.loadChunkRange({ x1, x2, z1, z2 }));
// };

self.onmessage = ({ data }) => {
  switch (data.cmd) {
    // case 'loadChunkRange':
    //   loadChunkRange(data);
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
