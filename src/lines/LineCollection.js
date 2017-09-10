import BaseLineCollection from './BaseLineCollection';
import makeLinesProgram from './makeLinesProgram';
import LineAccessor from './LineAccessor';

/**
 * Lines have varying thickness. That comes at extra price: Each line
 * requires additional space in buffer, as it is rendered as triangles
 */
class LineCollection extends BaseLineCollection {
  constructor(capacity) {
    super(capacity, 12); // items per thick line
    this.type = 'LineCollection';
  }

  _makeProgram(gl) {
    return makeLinesProgram(gl, this.buffer, /* drawTriangles = */ true);
  }

  _addInternal(line, offset) {
    // TODO: width
    let lineUI = new LineAccessor(this.buffer, offset);
    lineUI.update(line.from, line.to)
    return lineUI;
  }
}

export default LineCollection;