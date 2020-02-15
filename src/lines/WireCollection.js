import BaseLineCollection from './BaseLineCollection';
import makeLinesProgram from './makeLinesProgram';
import WireAccessor from './WireAccessor';

/**
 * Unlike lines, wires do not have width, and are always 1px wide, regardless
 * of resolution.
 */
class WireCollection extends BaseLineCollection {
  constructor(capacity, options) {
    var is3D = options && options.is3D;
    super(capacity, is3D ? 6 : 4); // items per wire
    this.is3D = is3D;
    this.type = 'WireCollection';
  }

  _makeProgram(gl) {
    return makeLinesProgram(gl, this.buffer, /* drawTriangles = */ false, this.is3D);
  }

  _addInternal(line, offset) {
    let lineUI = new WireAccessor(this, offset);
    lineUI.update(line.from, line.to)
    return lineUI;
  }
}

export default WireCollection;