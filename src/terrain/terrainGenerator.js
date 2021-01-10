import Seedrandom from 'seedrandom';
import SimplexNoise from 'simplex-noise';
import Bezier from 'bezier-easing';

import { CHUNK_SEGMENTS } from '../constants';

const MAGIC_MAX_HEIGHT_SCALE = 1.16;

const genNoiseMap = ({
  seed,
  scale = 100.0,
  octaves = 8,
  persistance = 0.5,
  lacunarity = 2.0,
  offset = { x: 0.0, y: 0.0 },
}) => {
  if (scale <= 0.0) scale = 0.0001;

  const noiseMap = new Float32Array(CHUNK_SEGMENTS * CHUNK_SEGMENTS);

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

  const halfSize = CHUNK_SEGMENTS / 2.0;

  for (let y = 0; y < CHUNK_SEGMENTS; y++) {
    for (let x = 0; x < CHUNK_SEGMENTS; x++) {
      amplitude = 1.0;
      let frequency = 1.0;
      let noiseHeight = 0.0;

      for (let i = 0; i < octaves; i++) {
        const sampleX =
          ((x - halfSize + octaveOffsets[i].x) / scale) * frequency;
        const sampleY =
          ((y - halfSize + octaveOffsets[i].y) / scale) * frequency;

        // Returns [-1,1]
        const perlinValue = simplex.noise2D(sampleX, sampleY);
        noiseHeight += perlinValue * amplitude;

        amplitude *= persistance;
        frequency *= lacunarity;
      }

      noiseMap[x * CHUNK_SEGMENTS + y] = Math.max(
        0.0,
        (noiseHeight + 1.0) / (maxHeight * MAGIC_MAX_HEIGHT_SCALE),
      );
    }
  }

  return noiseMap;
};

export const generateNoiseMap = (chunkX, chunkZ) =>
  genNoiseMap({
    seed: 'a-19sdfu428',
    offset: {
      x: chunkZ * (CHUNK_SEGMENTS - 1),
      y: -chunkX * (CHUNK_SEGMENTS - 1),
    },
  });

const heightCurve = Bezier(1, 0, 0.85, 0.85);
const AMPLITUDE = 60.0;

export const generateHeightMap = (noiseMap) => {
  for (let i = 0; i < noiseMap.length; i++) {
    noiseMap[i] = heightCurve(noiseMap[i]) * AMPLITUDE;
  }

  return noiseMap;
};
