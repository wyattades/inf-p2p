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
PLANE_GEOM.rotateX(-Math.PI / 2);

const generateChunk = (x, z) => {
  let terrain = generateNoiseMap(x, z);
  
  const colors = colorMap(terrain);

  terrain = generateHeightMap(terrain);

  const geom = PLANE_GEOM.clone();

  for (let i = 0; i < terrain.length; i++) {
    geom.vertices[i].y = terrain[i];
  }

  for (let i = 0; i < colors.length; i++) {
    geom.faces[i].color.setHex(colors[i]);
  }

  // geom.computeFaceNormals();
  geom.computeVertexNormals();

  const bufferGeom = new BufferGeometry().fromGeometry(geom);

  return bufferGeom.attributes;
};

const loadChunk = ({ x, z }) => {
  // Attempt to load from cache
  mapCache.loadChunk(x, z)
  .then((chunkData) => {
    if (!chunkData) {
      chunkData = generateChunk(x, z);
      return mapCache.saveChunk(x, z, chunkData).then(() => chunkData);
    } else return chunkData;
  })
  .then((attributes) => {
    const { position, color, uv, normal } = attributes;

    self.postMessage({ cmd: 'terrain', x, z, attributes }, [
      position.array.buffer, color.array.buffer, uv.array.buffer, normal.array.buffer,
    ]);
  })
  .catch(console.error);
};

self.onmessage = ({ data }) => {
  switch (data.cmd) {
    case 'loadChunk': loadChunk(data); break;
    case 'clearCache': mapCache.clear();
  }
};
