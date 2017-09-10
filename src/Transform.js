class Transform {
  constructor(scale, dx, dy) {
    scale = scale || 1;
    dx = dx || 0;
    dy = dy || 0;
    this._array = [
      scale, 0,  0, 0,
      0, scale,  0, 0,
      0, 0,  1, 0,
      dx, dy,  0, 1
    ]
  }

  multiply(a, b) {
    var scale = a.scale * b.scale;
    var dx = a.scale * b.dx + a.dx;
    var dy = a.scale * b.dy + a.dy;

    this.scale = scale;
    this.dx = dx;
    this.dy = dy;

    return this;
  }

  get scale() {
    return this._array[0];
  }

  get dx() {
    return this._array[12];
  }

  get dy() {
    return this._array[13];
  }

  set dx(newDx) {
    this._array[12] = newDx;
  }
  
  set dy(newDy) {
    this._array[13] = newDy;
  }

  set scale(newScale) {
    this._array[0] = newScale;
    this._array[5] = newScale;
  }

  copyTo(dst) {
    copyArray(this._array, dst._array);
    return this;
  }

  getArray() {
    return this._array;
  }
}

export default Transform;

function copyArray(from, to) {
  if (from.length !== to.length) {
    throw new Error('Array length mismatch');
  }

  for(var i = 0; i < from.length; ++i) {
    to[i] = from[i];
  }
}