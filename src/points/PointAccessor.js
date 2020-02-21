class PointAccessor {
  constructor(points, offset, data) {
    this.offset = offset;
    this._points = points;
    if (data !== undefined) {
      this.data = data;
    }
  }

  update(point) {
    let offset = this.offset;
    let points = this._points.positions;
    let is3D = this._points.is3D;

    points[offset] = point.x; offset++;
    points[offset] = point.y; offset++;
    if (is3D) {
      points[offset] = point.z || 0; offset++;
    }

    let size = point.size || this._points.size || 1;
    if (size) {
      points[offset] = size;
    }

    this.setColor(point.color);
  }

  setColor(color) {
    if (!this._points.colors) return;
    var offset = this.offset + (this._points.is3D ? 4 : 3);
    this._points.colors[offset] = color;
  }
}

export default PointAccessor;