export function getSpherical(r: number, theta: number, phi: number) {
  let z = r * Math.cos(theta);
  let x = r * Math.sin(theta) * Math.cos(phi);
  let y = r * Math.sin(theta) * Math.sin(phi);
  return [x, y, z];
}

export function clamp(v: number, min: number, max: number) {
  if (v < min) v = min;
  if (v > max) v = max;
  return v;
}

export function option(value: number | undefined, fallback: number) {
  if (value === undefined) return fallback;
  return value;
}

export function clampTo(x: number, threshold: number, clampValue: number) {
  return Math.abs(x) < threshold ? clampValue : x;
}