import seedRandom from 'seedrandom';
import SimplexNoise from 'simplex-noise';
import createBezierEasing from 'bezier-easing';
// import { round } from 'lodash-es';

const MAGIC_MAX_HEIGHT_SCALE = 1; // 1.16;

const PASSES = [
  {
    postAmplitude: 60.0,
    scale: 100.0,
    octaves: 5,
    persistance: 0.7,
    lacunarity: 2.0,
    // this is the slowest part of the terrain generation
    easingFn: createBezierEasing(1.0, 0.0, 0.85, 0.85),
  },
  {
    postAmplitude: 80.0,
    scale: 500.0,
    octaves: 2,
    persistance: 0.7,
    lacunarity: 2.0,
  },
  {
    postAmplitude: 500.0,
    scale: 2000.0,
    // octaves: 2,
    // persistance: 0.7,
    // lacunarity: 2.0,
    easingFn: createBezierEasing(1.0, 0.0, 0.44, 0.85),
  },
];

// just some big number
const offsetScale = 100000;

// credit: Sebastian Lague https://youtu.be/MRNFcywkUSA?list=PLFt_AvWsXl0eBW2EiBtl_sxmDtSgZBxB3&t=517
const genNoiseMap = ({
  seed,
  scale = 1.0,
  octaves = 1,
  persistance = 1.0,
  lacunarity = 1.0,
  offset = { x: 0.0, y: 0.0 },
  size,
  lod = 1,
}: {
  seed: string;
  scale?: number;
  octaves?: number;
  // how much the amplitude of the wave changes between octaves
  persistance?: number;
  // how much the frequency of the wave changes between octaves
  lacunarity?: number;
  offset?: { x: number; y: number };
  size: number;
  lod?: number;
}) => {
  const dataSize = ((size / lod) | 0) + 1;
  // if (!isInteger(dataSize))
  //   throw new Error(`dataSize ${dataSize} is not an integer`);

  if (scale <= 0.0) scale = 0.0001;

  const noiseMap = new Float32Array(dataSize * dataSize);

  const prng = seedRandom(seed);
  const simplex = new SimplexNoise(seed);

  let maxHeight = 0.0;
  let amplitude = 1.0;

  const octaveOffsets = [];
  for (let i = 0; i < octaves; i++) {
    const offsetX = prng.quick() * offsetScale * 2 - offsetScale + offset.x;
    const offsetY = prng.quick() * offsetScale * 2 - offsetScale - offset.y;
    octaveOffsets.push({ x: offsetX, y: offsetY });

    maxHeight += amplitude;
    amplitude *= persistance;
  }

  const halfSize = size / 2.0;

  let di = 0;
  for (let x = 0; x <= size; x += lod) {
    for (let y = 0; y <= size; y += lod) {
      amplitude = 1.0;
      let frequency = 1.0;
      let noiseHeight = 0.0;

      for (let i = 0; i < octaves; i++) {
        const sampleX =
          ((x - halfSize + octaveOffsets[i].x) / scale) * frequency;
        const sampleY =
          ((y - halfSize + octaveOffsets[i].y) / scale) * frequency;

        // in range: [-1,1]
        const perlinValue = simplex.noise2D(sampleX, sampleY);
        noiseHeight += perlinValue * amplitude;

        amplitude *= persistance;
        frequency *= lacunarity;
      }

      // di = yi * dataSize + xi
      noiseMap[di] = Math.max(
        0.0,
        (noiseHeight + 1.0) / (maxHeight * MAGIC_MAX_HEIGHT_SCALE),
      );

      di++;
    }
  }

  return noiseMap;
};

export const generateNoiseMaps = (
  seed: string,
  chunkX: number,
  chunkZ: number,
  lod: number,
  segments: number,
) => {
  return PASSES.map((params, passIndex) => {
    return genNoiseMap({
      ...params,
      seed: `${passIndex}${seed}`,
      offset: {
        x: chunkZ * segments,
        y: -chunkX * segments,
      },
      size: segments,
      lod,
    });
  });
};

const ADDITION = -30.0;

export const generateHeightMap = (noiseMaps: Float32Array[]) => {
  const len = noiseMaps[0].length;
  const heightMap = new Float32Array(len).fill(ADDITION);

  for (let mi = 0; mi < noiseMaps.length; mi++) {
    const noiseMap = noiseMaps[mi];
    const { easingFn, postAmplitude } = PASSES[mi];

    for (let i = 0; i < len; i++) {
      heightMap[i] +=
        (easingFn ? easingFn(noiseMap[i]) : noiseMap[i]) * postAmplitude;
    }
  }

  return heightMap;
};
