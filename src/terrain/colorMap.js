import { Color } from 'three';

import { enforceSqrt, mean } from 'src/utils/math';

const SECONDARY_COLOR_HEIGHTS = [
  { d: 0.1, c: 0x261c0d },
  { d: 0.2, c: 0x593a23 },
  { d: 0.3, c: 0x5d443e },
  { d: 100.0, c: 0x4d3b3a },
];

const COLOR_HEIGHTS = [
  { d: 0.3, c: 0xefdda7 }, // water deep
  { d: 0.35, c: 0xe4e5a5 }, // water shallow
  { d: 0.4, c: 0xd0d180 }, // sand
  { d: 0.55, c: 0x596830 }, // grass light
  { d: 0.6, c: 0x593a23 }, // grass dark
  { d: 0.7, c: 0x5d443e }, // dirt light
  { d: 0.9, c: 0x4d3b3a }, // dirt dark
  { d: 100.0, c: 0xfffeff }, // snow
];
const tempColor = new Color();
for (const ch of [...COLOR_HEIGHTS, ...SECONDARY_COLOR_HEIGHTS]) {
  tempColor.set(ch.c);
  ch.r = (tempColor.r * 255) | 0;
  ch.g = (tempColor.g * 255) | 0;
  ch.b = (tempColor.b * 255) | 0;
  // ch.r = tempColor.r;
  // ch.g = tempColor.g;
  // ch.b = tempColor.b;
}

const getColorFromHeight = (heights, h) => {
  for (const ch of heights) {
    if (h <= ch.d) return ch;
  }
  return heights[0];
};

export function* iterateColorMap(terrain, secondary) {
  const size = enforceSqrt(terrain.length);

  // const colors = new Array((size - 1) * (size - 1));
  // console.log(terrain.length, colors.length);
  for (let x = 0; x < size - 1; x++) {
    for (let y = 0; y < size - 1; y++) {
      const i = x * size + y;
      const tl = terrain[i];
      const tr = terrain[i + 1];
      const bl = terrain[(x + 1) * size + y];
      const br = terrain[(x + 1) * size + y + 1];

      let ch;
      if (secondary[i] < 0.5) {
        ch = getColorFromHeight(PRE_COLOR_HEIGHTS, secondary[i]);
      } else {
        ch = getColorFromHeight(
          COLOR_HEIGHTS,
          mean([tr, br, bl, tl].filter(Boolean)),
        );
      }

      yield ch;
      yield ch;
    }
  }

  // return colors;
}
