import {vec3, mat4} from 'gl-matrix';
import createKineticAnimation from './animation/createKineticAnimation';

export default function createSpaceMapCamera(scene, drawContext) {
  let view = drawContext.view;
  let rotationSpeed = Math.PI * 2;
  let moveSpeed = 0.1;
  let r = 1;
  // angle of rotation around Y axis, tracked from axis X to axis Z
  let phi = -Math.PI/2; // Rotate the camera so it looks to the central point in Oxy plane from distance r.
  let minPhi = -Infinity;
  let maxPhi = Infinity;
  let planeNormal = [0, 0, 1];

  // camera inclination angle. (Angle above Oxz plane)
  let theta = 0;
  let minTheta = 0;
  let maxTheta = Math.PI;

  let mouseX, mouseY, isAltMouseMove;
  let centerPointPosition = drawContext.center;// [0, 0, 0];

  let frameRotation = [0, 0, 0]; // r, theta, phi
  let frameCenterTransition = [0, 0, 0];

  let cameraPosition = view.position;
  let panAnimation = createKineticAnimation(getCenterPosition, setCenterPosition); 
  let panAmplitude = panAnimation.getAmplitude();

  let rotateAnimation = createKineticAnimation(getCenterRotation, setCenterRotation, {
    minVelocity: 1
  }); 
  let rotationAmplitude = rotationAmplitude.getAmplitude();

  document.addEventListener('keydown', handleKeyDown); 
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('wheel', handleWheel, {passive: false});
  document.addEventListener('mousedown', handleMouseDown, {passive: false});

  requestAnimationFrame(frame);
  redraw();

  return {
    dispose,
    setViewBox,
  };

  function setViewBox() {
    cameraPosition = view.position;
    r = Math.hypot(cameraPosition[2]);
    centerPointPosition = [cameraPosition[0], cameraPosition[1], 0]
    theta = 0;
    phi = -Math.PI/2;
  }

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
    isAltMouseMove = e.altKey;
    panAnimation.cancel();
    rotateAnimation.cancel();
    if (isAltMouseMove) {
      rotateAnimation.start();
    } else {
      panAnimation.start();
    }
  }

  function getZoomPlaneIntersection(clientX, clientY) {
    let viewPoint = scene.getSceneCoordinate(clientX, clientY);
    let ray = vec3.sub([], [viewPoint.x, viewPoint.y, viewPoint.z], cameraPosition);
    vec3.normalize(ray, ray);

    let denom = vec3.dot(planeNormal, ray);
    if (Math.abs(denom) > 1e-7) {
      let t = vec3.dot(vec3.sub([], centerPointPosition, cameraPosition), planeNormal)/denom;
      let isect = vec3.scaleAndAdd([], cameraPosition, ray, t);
      return isect;
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
    let p = getZoomPlaneIntersection(e.clientX, e.clientY)
    zoomCenterBy(-e.deltaY, p[0] - centerPointPosition[0], p[1] - centerPointPosition[1]);

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
        panAnimation.setAmplitude(panAmplitude);
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
    theta = clamp(new_theta, minTheta, maxTheta);
    phi = clamp(new_phi, minPhi, maxPhi);
    redraw();
  }

  function setCenterPosition(x, y, z) {
    vec3.set(centerPointPosition, x, y, z);
    redraw();
  }

  function zoomCenterBy(delta, dx = 0, dy = 0) {
    // delta usually a small number 0.01 or -0.01
    let scaleFactor = Math.sign(delta) * Math.min(0.25, Math.abs(delta / 128));
    // Which means we either shrink the radius by multiplying it by something < 1
    // or increase it by multiplying by something > 1.
    r *= 1 - scaleFactor;
    // Now let's also move the center closer to the scrolling origin, this gives
    // better UX, similar to the one seen in maps: Map zooms into point under
    // mouse cursor.

    // How much should we move the center point?
    // (dx, dy) is current distance from the scroll point to the center. We should
    // keep it the same after we scaled! 
    // dXScaled = dx * (1 - scaleFactor); // this is going to be the distance after we scaled.
    // newOffsetX = dx - dXScaled; // Thus we move the center by this amount. Which is the same as:
    // newOffsetX = dx - dx * (1 - scaleFactor) == dx * (1 - 1 + scaleFactor) == dx * scaleFactor;
    // Thus the formula below:
    centerPointPosition[0] += dx * scaleFactor;
    centerPointPosition[1] += dy * scaleFactor;
  }

  function redraw() {
    let newCameraPosition = getSpherical(r, theta, phi);

    // now we want to know what is an up vector? The idea is that its position
    // can also be represented in spherical coordinates of a sphere with slightly larger
    // radius. How much larger? 
    // Just assume `up` vector length is 1, then the sphere  radius is sqrt(r * r + 1 * 1):
    let upVectorSphereRadius = Math.hypot(r, 1); // Note: may run into precision error here. 

    // We know a hypotenuse of the new triangle and its size. The angle would be 
    // `Math.acos(r/upVectorSphereRadius)`, and since we don't care whether up is above or below
    // the actual `theta`, we pick one direction and stick to it:
    let upVectorTheta = theta - Math.acos(r/upVectorSphereRadius);
    // The rotation angle around z axis (phi) is the same as the camera position.
    let upVector = getSpherical(upVectorSphereRadius, upVectorTheta, phi);

    // Finally we know both start of the upVector, and the end of the up vector, let's find the direction:
    vec3.sub(upVector, upVector, newCameraPosition);

    vec3.set(cameraPosition, newCameraPosition[0], newCameraPosition[1], newCameraPosition[2]);
    vec3.add(cameraPosition, cameraPosition, centerPointPosition);

    // I'd assume this could be simplified? I just don't know and haven't thought yet how:
    mat4.targetTo(view.matrix, cameraPosition, centerPointPosition, upVector);
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

function _(v) {
  return v.map(x => Math.round(x * 1000) / 1000).join(', ')
}