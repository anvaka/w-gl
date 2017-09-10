class Line {
  constructor(fromPoint, toPoint) {
    if (Number.isNaN(fromPoint.x)) throw new Error('x is not a number');
    if (Number.isNaN(fromPoint.y)) throw new Error('y is not a number');
    if (Number.isNaN(toPoint.x)) throw new Error('x is not a number');
    if (Number.isNaN(toPoint.y)) throw new Error('y is not a number');

    this.from = fromPoint;
    this.to = toPoint;
  }
}

export default Line