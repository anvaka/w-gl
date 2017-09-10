import Color from '../Color';

class PointAccessor {
  constructor(buffer, offset, color, data) {
    this.offset = offset;
    this.buffer = buffer;
    this.color = color || new Color(1, 1, 1, 1); 
    if (data !== undefined) {
      this.data = data;
    }
  }

  get x() {
    return this.buffer[this.offset];
  }

  get y() {
    return this.buffer[this.offset + 1];
  }

  update(point, defaults) {
    var offset = this.offset;
    var points = this.buffer;

    points[offset + 0] = point.x;
    points[offset + 1] = point.y;
    if (point.size || defaults) {
      points[offset + 2] = typeof point.size === 'number' ? point.size : defaults.size;
    }

    this.setColor(this.color);
  }

  setColor(color) {
    this.color = color;
    // TODO: This is waste, we can store rgba in 32 bits, not in the 3 * 3 * 8 bits?
    this.buffer[this.offset + 3] = color.r
    this.buffer[this.offset + 4] = color.g
    this.buffer[this.offset + 5] = color.b
  }
}

export default PointAccessor;