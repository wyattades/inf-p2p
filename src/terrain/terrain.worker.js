/* eslint-disable no-restricted-globals */

import { PlaneGeometry } from 'three/src/geometries/PlaneGeometry';
import { BufferGeometry } from 'three/src/core/BufferGeometry';

import MapCache from './MapCache';
import terrainGenerator from './terrainGenerator';
import colorMap from './colorMap';
import { AMPLITUDE, SEGMENT_SIZE, CHUNK_SEGMENTS } from '../constants';


const mapCache = new MapCache('world1');

const loadChunk = ({ x, z }) => {
  // Attempt to load from cache
  mapCache.loadChunk(x, z)
  .then((cachedChunk) => {

    if (cachedChunk && cachedChunk.terrain) return cachedChunk.terrain;
    else {
      const terrain = terrainGenerator(x, z);
      return mapCache.saveChunk(x, z, terrain)
      .then(() => terrain);
    }
  })
  .then((terrain) => {

    const colors = colorMap(terrain);

    for (let i = 0; i < terrain.length; i++)
      // terrain[i] *= AMPLITUDE;
      terrain[i] = Math.max(0.4, terrain[i]) * AMPLITUDE;

    const geom = new PlaneGeometry(
      CHUNK_SEGMENTS * SEGMENT_SIZE,
      CHUNK_SEGMENTS * SEGMENT_SIZE,
      CHUNK_SEGMENTS - 1,
      CHUNK_SEGMENTS - 1,
    );
    geom.rotateX(-Math.PI / 2);

    for (let i = 0; i < terrain.length; i++) {
      geom.vertices[i].y = terrain[i];
    }

    for (let i = 0; i < colors.length; i++) {
      geom.faces[i].color.setHex(colors[i]);
    }

    const bufferGeom = new BufferGeometry().fromGeometry(geom);

    const { position, color, uv, normal } = bufferGeom.attributes;

    self.postMessage({ cmd: 'terrain', x, z, attributes: bufferGeom.attributes }, [
      position.array.buffer, color.array.buffer, uv.array.buffer, normal.array.buffer,
    ]);
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
