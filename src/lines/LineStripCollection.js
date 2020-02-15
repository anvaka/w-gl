import Element from '../Element';
import Color from '../Color';
import makeLineStripProgram from './makeLineStripProgram';

/**
 * Line strip is implemented as a cyclic buffer. Each subsequent element of the
 * buffer is connected with a line to the previous element of the buffer.
 */
export default class LineStripCollection extends Element {
  constructor(capacity, options) {
    super();

    let bytesPerElement = 4;
    this.drawCount = 0;
    this.madeFullCircle = false;

    this.allowColors = options && options.allowColors;
    this.is3D = options && options.is3D;

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

  add(x, y, color) {
    var offset = this.nextElementIndex * this.itemsPerLine;
    let positions = this.positions;
    positions[offset] = x;
    positions[offset + 1] = y;

    if (this.allowColors) {
      this.colors[offset + 2] = color === undefined ? 0 : color;
    }
    this.nextElementIndex += 1;
    this.drawCount += 1;

    if (this.nextElementIndex > this.capacity) {
      this.nextElementIndex = 1;
      positions[0] = x;
      positions[0 + 1] = y;
      if (this.allowColors) {
        this.colors[2] = this.colors[offset + 2];
      }
      this.madeFullCircle = true;
    }
  }

  add3(x, y, z, color) {
    var offset = this.nextElementIndex * this.itemsPerLine;
    let positions = this.positions;
    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;

    if (this.allowColors) {
      this.colors[offset + 3] = color === undefined ? 0 : color;
    }
    this.nextElementIndex += 1;
    this.drawCount += 1;

    if (this.nextElementIndex > this.capacity) {
      this.nextElementIndex = 1;
      positions[0] = x;
      positions[0 + 1] = y;
      positions[0 + 2] = z;
      if (this.allowColors) {
        this.colors[3] = this.colors[offset + 3];
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