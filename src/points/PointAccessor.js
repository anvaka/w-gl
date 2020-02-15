import Color from '../Color';

class PointAccessor {
  constructor(buffer, offset, color, data, is3D) {
    this.offset = offset;
    this.buffer = buffer;
    this.color = color || new Color(1, 1, 1, 1); 
    this.is3D = is3D;
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

  get z() {
    return this.buffer[this.offset + 2];
  }

  update(point, defaults) {
    var offset = this.offset;
    var points = this.buffer;

    points[offset] = point.x; offset++;
    points[offset] = point.y; offset++;
    if (this.is3D) {
      points[offset] = point.z; offset++;
    }
    if (point.size || defaults) {
      points[offset] = typeof point.size === 'number' ? point.size : defaults.size;
      offset++;
    }

    this.setColor(this.color);
  }

  setColor(color) {
    this.color = color;
    var from = this.is3D ? this.offset + 4 : this.offset + 3;
    // TODO: This is waste, we can store rgba in 32 bits, not in the 3 * 3 * 8 bits?
    this.buffer[from + 0] = color.r
    this.buffer[from + 1] = color.g
    this.buffer[from + 2] = color.b
  }
}

export default PointAccessor;