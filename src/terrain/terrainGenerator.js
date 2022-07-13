import Seedrandom from 'seedrandom';
import SimplexNoise from 'simplex-noise';
import Bezier from 'bezier-easing';
import { round } from 'lodash';

import { CHUNK_SEGMENTS } from 'src/constants';

const MAGIC_MAX_HEIGHT_SCALE = 1.16;

const genNoiseMap = ({
  seed,
  scale = 100.0,
  octaves = 8,
  persistance = 0.5,
  lacunarity = 2.0,
  offset = { x: 0.0, y: 0.0 },
  size,
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
      noiseMap[di++] = Math.max(
        0.0,
        (noiseHeight + 1.0) / (maxHeight * MAGIC_MAX_HEIGHT_SCALE),
      );
    }
  }

  return noiseMap;
};

export const generateNoiseMap = (
  seed,
  chunkX,
  chunkZ,
  lod,
  size = CHUNK_SEGMENTS,
) =>
  genNoiseMap({
    seed,
    offset: {
      x: chunkZ * (size - 1),
      y: -chunkX * (size - 1),
    },
    size,
    lod,
  });

const heightCurve = Bezier(1, 0, 0.85, 0.85);
const AMPLITUDE = 60.0;

export const generateHeightMap = (noiseMap) => {
  for (let i = 0; i < noiseMap.length; i++) {
    noiseMap[i] = round(heightCurve(noiseMap[i]) * AMPLITUDE, 8);
  }

  return noiseMap;
};
