export const lerp2 = (A, B, fraction) => Math.round(A + fraction * (B - A));

export const lerp = (vals, fraction) => {
  const delta = 1.0 / vals.length;
  for (let i = 0, min = delta; i < vals.length - 1; i++, min += delta) {
    if (fraction <= min)
      return lerp2(vals[i], vals[i + 1], (min - delta - fraction) / delta);
  }
  return vals[vals.length - 1];
};

export const inverseLerp = (A, B, value) => (value - A) / (B - A);

export const mean = (arr) => {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
};

export const clamp = (val, min, max) => {
  if (val < min) return min;
  if (val > max) return max;
  return val;
};
