import Element from '../Element';
import makeWireProgram from './makeWireProgram';
import WireAccessor from './WireAccessor';
import Color from '../Color';

/**
 * Unlike lines, wires do not have width, and are always 1px wide, regardless
 * of resolution.
 */
class WireCollection extends Element {
  constructor(capacity, options) {
    super();
    let bytesPerElement = 4; // float32 or uint32 - both require 4 bytes
    this.is3D = options && options.is3D;
    this.allowColors = options && options.allowColors;
    this.itemsPerLine = 4; // (startX, startY) (endX, endY);
    if (this.is3D) this.itemsPerLine += 2; // Add two more for Z;
    if (this.allowColors) this.itemsPerLine += 2; // Add two more for color

    this.capacity = capacity;
    this.count = 0;
    this.color = new Color(1, 1, 1, 1);
    this.type = 'WireCollection';
    this._program = null;
    this.buffer = new ArrayBuffer(capacity * this.itemsPerLine * bytesPerElement)
    this.positions = new Float32Array(this.buffer);

    if (this.allowColors) {
      // We are sharing the buffer!
      this.colors = new Uint32Array(this.buffer);
    }
  }

  draw(gl, drawContext) {
    if (!this._program) {
      this._program = makeWireProgram(gl, this);
    }
    this._program.draw(drawContext);
  }

  add(line) {
    if (!line) throw new Error('Line is required');

    if (this.count >= this.capacity)  {
      this._extendArray();
    }

    var offset = this.count * this.itemsPerLine;
    let ui = new WireAccessor(this, offset);
    ui.update(line.from, line.to)

    this.count += 1;
    return ui;
  }

  dispose() {
    if (this._program) {
      this._program.dispose();
      this._program = null;
    }
  }

  // TODO: Remove - it duplicates baseline collection 
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

export default WireCollection;