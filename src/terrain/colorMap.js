import { mean } from '../utils/math';
import { CHUNK_SEGMENTS } from '../constants';

const COLOR_HEIGHTS = [
  { d: 0.3, c: 0x3363c2 }, // water deep
  { d: 0.35, c: 0x3766c7 }, // water shallow
  { d: 0.4, c: 0xd0d180 }, // sand
  { d: 0.55, c: 0x579718 }, // grass light
  { d: 0.6, c: 0x3f6a15 }, // grass dark
  { d: 0.7, c: 0x5d443e }, // dirt light
  { d: 0.9, c: 0x4d3b3a }, // dirt dark
  { d: 100.0, c: 0xfffeff }, // snow
];
const getColorFromHeight = (h) => {
  for (const { d, c } of COLOR_HEIGHTS) {
    if (h <= d) return c;
  }
  return 0;
};

export default (terrain) => {
  const colors = new Uint32Array(
    (CHUNK_SEGMENTS - 1) * (CHUNK_SEGMENTS - 1) * 2,
  );

  for (let i = 0; i < CHUNK_SEGMENTS - 1; i++)
    for (let j = 0; j < CHUNK_SEGMENTS - 1; j++) {
      const tl = terrain[i * CHUNK_SEGMENTS + j];
      const tr = terrain[i * CHUNK_SEGMENTS + j + 1];
      const bl = terrain[(i + 1) * CHUNK_SEGMENTS + j];
      const br = terrain[(i + 1) * CHUNK_SEGMENTS + j + 1];

      const colorIndex = i * 2 * (CHUNK_SEGMENTS - 1) + j * 2;
      // colors[colorIndex] = getColorFromHeight(mean([tr, bl, tl]));
      // colors[colorIndex + 1] = getColorFromHeight(mean([tr, bl, br]));
      colors[colorIndex] = colors[colorIndex + 1] = getColorFromHeight(
        mean([tr, br, bl, tl]),
      );
    }

  return colors;
};
