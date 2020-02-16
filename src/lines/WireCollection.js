import BaseLineCollection from './BaseLineCollection';
import Element from '../Element';
import makeLinesProgram from './makeLinesProgram';
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
    this.itemsPerLine = 4; // (startX, startY) (endX, endY);
    if (this.is3D) this.itemsPerLine += 2; // Add two more for Z;

    this.capacity = capacity;
    this.count = 0;
    this.color = new Color(1, 1, 1, 1);
    this.type = 'WireCollection';
    this._program = null;
    this.rawBuffer = new ArrayBuffer(capacity * this.itemsPerLine * bytesPerElement)
    this.buffer = new Float32Array(this.rawBuffer);
  }

  draw(gl, drawContext) {
    if (!this._program) {
      this._program = makeLinesProgram(gl, this.buffer, /* drawTriangles = */ false, this.is3D);
    }
    this._program.draw(this, drawContext);
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
    var newCapacity = this.capacity * this.itemsPerLine * 2;
    var extendedArray = new Float32Array(newCapacity);
    if (this.buffer) {
      extendedArray.set(this.buffer);
    }

    this.buffer = extendedArray;
    this.capacity = newCapacity;
  }
}

export default WireCollection;