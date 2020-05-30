
export function mixUint32Color(c0: number, c1: number, t = 0.5) {
  let a = toRgba(c0);
  let b = toRgba(c1);

  return [
    a[0] * t + (1 - t) * b[0],
    a[1] * t + (1 - t) * b[1],
    a[2] * t + (1 - t) * b[2],
    a[3] * t + (1 - t) * b[3],
  ]
}

export function toRgba(x: number) {
  return [
    (x >> 24) & 0xff / 255,
    (x >> 16) & 0xff / 255,
    (x >> 8) & 0xff / 255,
    (x) & 0xff / 255
  ];
}

export function toHexColor(c: number[]) {
  let r = hexString(c[0]);
  let g = hexString(c[1])
  let b = hexString(c[2])
  return `#${r}${g}${b}`;
}

export function hexString(x: number) {
  let v = Math.floor(x * 255).toString(16);
  return (v.length === 1) ? '0' + v : v;
}