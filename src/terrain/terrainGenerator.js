import Seedrandom from 'seedrandom';
import SimplexNoise from 'simplex-noise';

import { CHUNK_SEGMENTS } from '../constants';
import { inverseLerp } from '../utils';

const SEED_TRASH1 = 2749919;
const SEED_TRASH2 = 15484877;
const MEGA_CHUNK = 4;
const TERRAIN_TEMPLATE = new Uint8Array(CHUNK_SEGMENTS * CHUNK_SEGMENTS);

const getSeed = (x, z) => `${x * SEED_TRASH1},${z * SEED_TRASH2}`;

const genTerrain = (x, z) => {
  // Generate for the first time

  // const rnd = new Seedrandom(seed);
  const simplex = new SimplexNoise(getSeed(x, z));

  // const bigSeed = `${MEGA_CHUNK * x}${MEGA_CHUNK * z}`;
  // const bigRnd = new Seedrandom(bigSeed);

  const heightArray = TERRAIN_TEMPLATE.map((_, i) => {
    const noise = simplex.noise2D(i % CHUNK_SEGMENTS, i / CHUNK_SEGMENTS); // [-1,1]
    return (noise + 1) * 128;
  });

  for (let i = 0; i < CHUNK_SEGMENTS; i++) {
    heightArray[i] = 0;
    heightArray[i * CHUNK_SEGMENTS] = 0;
    heightArray[(i + 1) * CHUNK_SEGMENTS - 1] = 0;
    heightArray[CHUNK_SEGMENTS * CHUNK_SEGMENTS - i - 1] = 0;
  }

  return heightArray;
};

const genTerrain2 = ({
  seed,
  scale = 50.0,
  octaves = 5,
  persistance = 0.5,
  lacunarity = 3.0,
  offset = { x: 0.0, y: 0.0 },
}) => {

  const mapWidth = CHUNK_SEGMENTS;
  const mapHeight = CHUNK_SEGMENTS;

  const noiseMap = new Float32Array(mapWidth * mapHeight);
  
  const prng = new Seedrandom(seed);
  const octaveOffsets = [];
  for (let i = 0; i < octaves; i++) {
    const offsetX = prng.quick() * 200000 - 100000 + offset.x;
    const offsetY = prng.quick() * 200000 - 100000 + offset.y;
    octaveOffsets.push({ x: offsetX, y: offsetY });
  }

  if (scale <= 0) scale = 0.0001;

  let maxNoiseHeight = Number.MIN_VALUE;
  let minNoiseHeight = Number.MAX_VALUE;

  const halfWidth = mapWidth / 2.0;
  const halfHeight = mapHeight / 2.0;

  const simplex = new SimplexNoise(seed);

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
  
      let amplitude = 1;
      let frequency = 1;
      let noiseHeight = 0;

      for (let i = 0; i < octaves; i++) {
        const sampleX = (x - halfWidth) / scale * frequency + octaveOffsets[i].x;
        const sampleY = (y - halfHeight) / scale * frequency + octaveOffsets[i].y;

        const perlinValue = simplex.noise2D(sampleX, sampleY) * 2 - 1;
        noiseHeight += perlinValue * amplitude;

        amplitude *= persistance;
        frequency *= lacunarity;
      }

      if (noiseHeight > maxNoiseHeight) {
        maxNoiseHeight = noiseHeight;
      } else if (noiseHeight < minNoiseHeight) {
        minNoiseHeight = noiseHeight;
      }
      noiseMap[x * mapWidth + y] = noiseHeight;
    }
  }


  for (let i = 0; i < noiseMap.length; i++) {
    noiseMap[i] = inverseLerp(minNoiseHeight, maxNoiseHeight, noiseMap[i]);
  }

  return noiseMap;
};

export default (x, z) => genTerrain2({ seed: getSeed(x, z) });
