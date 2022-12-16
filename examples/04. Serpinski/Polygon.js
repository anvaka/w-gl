class Polygon {
  constructor(points) {
    this.points = points;
  }
  
  getRandomPointInside() {
    // Get the bounding rectangle of the polygon
    const bounds = this.getBoundingBox();

    // Generate a random point inside the bounding rectangle
    while(true) {
      const x = bounds.left + Math.random() * bounds.width;
      const y = bounds.top + Math.random() * bounds.height;
      const z = 0;

      if (this.containsPoint(x, y)) return [x, y, z];
    } 
  }

  getBoundingBox() {
    // Initialize the bounding rectangle with the first point in the polygon
    let left = this.points[0][0];
    let top = this.points[0][1];
    let right = left;
    let bottom = top;

    // Update the bounding rectangle with each subsequent point in the polygon
    for (const point of this.points) {
      left = Math.min(left, point[0]);
      top = Math.min(top, point[1]);
      right = Math.max(right, point[0]);
      bottom = Math.max(bottom, point[1]);
    }

    // Return the bounding rectangle as an object
    return {
      left,
      top,
      width: right - left,
      height: bottom - top
    };
  }
  
  getRandomCorner() {
    // Pick a random index from 0 to the number of points in the polygon
    const index = Math.floor(Math.random() * this.points.length);

    // Return the point at the specified index
    return this.points[index];
  }
  
  getMiddlePointBetween(a, b) {
    // Calculate the x and y coordinates of the middle point
    const x = (a[0] + b[0]) / 2;
    const y = (a[1] + b[1]) / 2;
    const z = (a[2] + b[2]) / 2;

    // Return the middle point
    return [x, y, z];
  }


  containsPoint(x, y) {
    // Check if the point is outside the bounds of the polygon
    if (x < this.getBoundingBox().left || x > this.getBoundingBox().right ||
        y < this.getBoundingBox().top || y > this.getBoundingBox().bottom) {
      return false;
    }

    // Cast a ray from the point in the positive x direction and count the
    // number of intersections with the edges of the polygon
    let intersectCount = 0;
    for (let i = 0; i < this.points.length; i++) {
      const p1 = this.points[i];
      const p2 = this.points[(i + 1) % this.points.length];

      if (p1[1] === p2[1]) {
        // Skip horizontal edges
        continue;
      }

      if (y > Math.min(p1[1], p2[1])) {
        if (y <= Math.max(p1[1], p2[1])) {
          if (x <= Math.max(p1[0], p2[0])) {
            if (p1[1] !== p2[1]) {
              const xIntersection = (y - p1[1]) * (p2[0] - p1[0]) / (p2[1] - p1[1]) + p1[0];

              if (p1[0] === p2[0] || x <= xIntersection) {
                intersectCount++;
              }
            }
          }
        }
      }
    }

    // If the number of intersections is odd, the point is inside the polygon
    return intersectCount % 2 === 1;
  }

}

window.Polygon = Polygon;