import {vec3, mat4} from 'gl-matrix';
import {WglScene} from './createScene';
import getInputTarget from './input/getInputTarget';
import {option, clamp, clampTo, getSpherical} from './cameraUtils';
import TransformEvent from './TransformEvent';
import eventify from 'ngraph.events';

/**
 * Game camera is similar to the first player games, where user can "walk" insider
 * the world and look around.
 */
export default function createGameCamera(scene: WglScene) {
  // Very likely spaceMap camera can be adjusted to support this navigation model too, but
  // for now, I'm using a separate camera. Should consider uniting them in the future if possible.
  const drawContext = scene.getDrawContext();
  let {view} = drawContext;

  // Player in the world is placed where the camera is:
  let cameraPosition = view.position;

  // And they look at the "center" of the scene:
  let centerPosition = view.center;

  // The camera itself is modeled via spherical coordinates, where player is at the center
  // of the sphere, and looks at the point on the sphere (inverse model of space-map camera)

  let sceneOptions = scene.getOptions() || {};
  // Pay attention: These are not the same as in the space map:
  // angle of rotation around Z axis, tracked from axis X to axis Y
  // Z axis looking up.
  let minPhi = option(sceneOptions.minPhi, -Infinity);
  let maxPhi = option(sceneOptions.maxPhi, Infinity);
  // Rotate the camera so it looks on Y axis
  let phi = clamp(0, minPhi, maxPhi);

  // camera inclination angle. (Angle above Oxy plane)
  let minTheta = option(sceneOptions.minTheta, 0);
  let maxTheta = option(sceneOptions.maxTheta, Math.PI);
  // PI/2 so that we are in XY plane
  let theta = clamp(Math.PI/2, minTheta, maxTheta);

  let rotationSpeed = Math.PI;
  let inclinationSpeed = Math.PI * 1.618;
  // Distance to the point at which our camera is looking
  let minR = option(sceneOptions.minZoom, -Infinity);
  let maxR = option(sceneOptions.maxZoom, Infinity);
  let r = clamp(1, minR, maxR);

  let lockMouse = option(sceneOptions.lockMouse, false); // whether rotation is done via locked mouse
  let mouseX: number, mouseY: number;

  const inputTarget = getInputTarget(sceneOptions.inputTarget, drawContext.canvas);
  inputTarget.style.outline = 'none';
  if (!inputTarget.getAttribute('tabindex')) {
    inputTarget.setAttribute('tabindex', '0');
  }
  inputTarget.addEventListener('keydown', handleKeyDown);
  inputTarget.addEventListener('keyup', handleKeyUp);
  inputTarget.addEventListener('mousedown', handleMouseDown);

  document.addEventListener('pointerlockchange', onPointerLockChange, false);

  let transformEvent = new TransformEvent(scene); 
  let frameHandle = 0;
  let vx = 0, vy = 0, vz = 0; // velocity of the panning
  let dx = 0, dy = 0, dz = 0; // actual offset of the panning
  let dPhi = 0, vPhi = 0; // rotation 
  let dIncline = 0, vIncline = 0; // inclination
  let moveState = {
    dx, dy, dz, dPhi, dIncline
  };
  let moveSpeed = 0.01; // TODO: Might wanna make this computed based on distance to surface
  let flySpeed = 1e-2;

  const api = {
    MOVE_FORWARD:  1,
    MOVE_BACKWARD: 2,
    MOVE_LEFT:  3,
    MOVE_RIGHT: 4,
    MOVE_UP:    5,
    MOVE_DOWN:  6,
    TURN_LEFT:  7,
    TURN_RIGHT: 8,
    TURN_UP:    9,
    TURN_DOWN:  10,

    dispose,
    handleCommand,
    setViewBox,
    getUpVector,
    lookAt,
    setMouseCapture(isLocked: boolean) { lockMouse = isLocked; return api; },
    setRotationSpeed(speed: number) { rotationSpeed = speed; return api; },
    setMoveSpeed(speed: number) { moveSpeed = speed; return api; },
    setFlySpeed(speed: number) { flySpeed = speed; return api; },
    setSpeed(factor: number) { moveSpeed = factor; flySpeed = factor; return api; },
    getRotationSpeed() { return rotationSpeed; },
    getMoveSpeed() { return moveSpeed; },
    getFlySpeed() { return flySpeed; },
    getKeymap() { return keyMap; },
    getMouseCapture() { return lockMouse; }
  };

  const keyMap = {
    /* W */ 87: api.MOVE_FORWARD,
    /* A */ 65: api.MOVE_LEFT,
    /* S */ 83: api.MOVE_BACKWARD,
    /* D */ 68: api.MOVE_RIGHT,
    /* Q */ 81: api.TURN_LEFT,
    /* ← */ 37: api.TURN_LEFT,
    /* E */ 69: api.TURN_RIGHT,
    /* → */ 39: api.TURN_RIGHT,
    /* ↑ */ 38: api.TURN_UP,
    /* ↓ */ 40: api.TURN_DOWN,
/* Shift */ 16: api.MOVE_DOWN,
/* Space */ 32: api.MOVE_UP
  };

  eventify(api);

  updateMatrix();
  return api;

  function handleKeyDown(e: KeyboardEvent) {
    onKey(e, 1);
  }

  function handleKeyUp(e: KeyboardEvent) {
    onKey(e, 0);
  }

  function handleMouseDown(e){
    if (e.which !== 1) return; // only left button works here.

    if (document.pointerLockElement) {
      document.exitPointerLock();
    } else if (lockMouse) {
      inputTarget.requestPointerLock();
    } else {
      inputTarget.focus();
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      mouseX = e.clientX;
      mouseY = e.clientY;
      e.preventDefault();
    }
  }

  function onMouseMove(e) {
    let dy = e.clientY - mouseY;
    let dx = e.clientX - mouseX;
    updateLookAtByOffset(-dx, dy);
    mouseX = e.clientX;
    mouseY = e.clientY;
    e.preventDefault();
  }

  function onMouseUp(e) {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  function onPointerLockChange(e) {
    if (document.pointerLockElement) {
      document.addEventListener('mousemove', handleMousePositionChange, false);
    } else {
      document.removeEventListener('mousemove', handleMousePositionChange, false);
      dPhi = 0;
      dIncline = 0;
    }
  }

  function handleMousePositionChange(e) {
    updateLookAtByOffset(e.movementX, -e.movementY)
  }

  function updateLookAtByOffset(dx, dy) {
    phi -= (rotationSpeed * dx) / drawContext.width;
    phi = clamp(phi, minPhi, maxPhi);
    theta -= ((inclinationSpeed * dy) / drawContext.height);
    theta = clamp(theta, minTheta, maxTheta);
    updateMatrix();
  }

  function onKey(e: KeyboardEvent, isDown: number) {
    if (isModifierKey(e)) {
      // remove the move down if modifier was pressed after shift
      vz = 0;
      return;
    }
    let command = keyMap[e.which];
    if (command) handleCommand(command, isDown)
  }

  function handleCommand(commandId, value: number) {
    switch (commandId) {
      case api.MOVE_FORWARD:
        vy = value; break;
      case api.MOVE_BACKWARD:
        vy = -value; break;
      case api.MOVE_LEFT:
        vx = value; break;
      case api.MOVE_RIGHT:
        vx = -value; break;
      case api.MOVE_UP:
        vz = value; break;
      case api.MOVE_DOWN:
        vz = -value; break;

      case api.TURN_LEFT:
        vPhi = -value; break;
      case api.TURN_RIGHT:
        vPhi = value; break;
      case api.TURN_UP:
        vIncline = value; break;
      case api.TURN_DOWN:
        vIncline = -value; break;

      default: {
        throw new Error('Unknown command ' + commandId);
      }
    }

    processNextInput();
  }

  function processNextInput() {
    if (frameHandle) return; // already scheduled
    frameHandle = requestAnimationFrame(frame);
  }

  function setViewBox(rect) {
    const dpr = scene.getPixelRatio();
    const nearHeight = dpr * Math.max((rect.top - rect.bottom)/2, (rect.right - rect.left) / 2);
    let x = (rect.left + rect.right)/2;
    let y = (rect.top + rect.bottom)/2;
    let z = nearHeight / Math.tan(drawContext.fov / 2);
    lookAt([x, y, z], [x, y, 0]);
    return api;
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
      phi -= 3*(rotationSpeed * dPhi) / drawContext.width;
      phi = clamp(phi, minPhi, maxPhi);
      needRedraw = true;
    }
    dIncline = clampTo((dIncline * dampFactor + vIncline/6), Math.PI/360, 0);
    if (dIncline) {
      let ar = drawContext.width / drawContext.height;
      theta -= ((inclinationSpeed * dIncline) / drawContext.height) * ar;
      theta = clamp(theta, minTheta, maxTheta);
      needRedraw = true;
    }

    if (dx || dy) {
      moveCenterBy(-dx * moveSpeed, dy * moveSpeed);
      needRedraw = true;
    }
    if (dz) {
      cameraPosition[2] += dz * flySpeed;
      needRedraw = true;
    }

    if (needRedraw) {
      updateMatrix();
      processNextInput();
    }
    moveState.dx = dx; moveState.dy = dy; moveState.dz = dz;
    moveState.dPhi = dPhi; moveState.dIncline = dIncline;
    (api as any).fire('move', moveState);
  }

  function lookAt(eye: number[], center: number[]) {
    let direction = [
      center[0] - eye[0],
      center[1] - eye[1],
      center[2] - eye[2]
    ];
    // vec3.copy(centerPosition, center);
    vec3.copy(cameraPosition, eye);
    vec3.normalize(direction, direction);
    
    let x = direction[0];
    let y = direction[1];
    // theta = Math.atan2(y, x);
    phi = Math.atan2(y,x);
    theta = Math.atan2(Math.sqrt(x * x + y * y), direction[2]);
    r = 1;
    updateMatrix();
    return api;
  }

  function getUpVector() {
    let lookAtPosition = getSpherical(r, theta, phi);

    vec3.set(
      centerPosition,
      cameraPosition[0] + lookAtPosition[0],
      cameraPosition[1] + lookAtPosition[1],
      cameraPosition[2] + lookAtPosition[2],
    );

    // TODO: is there a faster way?
    let upVector: number[], x: number[];
    let offset = Math.PI/4;

    if (theta > offset) {
      upVector = getSpherical(1, theta - offset, phi);
      x = getSpherical(1, theta, phi);
    } else {
      upVector = getSpherical(1, theta, phi);
      x = getSpherical(1, theta + offset, phi);
    }
    vec3.cross(x, x, upVector);
    vec3.cross(upVector, x, upVector);
    vec3.normalize(upVector, upVector);
    return upVector;
  }

  function updateMatrix() {
    let lookAtPosition = getSpherical(r, theta, phi);
    vec3.set(
      centerPosition,
      cameraPosition[0] + lookAtPosition[0],
      cameraPosition[1] + lookAtPosition[1],
      cameraPosition[2] + lookAtPosition[2],
    );

    // TODO: is there a faster way?
    let upVector: number[], x: number[];
    let offset = Math.PI/4;
    if (theta > offset) {
      upVector = getSpherical(1, theta - offset, phi);
      x = getSpherical(1, theta, phi);
    } else {
      upVector = getSpherical(1, theta, phi);
      x = getSpherical(1, theta + offset, phi);
    }
    vec3.cross(x, x, upVector);
    vec3.cross(upVector, x, upVector);
    vec3.normalize(upVector, upVector);

    mat4.targetTo(view.matrix, cameraPosition, centerPosition, upVector);
    mat4.getRotation(view.rotation, view.matrix);
    transformEvent.updated = false;
    scene.fire('transform', transformEvent);
    if(transformEvent.updated) {
       // try one more time, as something has changed with the camera position.
      updateMatrix();
      return;
    }

    view.update();
    scene.getRoot().scheduleMVPUpdate();
    scene.renderFrame();
  }

  function moveCenterBy(dx: number, dy: number) {
    let cPhi = Math.cos(phi);
    let sPhi = Math.sin(phi);
    cameraPosition[0] += cPhi * dy + sPhi * dx;
    cameraPosition[1] += sPhi * dy - cPhi * dx;
  }

  function dispose() {
    cancelAnimationFrame(frameHandle);
    frameHandle = 0;
    inputTarget.removeEventListener('keydown', handleKeyDown);
    inputTarget.removeEventListener('keyup', handleKeyUp);
    inputTarget.removeEventListener('mousedown', handleMouseDown);

    document.removeEventListener('mousemove', handleMousePositionChange, false);
    document.removeEventListener('pointerlockchange', onPointerLockChange, false);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}

function isModifierKey(e: KeyboardEvent) {
  return e.altKey || e.ctrlKey || e.metaKey;
}