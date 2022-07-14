import Seedrandom from 'seedrandom';
import SimplexNoise from 'simplex-noise';
import createBezierEasing from 'bezier-easing';
import { round } from 'lodash';

import { CHUNK_SEGMENTS } from 'src/constants';

const MAGIC_MAX_HEIGHT_SCALE = 1; // 1.16;

const PASSES = [
  {
    scale: 100.0,
    octaves: 5,
    persistance: 0.7,
    lacunarity: 2.0,
  },
  {
    scale: 500.0,
    octaves: 2,
    persistance: 0.7,
    lacunarity: 2.0,
  },
];

const genNoiseMap = ({
  seed,
  scale,
  octaves,
  persistance,
  lacunarity,
  postAmplitude = 1.0,
  postAddition = 0.0,
  offset = { x: 0.0, y: 0.0 },
  size = CHUNK_SEGMENTS,
  lod = 1,
}) => {
  const dataSize = size / lod;

  if (scale <= 0.0) scale = 0.0001;

  const noiseMap = new Float32Array(dataSize * dataSize);

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

  const halfSize = size / 2.0;

  let di = 0;
  for (let x = 0; x < size; x += lod) {
    for (let y = 0; y < size; y += lod) {
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

      // di = yi * dataSize + xi
      noiseMap[di] =
        Math.max(
          0.0,
          (noiseHeight + 1.0) / (maxHeight * MAGIC_MAX_HEIGHT_SCALE),
        ) *
          postAmplitude +
        postAddition;

      di++;
    }
  }

  return noiseMap;
};

export const generateNoiseMap = (
  seed,
  chunkX,
  chunkZ,
  lod,
  passIndex,
  size = CHUNK_SEGMENTS,
) => {
  const params = PASSES[passIndex];

  return genNoiseMap({
    ...params,
    seed: `${passIndex}${seed}`,
    offset: {
      x: chunkZ * (size - 1),
      y: -chunkX * (size - 1),
    },
    size,
    lod,
  });
};

const heightCurve = createBezierEasing(1, 0, 0.85, 0.85);

const AMPLITUDE = 60.0;
const SECONDARY_AMPLITUDE = 80.0;

const ADDITION = -30.0;

export const generateHeightMap = (noiseMap, secondary) => {
  for (let i = 0; i < noiseMap.length; i++) {
    noiseMap[i] = round(
      heightCurve(noiseMap[i]) * AMPLITUDE +
        secondary[i] * SECONDARY_AMPLITUDE +
        ADDITION,
      8,
    );
  }

  return noiseMap;
};
