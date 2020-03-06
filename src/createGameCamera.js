import {mat4, vec3, quat} from 'gl-matrix';

const xAxis = [1, 0, 0];
const yAxis = [0, 1, 0];
const zAxis = [0, 0, 1];

export default function createGameCamera(scene, drawContext) {
  let rotateSpeed =  Math.PI/360;
  let speedFactor = 1;
  let moveSpeed = 0.2;
  let frameRotation = [0, 0, 0, 1];
  let spareVec3 = [0, 0, 0];

  let dx = 0, dy = 0, dz = 0;
  let roll = 0, yaw = 0, pitch = 0;
  let rotation = mat4.getRotation([], drawContext.view)
  mat4.getTranslation(drawContext.origin, drawContext.view);

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

  let canvas = drawContext.canvas;
  canvas.style.outline = 'none';
  canvas.setAttribute('tabindex', 0);
  canvas.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('keyup', handleKeyUp);

  let frameHandle = requestAnimationFrame(frame);

  return api;

  function setViewBox(rect) {
    const dpr = scene.getPixelRatio();
    const nearHeight = dpr * Math.max((rect.top - rect.bottom)/2, (rect.right - rect.left) / 2);
    drawContext.origin[0] = (rect.left + rect.right)/2;
    drawContext.origin[1] = (rect.top + rect.bottom)/2;
    drawContext.origin[2] = nearHeight / Math.tan(drawContext.fov / 2);
    quat.set(rotation, 0, 0, 0, 1);

    mat4.fromRotationTranslation(drawContext.view, rotation, drawContext.origin);
    mat4.invert(drawContext.view, drawContext.view);
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
      translateOnAxis(zAxis, drawContext.origin, -speedAmplifier * dz, rotation);
    } 
    if (dx) {
      translateOnAxis(xAxis, drawContext.origin, speedAmplifier * dx, rotation);
    }
    if (dy) {
      translateOnAxis(yAxis, drawContext.origin, speedAmplifier * dy, rotation);
    }

    quat.set(frameRotation, pitch * rotateSpeed, yaw * rotateSpeed, -roll * rotateSpeed, 1);
    quat.normalize(frameRotation, frameRotation);
    quat.multiply(rotation, rotation, frameRotation);

    mat4.fromRotationTranslation(drawContext.view, rotation, drawContext.origin);
    mat4.invert(drawContext.view, drawContext.view);

    scene.fire('transform', drawContext);
    scene.renderFrame();
  }

  function translateOnAxis(axis, position, distance, q) {
    let translation = vec3.transformQuat(spareVec3, axis, q);
    return vec3.scaleAndAdd(position, position, translation, distance);
  } 

  function dispose() {
    cancelAnimationFrame(frameHandle);
    canvas.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('keyup', handleKeyUp);
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
