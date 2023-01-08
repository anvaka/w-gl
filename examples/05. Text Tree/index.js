import {createScene,  createGuide} from '../../build/wgl.module.js';
import MSDFTextCollection from './MSDFTextCollection.js';

let scene = createScene(document.querySelector('canvas'), { });

let count = 50000;
let width = 100;
createGuide(scene, {showGrid: true});
let textCollection = new MSDFTextCollection(scene.getGL());
scene.appendChild(textCollection)

const tree = generateRandomTree(6, 4);
renderSunburst(tree);
// renderGridLabels();
// renderCircularText(60);

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

function renderGridLabels() {
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
    text: 'Depth ' + depth,
    children,
  }
}

function countLeaves(tree, level) {
  let totalLeaves = 0;
  if (tree.children && tree.children.length) {
    tree.children.forEach(child => {
      totalLeaves += countLeaves(child);
    });
  } else {
    totalLeaves = 1
  }
  tree.totalChildrenCount = totalLeaves;
  return totalLeaves;
}

function renderSunburst(tree) {
  const countByLevel = countLeaves(tree);

  textCollection.addText({
    text: tree.text,
    x: 0,
    y: 0,
    cx: 0.5,
    cy: 0.5,
    limit: 2,
  });

  drawChildren(tree.children, 0, 0, 2 * Math.PI, 1);
}

function drawChildren(children, level, startAngle, endAngle, radius) {
  if (!children || !children.length) return;
  const totalChildrenCount = children.reduce((acc, child) => acc + child.totalChildrenCount, 0);
  let currentAngle = startAngle;
  children.forEach(child => {
    const childAngle = (child.totalChildrenCount / totalChildrenCount) * (endAngle - startAngle);
    const childEndAngle = currentAngle + childAngle;
    textCollection.addText({
      text: child.text,
      x: Math.cos((currentAngle + childEndAngle) / 2) * radius,
      y: Math.sin((currentAngle + childEndAngle) / 2) * radius,
      cx: 0,
      cy: 0,
      angle: (currentAngle + childEndAngle) / 2,
      limit: 1/(level * 0.9),
    });
    drawChildren(child.children, level + 1, currentAngle, childEndAngle, radius + 1);
    currentAngle = childEndAngle;
  });
}