import BaseLineCollection from './BaseLineCollection';
import makeLinesProgram from './makeLinesProgram';
import LineAccessor from './LineAccessor';

/**
 * Lines have varying thickness. That comes at extra price: Each line
 * requires additional space in buffer, as it is rendered as triangles
 * 
 * Please don't use this class. It maybe removed soon.
 */
class LineCollection extends BaseLineCollection {
  constructor(capacity, options) {
    var is3D = options && options.is3D;
    super(capacity, is3D ? 9 + 9 : 6 + 6); // items per thick line
    this.type = 'LineCollection';
    this.is3D = is3D;
  }

  _makeProgram(gl) {
    return makeLinesProgram(gl, this.buffer, /* drawTriangles = */ true, this.is3D);
  }

  _addInternal(line, offset) {
    // TODO: width
    let lineUI = new LineAccessor(this, offset);
    lineUI.update(line.from, line.to)
    return lineUI;
  }
}

export default LineCollection;