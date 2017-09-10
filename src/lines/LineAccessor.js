class LineAccessor {
  constructor(buffer, offset) {
    this.offset = offset;
    this.buffer = buffer;
    this.width = 1;
  }

  setWidth(width) {
    this.width = width;
  }

  update(from, to) {
    var buffer = this.buffer;
    var offset = this.offset;

    var dx = to.x - from.x
    var dy = to.y - from.y
    if (dx === 0) dx = 1e-4;
    if (dy === 0) dy = 1e-4;

    var norm = Math.sqrt(dx * dx + dy * dy);
    var u = dx/norm;
    var v = dy/norm;

    let width = this.width;
    let uw = width * u;
    let vw = width * v;
    var x0 = from.x + vw;
    var y0 = from.y - uw;
    var x1 = to.x + vw;
    var y1 = to.y - uw;
    var x2 = from.x - vw;
    var y2 = from.y + uw;
    var x3 = to.x - vw;
    var y3 = to.y + uw;

    // Start
    buffer[offset + 0] = x0
    buffer[offset + 1] = y0

    buffer[offset + 2] = x1
    buffer[offset + 3] = y1

    buffer[offset + 4] = x2
    buffer[offset + 5] = y2

    offset += 6

    // End
    buffer[offset + 0] = x1
    buffer[offset + 1] = y1

    buffer[offset + 2] = x2
    buffer[offset + 3] = y2

    buffer[offset + 4] = x3
    buffer[offset + 5] = y3
    // buffer[offset + 0] = from.x
    // buffer[offset + 1] = from.y

    // buffer[offset + 2] = to.x
    // buffer[offset + 3] = to.y
  }
}

export default LineAccessor;