/* eslint-disable no-undef */

const {createScene,  createGuide} = window.wgl;
const {PointCollection} = window;

// Render half a million circles in the width x height region
let count = 500000;
let width = 1000;
let height = 1000;

let scene = createScene(document.querySelector('canvas'), { });
createGuide(scene, {showGrid: true});
let pointCollection = new PointCollection(scene.getGL());

for (let i = 0; i < count; i++) {
  let x = (Math.random() - 0.5) * width;
  let y = (Math.random() - 0.5) * height;

  pointCollection.add({
    position: [x, y, 0 * 4],
    size: Math.random(),
    color: getColor(x, y)
  });
}

scene.appendChild(pointCollection)


function getColor(x, y) {
  let r = 0;
  let g = Math.round(100 * (x + width / 2) / width) + 155;
  let b = Math.round(100 * (y + height / 2) / height) + 155;
  return (r << 24) | (g << 16) | (b << 8) | 0xff
}