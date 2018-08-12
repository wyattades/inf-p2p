import Seedrandom from 'seedrandom';
import SimplexNoise from 'simplex-noise';

import { CHUNK_SEGMENTS } from '../constants';


const MAGIC_MAX_HEIGHT_SCALE = 0.58;

const genTerrain2 = ({
  seed,
  scale = 50.0,
  octaves = 5,
  persistance = 0.5,
  lacunarity = 3.0,
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

      noiseMap[x * mapWidth + y] = (noiseHeight + 1.0) / (2.0 * maxHeight * MAGIC_MAX_HEIGHT_SCALE);
    }
  }

  return noiseMap;
};

export default (x, z) => genTerrain2({
  seed: 'a-19sdfu428',
  offset: {
    x: z * (CHUNK_SEGMENTS - 1),
    y: -x * (CHUNK_SEGMENTS - 1),
  },
});
