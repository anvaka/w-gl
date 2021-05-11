import {vec3,  quat, mat4} from 'gl-matrix';
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

  // The camera follows "FPS" mode, but implemented on quaternions.
  let sceneOptions = scene.getOptions() || {};
  const upVector = [0, 0, 1];

  let rotationSpeed = Math.PI;
  let inclinationSpeed = Math.PI * 1.618;

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

  // TODO: Extract device orientation handling into own class.
  window.addEventListener('deviceorientationabsolute', onDeviceOrientationChange, true);
  
  let transformEvent = new TransformEvent(scene); 
  let frameHandle = 0;
  let vx = 0, vy = 0, vz = 0; // velocity of the panning
  let dx = 0, dy = 0, dz = 0; // actual offset of the panning
  let dPhi = 0, vPhi = 0; // rotation 
  let dIncline = 0, vIncline = 0; // inclination
  let moveState = {dx, dy, dz, dPhi, dIncline};
  let moveSpeed = 0.01; // TODO: Might wanna make this computed based on distance to surface
  let flySpeed = 1e-2;

  let sceneRotationAdjustment: [number, number, number, number];
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

  function updateLookAtByOffset(dx: number, dy: number) {
    let dYaw = -(rotationSpeed * dx) / drawContext.width;
    let dPitch = (inclinationSpeed * dy) / drawContext.height;
    rotateBy(dYaw, dPitch);
    commitMatrixChanges();
  }

  function onDeviceOrientationChange(e: DeviceOrientationEvent) {
    const {alpha, beta, gamma} = e;
    if (e.absolute && alpha === null && beta === null && gamma === null) {
      // This means the device can never provide absolute values. We need to fallback
      // to relative device orientation which is not very accurate and prone to errors.
      // Consumers of this API better should allow users to switch to non-device-orientation based
      // means of movement
      window.removeEventListener('deviceorientationabsolute', onDeviceOrientationChange);
      window.addEventListener('deviceorientation', onDeviceOrientationChange);
      return;
    }

    let q = getQuaternion(alpha, beta, gamma);
    // align with current lookAt:
    if (!sceneRotationAdjustment) {
      // This one point in front of device translated into world's coordinates
      // (Z points towards us, so take one step in negative direction of Z
      // https://developers.google.com/web/fundamentals/native-hardware/device-orientation#device_coordinate_frame )
      let deviceFront = vec3.normalize([], vec3.transformQuat([], [0, 0, -1], q));
      let cameraFront = vec3.normalize([], vec3.transformQuat([], [0, 0, -1], view.orientation));
      let angle = -Math.acos(vec3.dot(deviceFront, cameraFront))/2;
      sceneRotationAdjustment = [0, 0, Math.sin(angle), Math.cos(angle)];
    }

    // account for potential landscape orientation:
    // TODO: `window.orientation` is deprecated, might need to sue screen.orientation.angle,
    // but that is not supported by ios
    let orientation = (window.orientation || 0) as number;
    let screenAngle = -(Math.PI * orientation / 180 )/2;
    let s = [0, 0, Math.sin(screenAngle), Math.cos(screenAngle)];
    quat.mul(q, q, s);
     // account for difference between lookAt and device orientation:
    quat.mul(view.orientation, sceneRotationAdjustment, q);

    commitMatrixChanges();
  }

  function getQuaternion(alpha, beta, gamma ) {
    var halfToRad = .5 * Math.PI / 180;
    // These values can be nulls if device cannot provide them for some reason.
    var _x = beta  ? beta  * halfToRad : 0;
    var _y = gamma ? gamma * halfToRad : 0;
    var _z = alpha ? alpha * halfToRad : 0;

    var cX = Math.cos(_x);
    var cY = Math.cos(_y);
    var cZ = Math.cos(_z);
    var sX = Math.sin(_x);
    var sY = Math.sin(_y);
    var sZ = Math.sin(_z);

    // ZXY quaternion construction from Euler
    var x = sX * cY * cZ - cX * sY * sZ;
    var y = cX * sY * cZ + sX * cY * sZ;
    var z = cX * cY * sZ + sX * sY * cZ;
    var w = cX * cY * cZ - sX * sY * sZ;

    return [x, y, z, w];
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
    dIncline = clampTo((dIncline * dampFactor + vIncline/6), Math.PI/360, 0);

    if (dx || dy) {
      moveCenterBy(dx * moveSpeed, dy * moveSpeed);
      needRedraw = true;
    }
    if (dz) {
      cameraPosition[2] += dz * flySpeed;
      needRedraw = true;
    }
    if (dIncline || dPhi) {
      rotateBy(-dPhi*1e-2, dIncline*1e-2);
      needRedraw = true;
    }

    if (needRedraw) {
      commitMatrixChanges();
      processNextInput();
    }
    moveState.dx = dx; moveState.dy = dy; moveState.dz = dz;
    moveState.dPhi = dPhi; moveState.dIncline = dIncline;
    (api as any).fire('move', moveState);
  }

  function lookAt(eye: number[], center: number[]) {
    vec3.set(cameraPosition, eye[0], eye[1], eye[2]);
    vec3.set(centerPosition, center[0], center[1], center[2]);

    mat4.targetTo(view.cameraWorld, cameraPosition, centerPosition, upVector);
    mat4.getRotation(view.orientation, view.cameraWorld);
    mat4.invert(view.matrix, view.cameraWorld);
    return api;
  }

  function getUpVector() {
    return upVector;
  }

  function commitMatrixChanges() {
    view.update();
    vec3.transformMat4(centerPosition, [0, 0, -1], view.cameraWorld);

    transformEvent.updated = false; 
    scene.fire('transform', transformEvent);
    if (transformEvent.updated) {
      // the client has changed either position or rotation...
      // try one more time 
      commitMatrixChanges();
      return;
    }

    scene.getRoot().scheduleMVPUpdate();
    scene.renderFrame();
  }

  function rotateBy(yaw, pitch) {
    // Note order here is important: https://gamedev.stackexchange.com/questions/30644/how-to-keep-my-quaternion-using-fps-camera-from-tilting-and-messing-up/30669
    if (yaw) quat.mul(view.orientation, quat.setAxisAngle([], [0, 0, 1], yaw), view.orientation);
    if (pitch) quat.mul(view.orientation, view.orientation, quat.setAxisAngle([], [1, 0, 0], pitch));
  }

  function moveCenterBy(dx: number, dy: number) {
    // TODO: this slow downs when camera looks directly down.
    // The `dy` is in `z` coordinate, because we are working with view matrix rotations
    // where z axis is going from the screen towards the viewer
    let delta = vec3.transformQuat([], [-dx, 0, -dy], view.orientation);
    cameraPosition[0] += delta[0];
    cameraPosition[1] += delta[1];
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
    window.removeEventListener('deviceorientationabsolute', onDeviceOrientationChange);
    window.removeEventListener('deviceorientation', onDeviceOrientationChange);
  }
}

function isModifierKey(e: KeyboardEvent) {
  return e.altKey || e.ctrlKey || e.metaKey;
}