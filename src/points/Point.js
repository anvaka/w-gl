import Color from '../Color';

class Point {
  constructor(x, y, size) {
    if (Number.isNaN(x)) throw new Error('x is not a number');
    if (Number.isNaN(y)) throw new Error('y is not a number');

    this.x = x;
    this.y = y;
    this.color = new Color(255, 255, 255)

    this.size = Number.isFinite(size) ? size : 4;
  }
}

export default Point;