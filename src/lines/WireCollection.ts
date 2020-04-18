import Element from '../Element';
import makeWireProgram from './makeWireProgram';
import makeThickWireProgram from './makeThickWireProgram';
import WireAccessor from './WireAccessor';
import Color from '../Color';
import { ColorPoint, Line } from 'src/global';
import { DrawContext } from 'src/createScene';

export interface WireCollectionOptions {
  allowColors?: boolean
  is3D?: boolean
  width?: number
}

/**
 * Collection of lines. TODO: I think I should rename this to LineCollection
 */
export default class WireCollection extends Element {
  readonly allowColors: boolean;
  readonly is3D: boolean;
  readonly itemsPerLine: number;
  capacity: number;
  count: number;
  color: Color;
  /**
   * uniform width of the line.
   */
  width: number;
  buffer: ArrayBuffer;
  positions: Float32Array; // Note: this type may not be enough sometimes.
  colors: Uint32Array | null;
  private _program: any;

  constructor(capacity: number, options: WireCollectionOptions) {
    super();

    let bytesPerElement = 4; // float32 or uint32 - both require 4 bytes
    this.allowColors = !options || options.allowColors === undefined || options.allowColors;
    this.is3D = !options || options.is3D === undefined || options.is3D;
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
    this.width = (options && options.width) || 1;

    if (this.allowColors) {
      // We are sharing the buffer!
      this.colors = new Uint32Array(this.buffer);
    } else {
      this.colors = null;
    }
  }

  draw(gl: WebGLRenderingContext, drawContext: DrawContext) {
    if (!this._program) {
      this._program = isWidthForThickWire(this.width) ? makeThickWireProgram(gl, this) : makeWireProgram(gl, this);
    }
    this._program.draw(drawContext);
  }

  setLineWidth(newLineWidth: number) {
    if (newLineWidth === this.width) return;

    let isThickWire = isWidthForThickWire(newLineWidth);
    this.width = newLineWidth

    if (!this._program || !this.scene) return;
    if (isThickWire && this._program.isThickWire) {
      // next frame should handle this
      this.scene.renderFrame();
      return;
    }

    // we need to switch the program
    if (this.parent) {
      let parent = this.parent;
      parent.removeChild(this)
      this.dispose();
      parent.appendChild(this);
    }
  }

  add(line: Line) {
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

  forEachLine(callback: (from: ColorPoint, to: ColorPoint) => void) {
    const {positions, count, itemsPerLine} = this;
    let maxOffset = count * itemsPerLine;

    if (this.is3D) {
      for (let i = 0; i < maxOffset; i += itemsPerLine) {
        let from: ColorPoint = {
          x: positions[i],
          y: positions[i + 1],
          z: positions[i + 2]
        }
        let next = i + 3;
        if (this.colors) {
          from.color = this.colors[i + 3];
          next += 1;
        }
        let to: ColorPoint = {
          x: positions[next],
          y: positions[next + 1],
          z: positions[next + 2]
        };
        if (this.colors) {
          to.color = this.colors[next + 3];
        }
        callback(from, to);
      }
    } else {
      for (let i = 0; i < maxOffset; i += itemsPerLine) {
        let from: ColorPoint = {
          x: positions[i],
          y: positions[i + 1],
          z: 0,
        }
        let next = i + 2;
        if (this.colors) {
          from.color = this.colors[i + 2];
          next += 1;
        }
        let to: ColorPoint = {
          x: positions[next],
          y: positions[next + 1],
          z: 0,
        };
        if (this.colors) {
          to.color = this.colors[next + 2];
        }
        callback(from, to);
      }
    }
  }

  dispose() {
    if (this._program) {
      // TODO: Dispose only when last using element stops using this program.
      // this._program.dispose();
      this._program = null;
    }
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

function isWidthForThickWire(width?: number) {
  return width !== undefined && width !== 1 && width > 0;
}