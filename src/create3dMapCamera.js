import {vec3, mat4} from 'gl-matrix';
import createKineticAnimation from './animation/createKineticAnimation';

export default function createSpaceMapCamera(scene, drawContext) {
  let view = drawContext.view;
  let rotationSpeed = Math.PI * 4;
  let moveSpeed = 0.1;
  let r = 1;
  // angle of rotation around Oz, tracked from Ox to Oy
  let phi = -Math.PI/2;
  let minPhi = -Infinity;
  let maxPhi = Infinity;

  // angle of rotation around Oy
  let theta = 0;
  let minTheta = 0;
  let maxTheta = Math.PI;

  let mouseX, mouseY, isAltMouseMove;
  let centerPointPosition = [0, 0, 0];

  let frameRotation = [0, 0, 0]; // r, theta, phi
  let frameCenterTransition = [0, 0, 0];

  let cameraPosition = view.position;
  let panAnimation = createKineticAnimation(getCenterPosition, setCenterPosition); 
  let rotateAnimation = createKineticAnimation(getCenterRotation, setCenterRotation, {
    minVelocity: 1
  }); 

  document.addEventListener('keydown', handleKeyDown); 
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('wheel', handleWheel, {passive: false});
  document.addEventListener('mousedown', handleMouseDown, {passive: false});

  requestAnimationFrame(frame);
  redraw();

  return {
    dispose,
    setViewBox: Function.prototype,
  };

  function dispose() {
    document.removeEventListener('keydown', handleKeyDown); 
    document.removeEventListener('keyup', handleKeyUp);
    document.removeEventListener('wheel', handleWheel, {passive: false});
    document.removeEventListener('mousedown', handleMouseDown, {passive: false});

    // TODO: Should I be more precise here?
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    rotateAnimation.cancel();
    panAnimation.cancel();
  }

  function handleKeyDown(e) {
    onKey(e, 1);
  }

  function handleKeyUp(e) {
    onKey(e, 0);
  }

  function handleMouseDown(e) {
    let isLeftButton =
      (e.button === 1 && window.event !== null) || e.button === 0;
    if (!isLeftButton) return;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    mouseX = e.clientX;
    mouseY = e.clientY;
    isAltMouseMove = !e.altKey;
    panAnimation.cancel();
    rotateAnimation.cancel();
    if (isAltMouseMove) {
      rotateAnimation.start();
    } else {
      panAnimation.start();
    }
  }

  function onMouseMove(e) {
    let ar = drawContext.width/drawContext.height;
    if (isAltMouseMove) {
      phi += rotationSpeed * (mouseX - e.clientX)/drawContext.width;
      theta += rotationSpeed * (mouseY - e.clientY)/drawContext.height * ar * 0.5;

      theta = clamp(theta, minTheta, maxTheta);
      phi = clamp(phi, minPhi, maxPhi);
    } else {
      let p = getOffsetXY(e.clientX, e.clientY);
      let m = getOffsetXY(mouseX, mouseY);
      let dy = (p.y - m.y);
      let dx = ar * (m.x - p.x);
      // todo: change focal point to match mouse cursor

      // the idea behind this formula is that dx and dy range from [0..1]
      // (as a ratio of the screen width or height), now we know the FoV angle, 
      // we want to know how much of the distance we traveled on the frustrum plane.
      // Distance to frustrum is `r`, thus half length of the frustrum plane
      // is `r * tan(fov/2)`, we now extend it to full length by performing `2 * `
      // and take the ratio (dx and dy correspondingly)
      let x = 2 * r * dx * Math.tan(drawContext.fov/2);
      let y = 2 * r * dy * Math.tan(drawContext.fov/2);
      moveCenterBy(-x, -y);
    }
    mouseX = e.clientX;
    mouseY = e.clientY;

    redraw();
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (isAltMouseMove) {
      rotateAnimation.stop();
    } else {
      panAnimation.stop();
    }
  }

  function getOffsetXY(x, y) {
    return {x: x/window.innerWidth, y: y/window.innerHeight};
  }

  function handleWheel(e) {
    zoomCenterBy(-e.deltaY);

    redraw();
    e.preventDefault();
  }

  function onKey(e, isDown) {
    if (isModifierKey(e)) return;
    let positionAnimation = false;
    let rotationAnimation = false;

    switch(e.which) {
      case 81: // q - roll right
        frameRotation[2] = isDown;
        rotationAnimation = true;
        break;
      case 69: // e - roll left
        frameRotation[2] = -isDown; 
        rotationAnimation = true;
        break;
      case 71: // g - pitch
        frameRotation[1] = isDown; 
        rotationAnimation = true;
        break;
      case 84: // t - pitch
        frameRotation[1] = -isDown;
        rotationAnimation = true;
        break;
      case 187: // = - zoom in
        frameRotation[0] = isDown;
        rotationAnimation = true;
        break;
      case 189: // - - zoom in
        frameRotation[0] = -isDown; 
        rotationAnimation = true;
        break;
      case 82: // r - center up
        frameCenterTransition[2] = isDown;
        positionAnimation = true;
        break;
      case 70: // f - center down
        frameCenterTransition[2] = -isDown;
        positionAnimation = true;
        break;
      case 37: // ← 
      case 65: // a
        frameCenterTransition[0] = isDown;
        positionAnimation = true;
        break;
      case 39: // → 
      case 68: // d
        frameCenterTransition[0] = -isDown; 
        positionAnimation = true;
        break;
      case 38: // ↑ 
      case 87: // w 
        if (isDown) {
          frameCenterTransition[1] = frameCenterTransition[1] === 0 ? -0.8 : 
            Math.max(frameCenterTransition[1] * 1.1, -1);
        } else frameCenterTransition[1] = 0;

        positionAnimation = true;
        break;
      case 40: // ↓ 
      case 83: // d
        if (isDown) {
          frameCenterTransition[1] = frameCenterTransition[1] === 0 ? 0.8 : 
            Math.min(frameCenterTransition[1] * 1.1, 1);
        } else frameCenterTransition[1] = 0;
        positionAnimation = true;
        break;
    }

    if (positionAnimation) {
      if (isDown) {
        panAnimation.setAmplitude(0.025/8);
        panAnimation.start();
      } else if (frameCenterTransition[0] == frameCenterTransition[1] &&
        frameCenterTransition[1] === 0) {
        panAnimation.stop();
        panAnimation.setAmplitude(0.025);
      }
    }
    if (rotationAnimation) {
      if (isDown) {
        rotateAnimation.setAmplitude(0.025/8);
        rotateAnimation.start();
      } else if (frameRotation[0] == frameRotation[1] &&
        frameRotation[1] === frameRotation[2] &&
        frameRotation[2] === 0
      ) {
        rotateAnimation.stop();
        rotateAnimation.setAmplitude(0.025);
      }
    }
  }

  function frame() {
    requestAnimationFrame(frame);

    let changed = frameRotation[0] || frameRotation[1] || frameRotation[2] ||
        frameCenterTransition[0] || frameCenterTransition[1] || frameCenterTransition[2];
    if (!changed) return;

    let factor = 0.1 * r * moveSpeed;
    moveCenterBy(factor * frameCenterTransition[0], factor * frameCenterTransition[1]);
    if (frameCenterTransition[2]) {
      centerPointPosition[2] += factor * frameCenterTransition[2];
    }

    phi += frameRotation[2] * Math.PI/180;
    phi = clamp(phi, minPhi, maxPhi);

    if (frameRotation[0]) {
      zoomCenterBy(frameRotation[0])
    }
    theta += frameRotation[1] * Math.PI/180;
    theta = clamp(theta, minTheta, maxTheta);

    redraw();
  }

  function moveCenterBy(dx, dy) {
    let cPhi = Math.cos(phi);
    let sPhi = Math.sin(phi);
    centerPointPosition[0] += cPhi * dy + sPhi * dx;
    centerPointPosition[1] += sPhi * dy - cPhi * dx;
  }

  function getCenterPosition() {
    return {
      x: centerPointPosition[0],
      y: centerPointPosition[1],
      z: centerPointPosition[2]
    }
  }

  function getCenterRotation() {
    return {
      x: phi,
      y: theta,
      z: r
    }
  }

  function setCenterRotation(new_phi, new_theta) {
    phi = new_phi;
    theta = new_theta;

    theta = clamp(theta, minTheta, maxTheta);
    phi = clamp(phi, minPhi, maxPhi);
    redraw();
  }

  function setCenterPosition(x, y, z) {
    vec3.set(centerPointPosition, x, y, z);
    redraw();
  }

  function zoomCenterBy(delta) {
    let sign = Math.sign(delta);

    var deltaAdjustedSpeed = Math.min(0.25, Math.abs(delta / 128));
    r *= 1 - sign * deltaAdjustedSpeed
  }

  function redraw() {
    // update camera
    let p = getSpherical(r, theta, phi);

    let r1 = Math.hypot(r, 1);
    let theta1 = theta - Math.acos(r/r1);
    let p1 = getSpherical(r1, theta1, phi);

    vec3.sub(p1, p1, p);

    vec3.set(cameraPosition, p[0], p[1], p[2]);
    vec3.add(cameraPosition, cameraPosition, centerPointPosition);
    mat4.targetTo(view.matrix, cameraPosition, centerPointPosition, p1);
    mat4.getRotation(view.rotation, view.matrix);
    view.update();

    scene.renderFrame();
  }
}

function getSpherical(r, theta, phi) {
  let z = r * Math.cos(theta);
  let x = r * Math.sin(theta) * Math.cos(phi);
  let y = r * Math.sin(theta) * Math.sin(phi);
  return [x, y, z];
}

function clamp(v, min, max) {
  if (v < min) v = min;
  if (v > max) v = max;
  return v;
}

function isModifierKey(e) {
  return e.altKey || e.ctrlKey || e.metaKey;
}