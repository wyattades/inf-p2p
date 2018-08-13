import Seedrandom from 'seedrandom';
import SimplexNoise from 'simplex-noise';

import { CHUNK_SEGMENTS } from '../constants';
// import bezier from './bezier';


const MAGIC_MAX_HEIGHT_SCALE = 1.16;

const genNoiseMap = ({
  seed,
  scale = 50.0,
  octaves = 8,
  persistance = 0.5,
  lacunarity = 2.0,
  offset = { x: 0.0, y: 0.0 },
}) => {

  if (scale <= 0.0) scale = 0.0001;

  const mapWidth = CHUNK_SEGMENTS;
  const mapHeight = CHUNK_SEGMENTS;

  const noiseMap = new Float32Array(mapWidth * mapHeight);
  
  const prng = new Seedrandom(seed);
  const simplex = new SimplexNoise(seed);

  let maxHeight = 0.0;
  let amplitude = 1.0;

  const octaveOffsets = [];
  for (let i = 0; i < octaves; i++) {
    const offsetX = prng.quick() * 200000 - 100000 + offset.x;
    const offsetY = prng.quick() * 200000 - 100000 - offset.y;
    octaveOffsets.push({ x: offsetX, y: offsetY });

    maxHeight += amplitude;
    amplitude *= persistance;
  }


  const halfWidth = mapWidth / 2.0;
  const halfHeight = mapHeight / 2.0;

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
  
      amplitude = 1.0;
      let frequency = 1.0;
      let noiseHeight = 0.0;

      for (let i = 0; i < octaves; i++) {
        const sampleX = (x - halfWidth + octaveOffsets[i].x) / scale * frequency;
        const sampleY = (y - halfHeight + octaveOffsets[i].y) / scale * frequency;

        // Returns [-1,1]
        const perlinValue = simplex.noise2D(sampleX, sampleY);
        noiseHeight += perlinValue * amplitude;

        amplitude *= persistance;
        frequency *= lacunarity;
      }

      noiseMap[x * mapWidth + y] = Math.max(0.0, (noiseHeight + 1.0) / (maxHeight * MAGIC_MAX_HEIGHT_SCALE));
    }
  }

  return noiseMap;
};

export const generateNoiseMap = (chunkX, chunkZ) => genNoiseMap({
  seed: 'a-19sdfu428',
  offset: {
    x: chunkZ * (CHUNK_SEGMENTS - 1),
    y: -chunkX * (CHUNK_SEGMENTS - 1),
  },
});

const heightCurve = (t) => {
  return t;
  // if (t < 0.4) return 0;
  // if (t < 0.5) return 4 * t * t * t;
  // return 1 / (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  // u0 * ((1 - t) ** 3) + 3 * u1 * ((1 - t) ** 2) * t + 3 * u2 * (1 - t) * (t ** 2) + u3 * (t ** 3)
};

const AMPLITUDE = 60.0;
export const generateHeightMap = (noiseMap) => {

  for (let i = 0; i < noiseMap.length; i++) {
    noiseMap[i] = heightCurve(noiseMap[i]) * AMPLITUDE;
  }

  return noiseMap;
};
