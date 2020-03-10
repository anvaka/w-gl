/**
 * Please ignore this. I'm still learning quaternions, and matrices and stuff.
 */
const {createScene, WireCollection, createGameCamera} = window.wgl;
const {mat4, quat, vec3} = glMatrix;

let scene = createScene(document.querySelector('canvas'), {
  camera: createSpaceMapCamera
});


//let someShape = drawSomeShape(new wgl.WireCollection(22, {width:2, is3D: true, allowColors: true}))
let someShape = drawCube(new wgl.WireCollection(22, {width:2, is3D: true, allowColors: true}));
//let someShape = createCameraImage();
scene.appendChild(someShape);


// and lets bring it into the view:
scene.setViewBox({
  left: 0,
  top: 10,
  right: 10,
  bottom: 0 
})


function createSpaceMapCamera(scene, drawContext) {
  let rotationSpeed = Math.PI/360;
  let view = drawContext.view;
  let moveSpeed = 0.1;
  let r = 1;
  let mouseX, mouseY, isAltMouseMove;
  let spareVec3 = [0, 0, 0];
  let centerPoint = mat4.create();
  let centerPointPosition = mat4.getTranslation([], centerPoint);
  let centerRotation = mat4.getRotation([], centerPoint);
  let sphere = new WireCollection(22, {width: 4, is3D: true, allowColors: true});

  let toUI = sphere.add({
    from: {x: 0, y: 0, z: 0, color: 0xffffffff},
    to: {x: 0, y: 0, z: 0, color: 0xffffffff}
  })
  let fromUI = sphere.add({
    from: {x: 0, y: 0, z: 0, color: 0xff00ffff},
    to: {x: 0, y: 0, z: 0, color: 0xfff00fff}
  })
  let crossUI = sphere.add({
    from: {x: 0, y: 0, z: 0, color: 0xffff00ff},
    to: {x: 0, y: 0, z: 0, color: 0xffff00ff}
  })
  scene.appendChild(sphere)

  let frameRotation = [0, 0, 0, 1];
  let frameCenterTransition = [0, 0, 0];

  let cameraPosition = view.position;

  document.addEventListener('keydown', (e) => onKey(e, true));
  document.addEventListener('keyup', (e) => onKey(e, false));
  document.addEventListener('wheel', handleWheel, {passive: false});
  document.addEventListener('mousedown', handleMouseDown, {passive: false});
  requestAnimationFrame(frame);
  redraw();

  return {
    dispose: Function.prototype,
    setViewBox: Function.prototype,
  };

  function handleMouseDown(e) {
    let isLeftButton =
      (e.button === 1 && window.event !== null) || e.button === 0;
    if (!isLeftButton) return;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);


    mouseX = e.clientX;
    mouseY = e.clientY;
    isAltMouseMove = e.altKey;
  }

  function onMouseMove(e) {

    if (isAltMouseMove) {
      let to = toSphere(e.clientX, e.clientY);
      let from = toSphere(mouseX, mouseY);
      mouseX = e.clientX;
      mouseY = e.clientY;
      let currentRotation = quat.rotationTo([], from, to);

      quat.multiply(centerRotation, centerRotation, currentRotation);
    } else {
      let p = getOffsetXY(e.clientX, e.clientY);
      let m = getOffsetXY(mouseX, mouseY);
      let ar = drawContext.width/drawContext.height;
      let dy = (p.y - m.y);
      let dx = ar * (m.x - p.x);
      // todo: change focal point to match mouse cursor

      // the idea behind this formula is that dx and dy range from [0..1]
      // (as a ratio of the screen width or height), now we know the FoV angle, 
      // we want to know how much of the distance we traveled on the frustrum plane.
      // Distance to frustrum is `r`, thus half length of the frustrum plane
      // is `r * tan(fov/2)`, we now extend it to full length by performing `2 * `
      // and take the ratio (dx and dy correspondingly)
      centerPointPosition[0] += 2 * r * dx * Math.tan(drawContext.fov/2);
      centerPointPosition[1] += 2 * r * dy * Math.tan(drawContext.fov/2);
      mouseX = e.clientX;
      mouseY = e.clientY;
    }

    redraw();

    function toSphere(x, y) {
      let px = 2 * x / drawContext.width*drawContext.pixelRatio - 1;
      let py = 1 - 2 * y / drawContext.height*drawContext.pixelRatio;
      let length = Math.hypot(px, py);
      if (length > 1) length = 1;
      let pz = Math.sqrt(1 - length * length);
      return vec3.normalize([], [px, py, pz]);
    }
  }

  function onMouseUp(e) {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  function getOffsetXY(x, y) {
    return {x: x/window.innerWidth, y: y/window.innerHeight};
  }

  function handleWheel(e) {
    let delta = -e.deltaY;
    let sign = Math.sign(delta);
    let speed = 1;

    var deltaAdjustedSpeed = Math.min(0.25, Math.abs(speed * delta / 128));
    r *= 1 - sign * deltaAdjustedSpeed
    redraw();
    e.preventDefault();
  }

  function onKey(e, isDown) {
    // console.log(e.which);
    quat.set(frameRotation, 0, 0, 0, 1);
    vec3.set(frameCenterTransition, 0, 0, 0);
    switch(e.which) {
      case 84: // T 
        frameRotation[0] = isDown * rotationSpeed; break;
      case 71: // G
        frameRotation[0] = -isDown * rotationSpeed; break;
      case 72: // H
        frameRotation[1] = isDown * rotationSpeed; break;
      case 70: // F
        frameRotation[1] = -isDown * rotationSpeed; break;

      case 37: 
        frameCenterTransition[0] = -isDown * moveSpeed; break;
      case 39: 
        frameCenterTransition[0] = isDown * moveSpeed; break;
      case 38: 
        frameCenterTransition[1] = isDown * moveSpeed; break;
      case 40: 
        frameCenterTransition[1] = -isDown * moveSpeed; break;
    }

    quat.normalize(frameRotation, frameRotation);

  }

  function frame() {
    requestAnimationFrame(frame);

    let changed = frameRotation[0] || frameRotation[1] || frameRotation[2] ||
        frameCenterTransition[0] || frameCenterTransition[1] || frameCenterTransition[2];
    if (!changed) return;

    quat.multiply(centerRotation, centerRotation, frameRotation);
    vec3.add(centerPointPosition, centerPointPosition, frameCenterTransition);
    redraw();
  }

  function redraw() {
    // update camera
    vec3.set(cameraPosition, centerPointPosition[0], centerPointPosition[1], centerPointPosition[2]);
    translateOnAxisQuat(cameraPosition, r, [0, 0, 1], centerRotation);
    quat.set(view.rotation, centerRotation[0], centerRotation[1], centerRotation[2], centerRotation[3])
    view.update();

    scene.renderFrame();
  }

  function translateOnAxisQuat(v, distance, axis, quat) {
    let translation = vec3.transformQuat(spareVec3, axis, quat);
    vec3.scaleAndAdd(v, v, translation, distance);
    return v;
  }
}


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

function drawSomeShape(lines) {
  let color = 0xffffffff;
  let count = 100;
  for (let row = 0; row <= count; ++row) {
    lines.add({
      from: {x: 0, y: row, z: 0, color},
      to: {x: count, y: row, z: 0, color}
    });
  }
  for (let col = 0; col <= count; ++col) {
    lines.add({
      from: {x: col, y: 0, z: 0, color},
      to: {x: col, y: count, z: 0, color}
    });
  }
  return lines;
}