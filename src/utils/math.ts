import { isInteger } from 'lodash-es';

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

export const isNumber = (v: any): v is number =>
  typeof v === 'number' && !Number.isNaN(v);

export const toNum = (input: any): number | null => {
  let num: number | undefined;
  if (typeof input === 'string') num = Number(input);
  else if (typeof input === 'number') num = input;
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

export const copyVector = (from: Point3, to: Point3) => {
  to.x = from.x;
  to.y = from.y;
  to.z = from.z;
  return to;
};
