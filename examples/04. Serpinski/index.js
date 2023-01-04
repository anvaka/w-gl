/* eslint-disable no-undef */

const {createScene} = window.wgl;
const {PointCollection} = window;

// Render half a million circles in the width x height region

let scene = createScene(document.querySelector('canvas'), { });

let count = 50000;
let width = 100;
let pointCollection = new PointCollection(scene.getGL());
scene.appendChild(pointCollection)
let initialSceneSize = width;
scene.setViewBox({
  left:  -initialSceneSize,
  top:   -initialSceneSize,
  right:  initialSceneSize,
  bottom: initialSceneSize,
});

let currentAngle = 0;
frame();

function frame() {
  requestAnimationFrame(frame);

  pointCollection.program.setCount(0);
  const corners = 3;
  const angle = 2 * Math.PI / corners; 
  const points = []; 

  // Calculate the x and y coordinates of each point on the pentagon
  for (let i = 0; i <corners; i++) {
    const x = width * Math.sin(i * angle);
    const y = width * Math.cos(i * angle);
    points.push([x, y, 0]);
  }
  // const w = width;
  // points.push([0, 0, 0])
  // points.push([0, w, 0])
  // points.push([w, w, 0])
  //points.push([Math.sqrt(2 * w * w) * Math.cos(currentAngle), Math.sqrt(2 * w * w) * Math.sin(currentAngle), 0])
  currentAngle += 0.01
  const polygon = new Polygon(points);
  let currentPoint = polygon.getRandomPointInside();
  for (let i = 0; i < count; ++i) {
    pointCollection.add({
      position: currentPoint,
      size: 0.5,
      color: 0xFFFFFFFF
    });
    currentPoint = polygon.getMiddlePointBetween(currentPoint, polygon.getRandomCorner());
    scene.renderFrame();
  }
}