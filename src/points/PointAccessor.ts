import PointCollection from './PointCollection';
import { PointWithSize } from 'src/global';

/**
 * Provides access to a single point in the PointCollection
 */
export default class PointAccessor {
  offset: any;
  data?: any;
  _points: PointCollection;

  constructor(points: PointCollection, offset: number, data?: any) {
    this.offset = offset;
    this._points = points;
    if (data !== undefined) {
      this.data = data;
    }
  }

  update(point: PointWithSize) {
    let offset = this.offset;
    let points = this._points.positions;
    let is3D = this._points.is3D;

    points[offset] = point.x; offset++;
    points[offset] = point.y; offset++;
    if (is3D) {
      points[offset] = point.z || 0; offset++;
    }

    let size = point.size || this._points.size || 1;
    if (size !== undefined) {
      points[offset] = size;
    }

    this.setColor(point.color);
  }

  setColor(color?: number) {
    if (!this._points.colors || color === undefined) return;
    var offset = this.offset + (this._points.is3D ? 4 : 3);
    this._points.colors[offset] = color;
  }
}
