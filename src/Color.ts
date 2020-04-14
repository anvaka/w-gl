export default class Color {
  r: number;
  g: number;
  b: number;
  a: number;
  
  constructor(r: number, g: number, b: number, a = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a === undefined ? 1 : a
  }
}