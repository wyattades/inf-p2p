import { isInteger } from 'lodash';

export const lerp2 = (A: number, B: number, fraction: number) =>
  Math.round(A + fraction * (B - A));

export const lerp = (vals: number[], fraction: number) => {
  const delta = 1.0 / vals.length;
  for (let i = 0, min = delta; i < vals.length - 1; i++, min += delta) {
    if (fraction <= min)
      return lerp2(vals[i], vals[i + 1], (min - delta - fraction) / delta);
  }
  return vals[vals.length - 1];
};

export const inverseLerp = (A: number, B: number, value: number) =>
  (value - A) / (B - A);

export const mean = (arr: number[]) => {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
};

export const clamp = (val: number, min: number, max: number) => {
  if (val < min) return min;
  if (val > max) return max;
  return val;
};

export const toNum = (input: any): number | null => {
  let num: number | undefined;
  if (typeof num === 'string') num = Number(input);
  else if (typeof num === 'number') num = input;
  if (num == null || Number.isNaN(num)) return null;
  else return num;
};
export const toInt = (input: any): number | null => {
  const num = toNum(input);
  return num === null ? null : num | 0;
};

export const enforceSqrt = (val: number) => {
  const sqrt = Math.sqrt(val);
  if (!isInteger(sqrt)) throw new Error(`${val} is not a square number`);
  return sqrt;
};

export const distanceSq = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
};
