import Color from '../Color';
import Element from '../Element';

class BaseLineCollection extends Element {
  constructor(capacity, itemsPerLine) {
    super();

    this.itemsPerLine = itemsPerLine;
    this.capacity = capacity;
    this.count = 0;
    this._program = null;
    this.color = new Color(1, 1, 1, 1);
    this.buffer = new Float32Array(capacity * this.itemsPerLine);
  }

  draw(gl, drawContext) {
    if (!this._program) {
      this._program = this._makeProgram(gl);
    }
    this._program.draw(this, drawContext);
  }

  _makeProgram() {
    throw new Error('Not implemented');
  }

  _addInternal() {
    throw new Error('Not implemented');
  }

  add(line) {
    if (!line) throw new Error('Line is required');

    if (this.count >= this.capacity)  {
      this._extendArray();
    }

    var offset = this.count * this.itemsPerLine;
    var ui = this._addInternal(line, offset);

    this.count += 1;
    return ui;
  }

  dispose() {
    if (this._program) {
      this._program.dispose();
      this._program = null;
    }
  }

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

export default BaseLineCollection;