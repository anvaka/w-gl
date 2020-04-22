
import makePointsProgram from './makePointsProgram';
import Element from '../Element';
import Color from '../Color';
import PointAccessor from './PointAccessor';
import { DrawContext } from 'src/createScene';
import { ColorPoint } from 'src/global';

interface PointCollectionOptions {
  /**
   * If true, then each point has three dimensions (requires more memory)
   */
  is3D?: boolean

  /**
   * If true, then colors can be set on each point (4 byte per point)
   */
  allowColors?: boolean
}

export default class PointCollection extends Element {
  is3D: boolean;
  allowColors: boolean;

  /**
   * Allocated buffer capacity
   */
  capacity: number;

  /**
   * Total number of points in the collection that should be rendered.
   */
  count: number;
  color: Color;
  buffer: ArrayBuffer;
  positions: Float32Array;
  colors: Uint32Array | null;
  size?: number;
  itemsPerPoint: number;
  _program: any;

  constructor(capacity: number, options: PointCollectionOptions) {
    if (capacity === undefined) {
      throw new Error('Point capacity should be defined');
    }
    super();

    this.is3D = !options || options.is3D === undefined || options.is3D;
    this.allowColors = !options || options.allowColors === undefined || options.allowColors;
    
    this.itemsPerPoint = 3; // (x, y, size)
    if (this.is3D) this.itemsPerPoint += 1;
    if (this.allowColors) this.itemsPerPoint += 1;

    this.capacity = capacity;
    this.count = 0;
    this.color = new Color(1, 1, 1, 1);
    this._program = null;
    this.buffer = new ArrayBuffer(capacity * this.itemsPerPoint * 4);
    this.positions = new Float32Array(this.buffer);
    this.colors = this.allowColors ? new Uint32Array(this.buffer) : null;
  }

  draw(gl: WebGLRenderingContext, drawContext: DrawContext) {
    if (!this._program) {
      this._program = makePointsProgram(gl, this);
    }

    this._program.draw(drawContext);
  }

  dispose() {
    if (this._program) {
      // TODO: Dispose only when last using element stops using this program
      // this._program.dispose();
      this._program = null;
    }
  }

  add(point: ColorPoint, data?: any) {
    if (!point) throw new Error('Point is required');

    if (this.count >= this.capacity)  {
      this._extendArray();
    }

    var offset = this.count * this.itemsPerPoint;
    let ui = new PointAccessor(this, offset, data);
    ui.update(point)

    this.count += 1;
    return ui;
  }

  _extendArray() {
    // Every time we run out of space create new array twice bigger.
    var buffer = new ArrayBuffer(this.buffer.byteLength * 2);
    var extendedArray = new Float32Array(buffer);
    if (this.positions) {
      extendedArray.set(this.positions);
    }

    this.buffer = buffer;
    this.positions = extendedArray;
    if (this.allowColors) {
      this.colors = new Uint32Array(buffer);
    }
    this.capacity *= 2;
  }
}
