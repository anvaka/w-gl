import {vec3, quat, mat4} from 'gl-matrix';
import {DrawContext, WglScene} from './createScene';
import getInputTarget from './input/getInputTarget';
import {option, clamp, clampTo, getSpherical} from './cameraUtils';

/**
 * Game camera is similar to the first player games, where user can "walk" insider
 * the world and look around.
 */
export default function createGameCamera(scene: WglScene, drawContext: DrawContext) {
  // Very likely spaceMap camera can be adjusted to support this navigation model too, but
  // for now, I'm using a separate camera. Should consider uniting them in the future if possible.

  let {view} = scene.getDrawContext();

  // Player in the world is placed where the camera is:
  let cameraPosition = view.position;

  // And they look at the "center" of the scene:
  let centerPosition = view.center;

  // The camera itself is modeled via spherical coordinates, where player is at the center
  // of the sphere, and looks at the point on the sphere (inverse model of space-map camera)

  let sceneOptions = scene.getOptions() || {};
  // Pay attention: These are not the same as in the space map:
  // angle of rotation around Z axis, tracked from axis X to axis Y
  let minPhi = option(sceneOptions.minPhi, -Infinity);
  let maxPhi = option(sceneOptions.maxPhi, Infinity);
  // Rotate the camera so it looks on Y axis
  let phi = clamp(0, minPhi, maxPhi);

  // camera inclination angle. (Angle above Oxy plane)
  let minTheta = option(sceneOptions.minTheta, 0);
  let maxTheta = option(sceneOptions.maxTheta, Math.PI);
  // PI/2 so that we are in XY plane
  let theta = clamp(Math.PI/2, minTheta, maxTheta);

  let rotationSpeed = Math.PI * 2;
  let inclinationSpeed = Math.PI * 1.618;
  // Distance to the point at which our camera is looking
  let minR = option(sceneOptions.minZoom, -Infinity);
  let maxR = option(sceneOptions.maxZoom, Infinity);
  let r = clamp(1, minR, maxR);

  const inputTarget = getInputTarget(sceneOptions.inputTarget, drawContext.canvas);
  inputTarget.style.outline = 'none';
  if (!inputTarget.getAttribute('tabindex')) {
    inputTarget.setAttribute('tabindex', '0');
  }
  inputTarget.addEventListener('keydown', handleKeyDown);
  inputTarget.addEventListener('keyup', handleKeyUp);
  inputTarget.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('pointerlockchange', onPointerLockChange, false);

  let frameHandle = 0;
  let vx = 0, vy = 0, vz = 0; // velocity of the panning
  let dx = 0, dy = 0, dz = 0; // actual offset of the panning
  let dPhi = 0, vPhi = 0; // rotation 
  let dIncline = 0, vIncline = 0; // inclination
  let moveSpeed = 0.01; // TODO: Might wanna make this computed based on distance to surface


  const api = {
    dispose,
    setViewBox,
    setRotationSpeed,
    getRotationSpeed,
    setMoveSpeed,
    getMoveSpeed,
    getRadius: () => 1,
    setSpeed(factor) {
      moveSpeed = factor;
    }
  };
  updateMatrix();
  return api;

  function handleKeyDown(e: KeyboardEvent) {
    onKey(e, 1);
  }

  function handleKeyUp(e: KeyboardEvent) {
    onKey(e, 0);
  }

  function handleMouseDown(e){
    if (document.pointerLockElement) {
      document.exitPointerLock();
    } else{
      inputTarget.requestPointerLock();
    }
  }

  function onPointerLockChange(e) {
    console.log('pointer change', document.pointerLockElement)
    if (document.pointerLockElement) {
      document.addEventListener("mousemove", handleMousePositionChange, false);
    } else {
      document.removeEventListener("mousemove", handleMousePositionChange, false);
      dPhi = 0;
      dIncline = 0;
    }
  }

  function handleMousePositionChange(e) {
    // dPhi = 0;
    // vPhi = Math.sign(clampTo(e.movementX, 1, 0));
    // vIncline = -Math.sign(clampTo(e.movementY, 1, 0))*0.3;

    let ar = drawContext.width / drawContext.height;

    let dx = e.movementX;
    let dy = -e.movementY;
    phi -= (rotationSpeed * dx) / drawContext.width;
    theta -= ((inclinationSpeed * dy) / drawContext.height);// * ar;

    // console.log('phi:' +dPhi + '; incline: ' + dIncline + '; mx: ' + e.movementX + '; my: ' + e.movementY)
    updateMatrix();
  }

  function onKey(e: KeyboardEvent, isDown: number) {
    if (isModifierKey(e)) return;

    // TODO: implement plane move on the z up/down?
    switch (e.which) {
      case 87: // w
        vy = isDown;
        break;
      case 65: // a
        vx = isDown;
        break;
      case 68: // d
        vx = -isDown;
        break;
      case 83: // s
        vy = -isDown;
        break;
      case 37: // ←
        vPhi = -isDown;
        break;
      case 39: // →
        vPhi = +isDown;
        break;
      case 38: // ↑
        vIncline = isDown;
        break;
      case 40: // ↓
        vIncline = -isDown;
        break
    }
    processNextInput();
  }

  function processNextInput() {
    if (frameHandle) return; // already scheduled
    frameHandle = requestAnimationFrame(frame);
  }

  function setViewBox(rect) {
    // const dpr = scene.getPixelRatio();
    // const nearHeight = dpr * Math.max((rect.top - rect.bottom)/2, (rect.right - rect.left) / 2);
    // const {position, rotation} = drawContext.view;
    // position[0] = (rect.left + rect.right)/2;
    // position[1] = (rect.top + rect.bottom)/2;
    // position[2] = nearHeight / Math.tan(drawContext.fov / 2);
    // quat.set(rotation, 0, 0, 0, 1);

    // drawContext.view.update();
  }

  function frame() {
    frameHandle = 0;
    let dampFactor = 0.9;
    let needRedraw = false;

    dx = clampTo(dx * dampFactor + vx, 0.5, 0);
    dy = clampTo(dy * dampFactor + vy, 0.5, 0);
    dz = clampTo(dz * dampFactor + vz, 0.5, 0);
    dPhi = clampTo((dPhi * dampFactor + vPhi/2), Math.PI/360, 0);
    if (dPhi){
      phi -= 3*(Math.PI * 2 * dPhi) / drawContext.width;
      phi = clamp(phi, minPhi, maxPhi);
      needRedraw = true;
    }
    dIncline = clampTo((dIncline * dampFactor + vIncline/6), Math.PI/360, 0);
    if (dIncline) {
      let ar = drawContext.width / drawContext.height;
      theta -= ((Math.PI * 1.618 * dIncline) / drawContext.height) * ar;
      theta = clamp(theta, minTheta, maxTheta);
      needRedraw = true;
    }

    if (dx || dy) {
      panByAbsoluteOffset(dx, dy);
      needRedraw = true;
    }

    if (needRedraw) {
      updateMatrix();
      processNextInput();
    }
  }

  function updateMatrix() {
    let lookAtPosition = getSpherical(r, theta, phi);
    vec3.set(
      centerPosition,
      cameraPosition[0] + lookAtPosition[0],
      cameraPosition[1] + lookAtPosition[1],
      cameraPosition[2] + lookAtPosition[2],
    );

    let upVectorSphereRadius = Math.hypot(r, 1);
    //let upVectorTheta = theta - Math.acos(r / upVectorSphereRadius);
    let upVectorTheta = (theta - Math.PI/2);
    //if(upVectorTheta < 0) upVectorTheta += Math.PI;
    //theta - Math.PI/2
    let upVector0 = getSpherical(1, upVectorTheta, phi + Math.PI);
    let upVector1 = getSpherical(1, theta, phi);
    let x = getSpherical(1, theta+1e-3, phi);
    vec3.cross(x, x, upVector1);
    vec3.cross(upVector1, x, upVector1);
    //vec3.cross(upVector1, lookAtPosition, upVector1);
    vec3.normalize(upVector1, upVector1);
    //vec3.add(upVector0, upVector0, cameraPosition)
    // console.log('up angle: ' + Math.round(upVectorTheta * 180 / Math.PI) +
    //  ' up vector: ' + printVector(upVector0) +
    //  ' up vector1: ' + printVector(upVector1) +
    //  ' lookat position: ' + printVector(centerPosition)
    // );
    //vec3.normalize(upVector0, upVector0);
    let upVector = upVector1;

    mat4.targetTo(view.matrix, cameraPosition, centerPosition, upVector);
    mat4.getRotation(view.rotation, view.matrix);
    view.update();

    scene.getRoot().scheduleMVPUpdate();
    scene.fire('transform', drawContext);
    scene.renderFrame();
  }

  function panByAbsoluteOffset(dx, dy) {
    moveCenterBy(-dx * moveSpeed, dy * moveSpeed);
  }

  function moveCenterBy(dx: number, dy: number) {
    let cPhi = Math.cos(phi);
    let sPhi = Math.sin(phi);
    cameraPosition[0] += cPhi * dy + sPhi * dx;
    cameraPosition[1] += sPhi * dy - cPhi * dx;
    // cameraPosition[0] += dx;
    // cameraPosition[1] += dy;
  }

  function dispose() {
    cancelAnimationFrame(frameHandle);
    frameHandle = 0;
    inputTarget.removeEventListener('keydown', handleKeyDown);
    inputTarget.removeEventListener('keyup', handleKeyUp);
  }

  function setRotationSpeed(speed) {
    let rotateSpeed = speed
  }

  function getRotationSpeed() {
    return 0; //rotateSpeed;
  }

  function setMoveSpeed(speed) {
    moveSpeed = speed;
  }

  function getMoveSpeed() { 
    return moveSpeed; 
  }
}

function isModifierKey(e) {
  return e.altKey || e.ctrlKey || e.metaKey;
}

function printVector(v) {
  return v.map(x => Math.round(x*100)/100).join(',');
}