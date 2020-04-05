/**
 * Wire accessor provides access to the buffer that stores wires.
 * 
 * Wires are "lines" with 1.0 width.
 */
export default class WireAccessor {
  constructor(wireCollection, offset) {
    this.offset = offset;
    this._wire = wireCollection;
    this.update = wireCollection.is3D ? this.update3D : this.update2D;
  }

  update2D(from, to) {
    this._wire.isDirtyBuffer = true;
    var positions = this._wire.positions;
    var offset = this.offset;

    positions[offset + 0] = from.x;
    positions[offset + 1] = from.y;
    offset += 2;
    var hasColor = this._wire.allowColors;
    if (hasColor) {
      if (from.color !== undefined) this._wire.colors[offset] = from.color;
      offset += 1;
    }

    positions[offset + 0] = to.x
    positions[offset + 1] = to.y
    if (hasColor && to.color) {
      this._wire.colors[offset + 2] = to.color;
    }
  }

  update3D(from, to) {
    this._wire.isDirtyBuffer = true;
    var positions = this._wire.positions;
    var offset = this.offset;

    positions[offset + 0] = from.x
    positions[offset + 1] = from.y
    positions[offset + 2] = from.z || 0
    offset += 3;
    var hasColor = this._wire.allowColors;
    if (hasColor) {
      if (from.color !== undefined) this._wire.colors[offset] = from.color;
      //else this._wire.colors[offset] = toHex(this._wire.color)
      else this._wire.colors[offset] = toHex(this._wire.color)
      offset += 1;
    }

    positions[offset + 0] = to.x
    positions[offset + 1] = to.y
    positions[offset + 2] = to.z || 0
    if (hasColor) {
      if (to.color) this._wire.colors[offset + 3] = to.color;
      else this._wire.colors[offset + 3] = toHex(this._wire.color)
    }
  }
}

function toHex(color) {
  let r = Math.round(color.r * 255);
  let g = Math.round(color.g * 255);
  let b = Math.round(color.b * 255);
  let a = Math.round(color.a * 255);

  return (r << 24) | (g << 16) | (b << 8) | a;
}