import { Color } from 'three';

import { mean } from 'src/utils/math';
import { CHUNK_SEGMENTS } from 'src/constants';

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
const tempColor = new Color();
for (const ch of COLOR_HEIGHTS) {
  tempColor.set(ch.c);
  ch.r = (tempColor.r * 255) | 0;
  ch.g = (tempColor.g * 255) | 0;
  ch.b = (tempColor.b * 255) | 0;
  // ch.r = tempColor.r;
  // ch.g = tempColor.g;
  // ch.b = tempColor.b;
}

const getColorFromHeight = (h) => {
  for (const ch of COLOR_HEIGHTS) {
    if (h <= ch.d) return ch;
  }
  return COLOR_HEIGHTS[0];
};

export function* iterateColorMap(terrain) {
  // const colors = new Array((CHUNK_SEGMENTS - 1) * (CHUNK_SEGMENTS - 1));
  // console.log(terrain.length, colors.length);
  for (let i = 0; i < CHUNK_SEGMENTS - 1; i++) {
    for (let j = 0; j < CHUNK_SEGMENTS - 1; j++) {
      const tl = terrain[i * CHUNK_SEGMENTS + j];
      const tr = terrain[i * CHUNK_SEGMENTS + j + 1];
      const bl = terrain[(i + 1) * CHUNK_SEGMENTS + j];
      const br = terrain[(i + 1) * CHUNK_SEGMENTS + j + 1];

      // const colorIndex = i * 2 * (CHUNK_SEGMENTS - 1) + j * 2;
      // const colorIndex = i * (CHUNK_SEGMENTS - 1) + j;
      // colors[colorIndex] = getColorFromHeight(mean([tr, bl, tl]));
      // colors[colorIndex + 1] = getColorFromHeight(mean([tr, bl, br]));
      const ch = getColorFromHeight(mean([tr, br, bl, tl].filter(Boolean)));
      // colors[colorIndex] = ch;
      // colors[colorIndex] = colors[colorIndex + 1] = ch;
      yield ch;
      yield ch;
    }
  }

  // return colors;
}
