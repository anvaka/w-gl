import Color from '../Color';

export default class Point {
  x: number;
  y: number;
  color?: Color;
  size?: number;

  constructor(x: number, y: number, size?: number) {
    if (Number.isNaN(x)) throw new Error('x is not a number');
    if (Number.isNaN(y)) throw new Error('y is not a number');

    this.x = x;
    this.y = y;
    this.color = new Color(255, 255, 255)

    this.size = Number.isFinite(size) ? size : 4;
  }
}