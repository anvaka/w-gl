/**
 * Please ignore this. I'm still learning quaternions, and matrices and stuff.
 */
const {createScene, WireCollection, createGameCamera, createSpaceMapCamera, PointCollection} = window.wgl;
const {mat4, quat, vec3} = glMatrix;

let upCollection = new WireCollection(10, { width: 4 });
window.up = upCollection.add({
  from: {x: 0, y: 0, z: 0, color: 0xff0000ff},
  to: {x: 0, y: 1, z: 0, color: 0xff00ffff},
})
let scene = createScene(document.querySelector('canvas'), {});
// drawGraph(scene);


drawGrid(scene)
// scene.appendChild(upCollection)
let someShape1 = drawCube(new wgl.WireCollection(22, {width:2, is3D: true, allowColors: true}));
scene.appendChild(someShape1);
//let someShape = createCameraImage();

// and lets bring it into the view:
scene.setViewBox({
  left: 0,
  top: 10,
  right: 10,
  bottom: 0 
})

function createCameraImage() {
  let cameraImage = new WireCollection(100, {width:4, is3D: true, allowColors: true});
  let color = 0xffffffff;
  let size = 0.25;
  let length = 1.5;
  cameraImage.add({
    from: {x: -size, y: -size, z: 0, color},
    to:   {x: -size, y:  size, z: 0, color}
  });
  cameraImage.add({
    from: {x: -size, y:  size, z: 0, color},
    to:   {x:  size, y:  size, z: 0, color}
  });
  cameraImage.add({
    from: {x:  size, y:  size, z: 0, color},
    to:   {x:  size, y: -size, z: 0, color}
  });
  cameraImage.add({
    from: {x:  size, y: -size, z: 0, color},
    to:   {x: -size, y: -size, z: 0, color}
  });


  cameraImage.add({
    from: {x:  0, y: 0, z: length, color},
    to:   {x: -size, y: -size, z: 0, color}
  });
  cameraImage.add({
    from: {x:  0, y: 0, z: length, color},
    to:   {x: -size, y: size, z: 0, color}
  });
  cameraImage.add({
    from: {x:  0, y: 0, z: length, color},
    to:   {x: size, y: -size, z: 0, color}
  });
  cameraImage.add({
    from: {x:  0, y: 0, z: length, color},
    to:   {x: size, y: size, z: 0, color}
  });
  return cameraImage;
}

function createReferencePoint() {
  let lines = new WireCollection(100, {width:4, is3D: true, allowColors: true});

  let up = 0xff0000ff;
  lines.add({
    from: {x: 0, y: 0, z: 0, color: up},
    to:   {x: 0, y: 1.5, z: 0, color: up},
  });
  let right = 0x00ff00ff;
  lines.add({
    from: {x: 0, y: 0, z: 0, color: right},
    to:   {x: 1.5, y: 0, z: 0, color: right},
  });
  let forward = 0x0000ffff;
  lines.add({
    from: {x: 0, y: 0, z: 0, color: forward},
    to:   {x: 0, y: 0, z: 1.5, color: forward},
  });
  return lines;
}

function drawCube(lines) {
  let color = 0xffffffff;
  lines.add({
    from: {x: -0.5, y: -0.5, z: -0.5, color},
    to:   {x: -0.5, y:  0.5, z: -0.5, color},
  })
  lines.add({
    from: {x: -0.5, y:  0.5, z: -0.5, color},
    to:   {x:  0.5, y:  0.5, z: -0.5, color},
  })
  lines.add({
    from: {x:  0.5, y:  0.5, z: -0.5, color},
    to:   {x:  0.5, y: -0.5, z: -0.5, color},
  })
  lines.add({
    from: {x:  0.5, y: -0.5, z: -0.5, color},
    to:   {x: -0.5, y: -0.5, z: -0.5, color},
  })

  lines.add({
    from: {x: -0.5, y: -0.5, z: 0.5, color},
    to:   {x: -0.5, y:  0.5, z: 0.5, color},
  })
  lines.add({
    from: {x: -0.5, y:  0.5, z: 0.5, color},
    to:   {x:  0.5, y:  0.5, z: 0.5, color},
  })
  lines.add({
    from: {x:  0.5, y:  0.5, z: 0.5, color},
    to:   {x:  0.5, y: -0.5, z: 0.5, color},
  })
  lines.add({
    from: {x:  0.5, y: -0.5, z: 0.5, color},
    to:   {x: -0.5, y: -0.5, z: 0.5, color},
  })

  lines.add({
    from: {x: -0.5, y: -0.5, z:  0.5, color},
    to:   {x: -0.5, y: -0.5, z: -0.5, color},
  })
  lines.add({
    from: {x: 0.5, y: 0.5, z:  0.5, color},
    to:   {x: 0.5, y: 0.5, z: -0.5, color},
  })
  lines.add({
    from: {x: -0.5, y: 0.5, z:  0.5, color},
    to:   {x: -0.5, y: 0.5, z: -0.5, color},
  })

  lines.add({
    from: {x: 0.5, y: -0.5, z:  0.5, color},
    to:   {x: 0.5, y: -0.5, z: -0.5, color},
  });

  let last = {x: 0.5, y: -0.5, z:  0, color};
  let n = [1, 0.4, 0]
  for (let i = 0; i < 10; ++i) {
    let other = {
      x: last.x + n[0] * (Math.random()),
      y: last.y + n[1] * (Math.random()),
      z: last.z + n[2] * (Math.random()),
      color
    }
    lines.add({ from: last, to:   other });
    last = other;
  }
  last = {x: -0.5, y: -0.5, z:  0, color};
  n = [-1, 0.4, 0]
  for (let i = 0; i < 10; ++i) {
    let other = {
      x: last.x + n[0] * (Math.random()),
      y: last.y + n[1] * (Math.random()),
      z: last.z + n[2] * (Math.random()),
      color
    }
    lines.add({ from: last, to:   other });
    last = other;
  }
  return lines
}

function drawGrid(scene) {
  let count = 100;
  appendGrid(scene, -count, count, 1, 1.5, 0x113333ff);
  appendGrid(scene, -count, count, 5, 3, 0x226666ff);
  appendGrid(scene, -count, count, 10, 4, 0x229999ff);
}

function appendGrid(scene, from, to, step, width, color) {
  let count = Math.ceil(2 * Math.abs(to - from) / step);

  let lines = new wgl.WireCollection(count, {width, is3D: true, allowColors: true})
  for (let row = from; row <= to; row += step) {
    lines.add({
      from: {x: from, y: row, z: 0, color},
      to: {x: to, y: row, z: 0, color}
    });
  }
  for (let col = from; col <= to; col += step) {
    lines.add({
      from: {x: col, y: from, z: 0, color},
      to: {x: col, y: to, z: 0, color}
    });
  }

  scene.appendChild(lines);
}

function drawGraph(scene) {
  let graph = window.layout()
  let points = new PointCollection(graph.getNodesCount(), {
    is3D: true
  });
  graph.forEachNode(node => {
    points.add({
      x: node.data.x,
      y: node.data.y,
      z: node.data.z,
      size: 30
    })
  });
  scene.appendChild(points);
  let links = new WireCollection(graph.getLinksCount(), {
    is3D: true
  });
  graph.forEachLink(link => {
    let from = graph.getNode(link.fromId);
    let to = graph.getNode(link.toId);
    links.add({
      from: {...from.data, color: 0xffffffff},
      to: {...to.data, color: 0xffffffff}
    })
  })
  scene.appendChild(links);
}