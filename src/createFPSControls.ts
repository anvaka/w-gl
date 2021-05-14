import {vec3, quat, mat4} from 'gl-matrix';
import {WglScene} from './createScene';
import getInputTarget from './input/getInputTarget';
import {option, clampTo} from './cameraUtils';
import TransformEvent from './TransformEvent';
import eventify from 'ngraph.events';
import createDeviceOrientationHandler from './createDeviceOrientationHandler';

const FRONT_VECTOR = [0, 0, -1];

export const INPUT_COMMANDS = {
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
}

/**
 * Game input controls similar to the first player games, where user can "walk" insider
 * the world and look around.
 */
export default function createFPSControls(scene: WglScene) {
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

  let captureMouse = option(sceneOptions.captureMouse, false); // whether rotation is done via locked mouse
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
  let deviceOrientationHandler = createDeviceOrientationHandler(inputTarget, view.orientation, commitMatrixChanges);
  
  let transformEvent = new TransformEvent(scene); 
  let frameHandle = 0;
  let vx = 0, vy = 0, vz = 0; // velocity of the panning
  let dx = 0, dy = 0, dz = 0; // actual offset of the panning
  let dPhi = 0, vPhi = 0; // rotation 
  let dIncline = 0, vIncline = 0; // inclination
  let moveState = {
    [INPUT_COMMANDS.MOVE_FORWARD]:  false,
    [INPUT_COMMANDS.MOVE_BACKWARD]: false,
    [INPUT_COMMANDS.MOVE_LEFT]:     false,
    [INPUT_COMMANDS.MOVE_RIGHT]:    false,
    [INPUT_COMMANDS.MOVE_UP]:       false,
    [INPUT_COMMANDS.MOVE_DOWN]:     false,
    [INPUT_COMMANDS.TURN_LEFT]:     false,
    [INPUT_COMMANDS.TURN_RIGHT]:    false,
    [INPUT_COMMANDS.TURN_UP]:       false,
    [INPUT_COMMANDS.TURN_DOWN]:     false,
  };
  let moveSpeed = 0.01; // TODO: Might wanna make this computed based on distance to surface
  let flySpeed = 1e-2;

  const api = {
    dispose,
    handleCommand,
    setViewBox,
    getUpVector,
    lookAt,
    setMouseCapture,
    setRotationSpeed(speed: number) { rotationSpeed = speed; return api; },
    setMoveSpeed(speed: number) { moveSpeed = speed; return api; },
    setFlySpeed(speed: number) { flySpeed = speed; return api; },
    setSpeed(factor: number) { moveSpeed = factor; flySpeed = factor; return api; },
    getRotationSpeed() { return rotationSpeed; },
    getMoveSpeed() { return moveSpeed; },
    getFlySpeed() { return flySpeed; },
    getKeymap() { return keyMap; },
    getMouseCapture() { return captureMouse; }
  };

  const keyMap = {
    /* W */ 87: INPUT_COMMANDS.MOVE_FORWARD,
    /* A */ 65: INPUT_COMMANDS.MOVE_LEFT,
    /* S */ 83: INPUT_COMMANDS.MOVE_BACKWARD,
    /* D */ 68: INPUT_COMMANDS.MOVE_RIGHT,
    /* Q */ 81: INPUT_COMMANDS.TURN_LEFT,
    /* ← */ 37: INPUT_COMMANDS.TURN_LEFT,
    /* E */ 69: INPUT_COMMANDS.TURN_RIGHT,
    /* → */ 39: INPUT_COMMANDS.TURN_RIGHT,
    /* ↑ */ 38: INPUT_COMMANDS.TURN_UP,
    /* ↓ */ 40: INPUT_COMMANDS.TURN_DOWN,
/* Shift */ 16: INPUT_COMMANDS.MOVE_DOWN,
/* Space */ 32: INPUT_COMMANDS.MOVE_UP
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
    } else if (captureMouse) {
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
    let dYaw = (rotationSpeed * dx) / drawContext.width;
    let dPitch = (inclinationSpeed * dy) / drawContext.height;
    rotateBy(dYaw, dPitch);
    commitMatrixChanges();
  }

  function setMouseCapture(isLocked: boolean) { 
    captureMouse = isLocked; 
    (api as any).fire('mouse-capture', isLocked);
    return api; 
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
      case INPUT_COMMANDS.MOVE_FORWARD:
        vy = value; break;
      case INPUT_COMMANDS.MOVE_BACKWARD:
        vy = -value; break;
      case INPUT_COMMANDS.MOVE_LEFT:
        vx = value; break;
      case INPUT_COMMANDS.MOVE_RIGHT:
        vx = -value; break;
      case INPUT_COMMANDS.MOVE_UP:
        vz = value; break;
      case INPUT_COMMANDS.MOVE_DOWN:
        vz = -value; break;

      case INPUT_COMMANDS.TURN_LEFT:
        vPhi = -value; break;
      case INPUT_COMMANDS.TURN_RIGHT:
        vPhi = value; break;
      case INPUT_COMMANDS.TURN_UP:
        vIncline = value; break;
      case INPUT_COMMANDS.TURN_DOWN:
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
      rotateBy(dPhi*0.01, dIncline*0.01);
      needRedraw = true;
    }

    if (needRedraw) {
      commitMatrixChanges();
      processNextInput();
    }
    moveState[INPUT_COMMANDS.MOVE_LEFT] = dx > 0;
    moveState[INPUT_COMMANDS.MOVE_RIGHT] = dx < 0;
    moveState[INPUT_COMMANDS.MOVE_FORWARD] = dy > 0;
    moveState[INPUT_COMMANDS.MOVE_BACKWARD] = dy < 0;
    moveState[INPUT_COMMANDS.MOVE_UP] = dz > 0;
    moveState[INPUT_COMMANDS.MOVE_DOWN] = dz < 0;
    moveState[INPUT_COMMANDS.TURN_LEFT] = dPhi < 0;
    moveState[INPUT_COMMANDS.TURN_RIGHT] = dPhi > 0;
    (api as any).fire('move', moveState);
  }

  function lookAt(eye: number[], center: number[]) {
    vec3.set(cameraPosition, eye[0], eye[1], eye[2]);
    vec3.set(centerPosition, center[0], center[1], center[2]);

    mat4.targetTo(view.cameraWorld, cameraPosition, centerPosition, upVector);
    mat4.getRotation(view.orientation, view.cameraWorld);
    mat4.invert(view.matrix, view.cameraWorld);
    commitMatrixChanges();
    return api;
  }

  function getUpVector() {
    return upVector;
  }

  function commitMatrixChanges() {
    view.update();
    vec3.transformMat4(centerPosition, FRONT_VECTOR, view.cameraWorld);

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
    // Note order here is important: 
    // https://gamedev.stackexchange.com/questions/30644/how-to-keep-my-quaternion-using-fps-camera-from-tilting-and-messing-up/30669
    if (yaw) {
      quat.mul(view.orientation, quat.setAxisAngle([], FRONT_VECTOR, yaw), view.orientation);
      // Wanna make sure that device orientation based API is updated after this too
      deviceOrientationHandler.useCurrentOrientation();
    }
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
    deviceOrientationHandler.dispose();
  }
}

function isModifierKey(e: KeyboardEvent) {
  return e.altKey || e.ctrlKey || e.metaKey;
}