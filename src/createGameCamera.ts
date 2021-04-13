import {quat} from 'gl-matrix';
import {DrawContext, WglScene} from './createScene';
import getInputTarget from './input/getInputTarget';

export default function createGameCamera(scene: WglScene, drawContext: DrawContext) {
  let rotateSpeed =  Math.PI/360;
  let speedFactor = 1;
  let moveSpeed = 0.2;
  let frameRotation: quat = [0, 0, 0, 1];

  let dx = 0, dy = 0, dz = 0;
  let roll = 0, yaw = 0, pitch = 0;

  // Note: I think using second order control here would result in more natural
  // movement. E.g. change velocity instead of changing the position.
  let keymap = {
    // general movement
    87: function(isUp /*, e */) { dz =     isUp; }, // w - forward
    83: function(isUp /*, e */) { dz =    -isUp; }, // s - backward
    68: function(isUp /*, e */) { dx =     isUp; }, // d - left
    65: function(isUp /*, e */) { dx =    -isUp; }, // a - right
    82: function(isUp /*, e */) { dy =     isUp; }, // r - up
    70: function(isUp /*, e */) { dy =    -isUp; }, // f - down
    69: function(isUp /*, e */) { roll =   isUp; }, // e - roll left
    81: function(isUp /*, e */) { roll =  -isUp; }, // q - roll right
    37: function(isUp /*, e */) { yaw  =   isUp; }, // ← - yaw left
    39: function(isUp /*, e */) { yaw  =  -isUp; }, // → - yaw right 
    38: function(isUp /*, e */) { pitch =  isUp; }, // ↑ - pitch up
    40: function(isUp /*, e */) { pitch = -isUp; }, // ↓ - pitch down
    // speed
    90: function(isUp) {                            // z - slow down
      if (isUp) speedFactor *= 0.9;
    },
    88: function(isUp) {                            // x - speed up
      if (isUp) speedFactor *= 1.1;
    }
  };

  const api = {
    dispose,
    setViewBox,
    setRotationSpeed,
    getRotationSpeed,
    setMoveSpeed,
    getMoveSpeed,
    setSpeed(factor) {
      speedFactor = factor;
    }
  };

  let sceneOptions = scene.getOptions() || {};
  const inputTarget = getInputTarget(sceneOptions.inputTarget, drawContext.canvas);
  inputTarget.style.outline = 'none';
  inputTarget.setAttribute('tabindex', '0');
  inputTarget.addEventListener('keydown', handleKeyDown);
  inputTarget.addEventListener('keyup', handleKeyUp);

  let frameHandle = requestAnimationFrame(frame);

  return api;

  function setViewBox(rect) {
    const dpr = scene.getPixelRatio();
    const nearHeight = dpr * Math.max((rect.top - rect.bottom)/2, (rect.right - rect.left) / 2);
    const {position, rotation} = drawContext.view;
    position[0] = (rect.left + rect.right)/2;
    position[1] = (rect.top + rect.bottom)/2;
    position[2] = nearHeight / Math.tan(drawContext.fov / 2);
    quat.set(rotation, 0, 0, 0, 1);

    drawContext.view.update();
  }

  function handleKeyDown(e) {
    if (isModifierKey(e)) return;

    let handler = keymap[e.which];
    if (handler) handler(1, e);
  }

  function handleKeyUp(e) {
    let handler = keymap[e.which];
    if (handler) handler(0, e);
  }

  function frame() {
    frameHandle = requestAnimationFrame(frame);
    let changed = dx || dy || dz || yaw || pitch || roll;
    if (!changed) return;

    let speedAmplifier = speedFactor * moveSpeed;
    if (dz) {
      drawContext.view.translateZ(-speedAmplifier * dz);
    } 
    if (dx) {
      drawContext.view.translateX(speedAmplifier * dx);
    }
    if (dy) {
      drawContext.view.translateY(speedAmplifier * dy);
    }

    const view = drawContext.view;
    quat.set(frameRotation, pitch * rotateSpeed, yaw * rotateSpeed, -roll * rotateSpeed, 1);
    quat.normalize(frameRotation, frameRotation);
    quat.multiply(view.rotation, view.rotation, frameRotation);

    view.update();
    scene.getRoot().scheduleMVPUpdate();

    scene.fire('transform', drawContext);
    scene.renderFrame();
  }

  function dispose() {
    cancelAnimationFrame(frameHandle);
    inputTarget.removeEventListener('keydown', handleKeyDown);
    inputTarget.removeEventListener('keyup', handleKeyUp);
  }

  function setRotationSpeed(speed) {
    rotateSpeed = speed
  }

  function getRotationSpeed() {
    return rotateSpeed;
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
