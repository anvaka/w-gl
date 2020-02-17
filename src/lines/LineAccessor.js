class LineAccessor {
  constructor(lineCollection, offset) {
    // Please don't use this class. It maybe removed soon.
    this.offset = offset;
    this.lineCollection = lineCollection;
    this.width = 1;
  }

  setWidth(width) {
    this.width = width;
  }

  update(from, to) {
    var buffer = this.lineCollection.buffer;
    var offset = this.offset;
    var is3D = this.lineCollection.is3D;

    var dx = to.x - from.x
    var dy = to.y - from.y
    var dz = is3D ? to.z - from.z : 0;
    if (dx === 0) dx = 1e-4;
    if (dy === 0) dy = 1e-4;
    if (dz === 0) dz = 1e-4;

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

    if (is3D) {
      // Start
      buffer[offset + 0] = x0
      buffer[offset + 1] = y0
      buffer[offset + 2] = from.z

      buffer[offset + 3] = x1
      buffer[offset + 4] = y1
      buffer[offset + 5] = to.z 

      buffer[offset + 6] = x2
      buffer[offset + 7] = y2
      buffer[offset + 8] = from.z 

      offset += 9

      // End
      buffer[offset + 0] = x1
      buffer[offset + 1] = y1
      buffer[offset + 2] = to.z 

      buffer[offset + 3] = x2
      buffer[offset + 4] = y2
      buffer[offset + 5] = from.z

      buffer[offset + 6] = x3
      buffer[offset + 7] = y3
      buffer[offset + 8] = to.z
    } else {
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
    }
  }
}

export default LineAccessor;