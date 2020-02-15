
import makeNodeProgram from './makePointsProgram';
import Element from '../Element';
import Color from '../Color';
import PointAccessor from './PointAccessor';

class PointCollection extends Element {
  constructor(capacity, options) {
    super();
    this.type = 'PointCollection';

    // TODO: Not sure I like this too much. But otherwise how can I track interactivity?
    this.pointsAccessor = [];
    this.is3D = options && options.is3D;
    // x, y, size, r, g, b
    this.itemsPerPoint = this.is3D ? 7 : 6; // TODO: Clamp color;

    this.capacity = capacity;
    this.pointsBuffer = new Float32Array(capacity * this.itemsPerPoint);
    this.count = 0;
    this._program = null;
    this.color = new Color(1, 1, 1, 1);
    this.size = 1;
  }

  draw(gl, drawContext) {
    if (!this._program) {
      this._program = makeNodeProgram(gl, this.pointsBuffer);
    }

    this._program.draw(this, drawContext);
  }

  dispose() {
    if (this._program) {
      this._program.dispose();
      this._program = null;
    }
  }

  add(point, data) {
    if (!point) throw new Error('Point is required');

    if (this.count >= this.capacity)  {
      this._extendArray();
    }
    let pointsBuffer = this.pointsBuffer;
    let offset = this.count * this.itemsPerPoint;
    let pointAccessor = new PointAccessor(pointsBuffer, offset, point.color || this.color, data, this.is3D);

    this.pointsAccessor.push(pointAccessor);

    pointAccessor.update(point, this)

    this.count += 1;
    return pointAccessor
  }

  _extendArray() {
    // This is because we would have to track every created point accessor
    // TODO: Whelp, a week older you thinks that we should be tracking the points
    // for interactivity... So, might as well implement this stuff. Remember anything
    // about premature optimization?
    // (2 years later:) Lol, dude you are talking with yourself :D
    throw new Error('Cannot extend array at the moment :(')
  }
}

export default PointCollection;
