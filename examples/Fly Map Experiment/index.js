/**
 * Please ignore this. I'm still learning quaternions, and matrices and stuff, this is
 * my debugging playground.
 */
 const {createScene, WireCollection, createGameCamera, PointCollection, createGuide} = window.wgl;
 const {mat4, quat, vec3} = glMatrix;
 window.xel = document.querySelector('.x');
 window.yel = document.querySelector('.y');
 window.zel = document.querySelector('.z');
 
 let upCollection = new WireCollection(10, { width: 4 });
 window.up = upCollection.add({
   from: {x: 0, y: 0, z: 0, color: 0x0000ffff},
   to: {x: 0, y: 0, z: 1, color: 0x0000ffff},
 });
 upCollection.add({
   from: {x: 0, y: 0, z: 0, color: 0xff0000ff},
   to: {x: 0, y: 1, z: 0, color: 0xff0000ff},
 });
 upCollection.add({
   from: {x: 0, y: 0, z: 0, color: 0x00ff00ff},
   to: {x: 1, y: 0, z: 0, color: 0x00ff00ff},
 })
 
 let near = 1;
 let scene = createScene(document.querySelector('canvas'), {
   controls: wgl.fpsControls,
   near: near,
   lockMouse: true
 });
 // let alpha = scene.getDrawContext().fov;
 function createPoint() {
   let point = [];
   let r = 1;
   let api = {
     point,
     // angle of rotation around Z axis, tracked from axis X to axis Y
     // Z axis looking up.
     // Rotate the camera so it looks on Y axis
     phi: 0,
     // camera inclination angle. (Angle above Oxy plane)
     // PI/2 so that we are in XY plane
     theta: Math.PI / 2,
     updatePoint
   }
   updatePoint();
   return api;
 
   function updatePoint() {
     let {theta, phi} = api;
     point[0] = r * Math.sin(theta) * Math.cos(phi);
     point[1] = r * Math.sin(theta) * Math.sin(phi);
     point[2] = r * Math.cos(theta);
     api;
   }
 }
 
 drawGrid(scene);
 scene.getCameraController().lookAt([0, -10, 5], [0, 0, 0]);
 // createGuide(scene);
 scene.appendChild(upCollection)
 let cubeLines = new wgl.WireCollection(22, {width:2, is3D: true, allowColors: true});
 drawCube(cubeLines, 0, 0, 0, 0xffffffff);
 drawCube(cubeLines, -10, -10, 0, 0xff0000ff);
 drawCube(cubeLines, 10, -10, 0, 0x00ff00ff);
 drawCube(cubeLines, 00, -20, 0, 0x0000ffff);
 scene.appendChild(cubeLines);
 
 let points = new PointCollection(1, {
   is3D: true
 });
 let pointHandle = createPoint();
 let curPoint = pointHandle.point;
 let pointUI = points.add({
   x: curPoint[0],
   y: curPoint[1],
   z: curPoint[2],
   color: 0xffffffff,
   size: 0.2
 })
 let cursorUI = points.add({
   x: curPoint[0],
   y: curPoint[1],
   z: curPoint[2],
   color: 0xffffffff,
   size: 0.2
 })
 let quatUI = points.add({
   x: curPoint[0],
   y: curPoint[1],
   z: curPoint[2],
   color: 0x00ff00ff,
   size: 0.2
 })
 let mouseUI = points.add({
   x: 2,
   y: 2,
   z: 0,
   color: 0xff00ffff,
   size: 0.2
 })
 scene.appendChild(points);
 let dir = 1;
 requestAnimationFrame(frame);
 function frame() {
    pointHandle.phi += 0.01;
    pointHandle.theta += dir * .01;
    if (pointHandle.theta> Math.PI) {
      dir *= -1; 
      pointHandle.theta = Math.PI;
    }
    if (pointHandle.theta < 0) {
      pointHandle.theta = 0 ;
      dir *= -1;
    }
    if (pointHandle.theta > 2* Math.PI) pointHandle.theta = 0;
    pointHandle.updatePoint();
    pointUI.update({ 
      x: curPoint[0],
      y: curPoint[1],
      z: curPoint[2],
      color: 0xffffffff,
      size: 0.2
    });
    let {phi, theta} = pointHandle;
  
    let inclination = quat.setAxisAngle([], vec3.normalize([], [-curPoint[1], curPoint[0], 0]), theta - Math.PI/2)
    let p = [0, -1, 0];
    let originalRotation = [0, 0, Math.sin(phi/2 + Math.PI/4), Math.cos(phi/2 + Math.PI/4)];
    quat.mul(originalRotation, inclination, originalRotation);
    vec3.transformQuat(p, p, originalRotation);
 
    quatUI.update({
      x: p[0],
      y: p[1],
      z: p[2],
      color: 0x00ff00ff,
      size: 0.2
    })
 
   requestAnimationFrame(frame);
   scene.renderFrame();
 }
//  scene.on('transform', e => {
//    let view = e.drawContext.view;
//    let eye = view.position;
  //  let dir = vec3.sub([], view.center, eye);
  //  vec3.normalize(dir, dir);
  //  let angle = Math.acos(vec3.dot(vec3.normalize([], [0, 0, -eye[2]]), dir));
  //  let d = eye[2] / Math.sin(angle);
  //  let p = vec3.transformQuat([], [0, 0, -1], view.orientation);
  //  //let p = vec3.transformMat4([], [0, 0, -1], view.cameraWorld);
  //  cursorUI.update({ 
  //    x: eye[0] + p[0],
  //    y: eye[1] + p[1],
  //    z: eye[2] + p[2],
  //   //  x: p[0],
  //   //  y: p[1],
  //   //  z: p[2],
  //    color: 0xffffffff,
  //    size: 0.2
  //  });
//  })
 document.addEventListener('mousemove', function (e) {
   let pos = scene.getSceneCoordinate(e.clientX, e.clientY);
   mouseUI.update({ 
     x: pos[0],
     y: pos[1],
     z: pos[2],
     color: 0xff00ffff,
     size: 0.2
   });
 
   scene.renderFrame();
 });
 
 //let someShape = createCameraImage();
 
 // and lets bring it into the view:
 // scene.setViewBox({
 //   left: 0,
 //   top: 10,
 //   right: 10,
 //   bottom: 0 
 // })
 
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
 
 function drawCube(lines, cx, cy, cz, color = 0xffffffff) {
   lines.add({
     from: {x: cx + -0.5, y: cy + -0.5, z: cz + -0.5, color},
     to:   {x: cx + -0.5, y: cy +  0.5, z: cz + -0.5, color},
   })
   lines.add({
     from: {x: cx + -0.5, y: cy +  0.5, z: cz + -0.5, color},
     to:   {x: cx +  0.5, y: cy +  0.5, z: cz + -0.5, color},
   })
   lines.add({
     from: {x: cx + 0.5, y: cy +  0.5, z: cz + -0.5, color},
     to:   {x: cx + 0.5, y: cy + -0.5, z: cz + -0.5, color},
   })
   lines.add({
     from: {x: cx +  0.5, y: cy + -0.5, z: cz + -0.5, color},
     to:   {x: cx + -0.5, y: cy + -0.5, z: cz + -0.5, color},
   })
 
   lines.add({
     from: {x: cx + -0.5, y: cy + -0.5, z: cz + 0.5, color},
     to:   {x: cx + -0.5, y: cy +  0.5, z: cz + 0.5, color},
   })
   lines.add({
     from: {x: cx + -0.5, y: cy +  0.5, z: cz + 0.5, color},
     to:   {x: cx +  0.5, y: cy +  0.5, z: cz + 0.5, color},
   })
   lines.add({
     from: {x: cx + 0.5, y: cy +  0.5, z: cz + 0.5, color},
     to:   {x: cx + 0.5, y: cy + -0.5, z: cz + 0.5, color},
   })
   lines.add({
     from: {x: cx +  0.5, y: cy + -0.5, z: cz + 0.5, color},
     to:   {x: cx + -0.5, y: cy + -0.5, z: cz + 0.5, color},
   })
 
   lines.add({
     from: {x: cx + -0.5, y: cy + -0.5, z: cz +  0.5, color},
     to:   {x: cx + -0.5, y: cy + -0.5, z: cz + -0.5, color},
   })
   lines.add({
     from: {x: cx + 0.5, y: cy + 0.5, z: cz +  0.5, color},
     to:   {x: cx + 0.5, y: cy + 0.5, z: cz + -0.5, color},
   })
   lines.add({
     from: {x: cx + -0.5, y: cy + 0.5, z: cz +  0.5, color},
     to:   {x: cx + -0.5, y: cy + 0.5, z: cz + -0.5, color},
   })
 
   lines.add({
     from: {x: cx + 0.5, y: cy + -0.5, z: cz +  0.5, color},
     to:   {x: cx + 0.5, y: cy + -0.5, z: cz + -0.5, color},
   });
 /*
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
   */
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