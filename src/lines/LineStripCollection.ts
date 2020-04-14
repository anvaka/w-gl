import Element from '../Element';
import Color from '../Color';
import makeLineStripProgram from './makeLineStripProgram';

/**
 * Line strip is implemented as a cyclic buffer. Each subsequent element of the
 * buffer is connected with a line to the previous element of the buffer.
 */
export default class LineStripCollection extends Element {
  drawCount: number;
  madeFullCircle: boolean;
  allowColors: boolean;
  is3D: boolean;
  itemsPerLine: number;
  capacity: any;
  nextElementIndex: number;
  _program: any;
  color: Color;
  buffer: ArrayBuffer;
  positions: Float32Array;
  colors: Uint32Array;

  constructor(capacity, options) {
    super();

    let bytesPerElement = 4;
    this.drawCount = 0;
    this.madeFullCircle = false;

    this.allowColors = !options || options.allowColors === undefined || options.allowColors;
    this.is3D = !options || options.is3D === undefined || options.is3D;

    this.itemsPerLine = 2;
    if (this.allowColors) this.itemsPerLine += 1;
    if (this.is3D) this.itemsPerLine += 1;

    this.capacity = capacity;
    this.nextElementIndex = 1;
    this._program = null;
    this.color = new Color(1, 1, 1, 1);

    // Add extra one item to the buffer capacity to join two line strips and form a cycle.
    this.buffer = new ArrayBuffer((capacity + 1) * this.itemsPerLine * bytesPerElement)
    this.positions = new Float32Array(this.buffer);

    if (this.allowColors) {
      // We are sharing the buffer!
      this.colors = new Uint32Array(this.buffer);
    }
  }

  draw(gl, drawContext) {
    if (!this._program) {
      this._program = makeLineStripProgram(gl, this);
    }
    this._program.draw(this, drawContext);
  }

  add(segment) {
    let offset = this.nextElementIndex * this.itemsPerLine;
    let positions = this.positions;
    positions[offset] = segment.x; offset += 1;
    positions[offset] = segment.y; offset += 1;
    if (this.is3D) {
      positions[offset] = segment.z || 0; offset += 1;
    }
    if (this.allowColors) {
      this.colors[offset] = segment.color === undefined ? 0xffffffff : segment.color;
    }
    this.nextElementIndex += 1;
    this.drawCount += 1;

    if (this.nextElementIndex > this.capacity) {
      this.nextElementIndex = 1;
      let firstOffset = 0;
      positions[firstOffset] = segment.x; firstOffset += 1;
      positions[firstOffset] = segment.y; firstOffset += 1;
      if (this.is3D) {
        positions[firstOffset] = segment.z || 0; firstOffset += 1;
      }
      if (this.allowColors) {
        this.colors[firstOffset] = this.colors[offset];
      }
      this.madeFullCircle = true;
    }
  }

  dispose() {
    if (this._program) {
      this._program.dispose();
      this._program = null;
    }
  }
}