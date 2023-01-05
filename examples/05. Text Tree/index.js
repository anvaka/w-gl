import {createScene,  createGuide} from '../../build/wgl.module.js';
import MSDFTextCollection from './MSDFTextCollection.js';

let scene = createScene(document.querySelector('canvas'), { });

let count = 50000;
let width = 100;
createGuide(scene, {showGrid: true});
let textCollection = new MSDFTextCollection(scene.getGL());
scene.appendChild(textCollection)

for (let x = -5; x < 5; ++x) {
for (let y = -5; y < 5; ++y) {
  textCollection.addText({
    text: x + ',' + y,
    x, // Math.sin(currentAngle) * 1,
    y, // Math.cos(currentAngle) * 1,
    cy: 0,
    cx: 0,
    limit: 0.25,
    angle: 0
  });
}

}

const tree = generateRandomTree(3, 4);
//  {
//   text: 'Parent',
//   children: [
//     { text: 'Child 1', children: [{text: 'Grandchild'}] },
//     { text: 'Child 2', children: [{text: 'Grandchild 1'}, {text: 'Grandchild 2'}] },
//     { text: 'Child 3', children: [{text: 'Grandchild'}] },
//   ]
// }

renderCircularText(60);

function renderCircularText(count) {
  let angleAdvance = 2 * Math.PI / count;
  let currentAngle = 0;
  for (let i = 0; i < count; i++) {
    textCollection.addText({
      text: 'Hello ' + Math.round(currentAngle * 180 / Math.PI),
      x: Math.cos(currentAngle) * 4,
      y: Math.sin(currentAngle) * 4,
      // cy: 0.5,
      // cx: 0.5,
      limit: 1,
      angle: currentAngle
    });
    currentAngle += angleAdvance;
  }
}


function generateRandomTree(depth, branchingFactor) {
  if (depth === 0) return null;
  const children = [];
  const maxChildren = branchingFactor;// Math.floor(Math.random() * branchingFactor);
  for (let i = 0; i < maxChildren; i++) {
    const child = generateRandomTree(depth - 1, branchingFactor);
    child && children.push(child);
  }
  return {
    text: 'Parent',
    children,
  }
}
