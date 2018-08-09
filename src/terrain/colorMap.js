import { mean } from '../utils';
import { CHUNK_SEGMENTS } from '../constants';


const COLOR_HEIGHTS = [
  { d: 0.3, c: 0x3363c2 },
  { d: 0.4, c: 0x3766c7 },
  { d: 0.45, c: 0xd0d180 },
  { d: 0.55, c: 0x579718 },
  { d: 0.6, c: 0x3f6a15 },
  { d: 0.7, c: 0x5d443e },
  { d: 0.9, c: 0x4d3b3a },
  { d: 1.0, c: 0xfffeff },
];
const getColorFromHeight = (h) => {
  for (const { d, c } of COLOR_HEIGHTS) {
    if (h <= d) return c;
  }
  return 0;
};

export default (terrain) => {
  const colors = new Uint32Array((CHUNK_SEGMENTS - 1) * (CHUNK_SEGMENTS - 1) * 2);

  for (let i = 0; i < CHUNK_SEGMENTS - 1; i++) for (let j = 0; j < CHUNK_SEGMENTS - 1; j++) {

    const tl = terrain[i * CHUNK_SEGMENTS + j];
    const tr = terrain[i * CHUNK_SEGMENTS + j + 1];
    const bl = terrain[(i + 1) * CHUNK_SEGMENTS + j];
    const br = terrain[(i + 1) * CHUNK_SEGMENTS + j + 1];

    const colorIndex = i * 2 * (CHUNK_SEGMENTS - 1) + j * 2;
    // colors[colorIndex] = getColorFromHeight(mean([tr, bl, tl]));
    // colors[colorIndex + 1] = getColorFromHeight(mean([tr, bl, br]));
    colors[colorIndex] = colors[colorIndex + 1] = getColorFromHeight(mean([tr, br, bl, tl]));
  }

  return colors;
};
