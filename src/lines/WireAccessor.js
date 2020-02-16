/**
 * Wire accessor provides access to the buffer that stores wires.
 * 
 * Wires are "lines" with 1.0 width.
 */
class WireAccessor {
  constructor(wireCollection, offset) {
    this.offset = offset;
    this._wire = wireCollection;
    this.update = wireCollection.is3D ? this.update3D : this.update2D;
  }

  update2D(from, to) {
    var buffer = this._wire.positions;
    var offset = this.offset;

    buffer[offset + 0] = from.x
    buffer[offset + 1] = from.y

    buffer[offset + 2] = to.x
    buffer[offset + 3] = to.y
  }

  update3D(from, to) {
    var buffer = this._wire.positions;
    var offset = this.offset;

    buffer[offset + 0] = from.x
    buffer[offset + 1] = from.y
    buffer[offset + 2] = from.z || 0

    buffer[offset + 3] = to.x
    buffer[offset + 4] = to.y
    buffer[offset + 5] = to.z || 0
  }
}

export default WireAccessor;