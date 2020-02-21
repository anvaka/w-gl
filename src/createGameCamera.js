import {mat4, vec3, quat} from 'gl-matrix';

export default function createGameCamera(scene, drawContext) {
  let moveSpeed = 0.1;
  let rotateSpeed =  Math.PI/180;
  let speedFactor = 1;
  let origin = drawContext.origin;
  let norm = [0, 1, 0];
  let direction = [0, 0, -1];
  let center = drawContext.center;

  let dx = 0, dy = 0, dz = 0;
  let roll = 0, yaw = 0, pitch = 0;

  // Note: I think using second order control here would result in more natural
  // movement. E.g. change velocity instead of changing the position.
  let keymap = {
    // general movement
    87: function(isUp /*, e */) { dz =     isUp; }, // w
    65: function(isUp /*, e */) { dx =    -isUp; }, // a
    83: function(isUp /*, e */) { dz =    -isUp; }, // s
    68: function(isUp /*, e */) { dx =     isUp; }, // d - left
    82: function(isUp /*, e */) { dy =     isUp; }, // r - up
    70: function(isUp /*, e */) { dy =    -isUp; }, // f - down
    69: function(isUp /*, e */) { roll =   isUp; }, // e - roll left
    81: function(isUp /*, e */) { roll =  -isUp; }, // q - roll right
    39: function(isUp /*, e */) { yaw  =  -isUp; }, // yaw right 
    37: function(isUp /*, e */) { yaw  =   isUp; }, // yaw left
    38: function(isUp /*, e */) { pitch =  isUp; }, // j - up
    40: function(isUp /*, e */) { pitch = -isUp; }, // k - down
    // speed
    90: function(isUp) {                            // z slow down
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

  updateLookMatrix();

  let canvas = drawContext.canvas;
  canvas.style.outline = 'none';
  canvas.setAttribute('tabindex', 0);
  canvas.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('keyup', handleKeyUp);

  let frameHandle = requestAnimationFrame(frame);

  return api;

  function setViewBox(rect) {
    // TODO: Remove duplicate with map camera
    const dx = (rect.left + rect.right)/2;
    const dy = (rect.top + rect.bottom)/2;
    const dpr = scene.getPixelRatio();
    const nearHeight = dpr * Math.max((rect.top - rect.bottom)/2, (rect.right - rect.left) / 2);
    origin[0] = dx;
    origin[1] = dy;
    origin[2] = nearHeight / Math.tan(drawContext.fov / 2);
    direction[0] = -origin[0];
    direction[1] = -origin[1];
    direction[2] = -origin[2];
    vec3.normalize(direction, direction);
    norm[0] = 0; norm[1] = 1; norm[2] = 0; 
    updateLookMatrix();
  }

  function updateLookMatrix() {
    vec3.add(center, origin, direction);
    mat4.lookAt(drawContext.view, origin, center, norm);
  }

  function handleKeyDown(e) {
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

    if (dz) {
      let dt = speedFactor * moveSpeed * dz;
      origin[0] += direction[0] * dt;
      origin[1] += direction[1] * dt;
      origin[2] += direction[2] * dt;
    } 
    if (dx) {
      let cross = vec3.cross([], direction, norm);
      vec3.normalize(cross, cross);
      let dt = speedFactor * moveSpeed * dx;
      origin[0] += cross[0] * dt;
      origin[1] += cross[1] * dt;
      origin[2] += cross[2] * dt;
    }
    if (dy) {
      let dt = speedFactor * moveSpeed * dy;
      origin[0] += norm[0] * dt;
      origin[1] += norm[1] * dt;
      origin[2] += norm[2] * dt;
    }

    if (roll) {
      let q = quat.setAxisAngle([], direction, roll * rotateSpeed);
      let result = quat.multiply([], quat.multiply([], q, [norm[0], norm[1], norm[2], 1]), quat.conjugate([], q));
      vec3.normalize(norm, result);
    }
    if (yaw) {
      let q = quat.setAxisAngle([], norm, yaw * rotateSpeed);
      let result = quat.multiply([], quat.multiply([], q, [direction[0], direction[1], direction[2], 1]), quat.conjugate([], q));
      vec3.normalize(direction, result);
    }
    if (pitch) {
      let cross = vec3.cross([], direction, norm);
      vec3.normalize(cross, cross);
      let q = quat.setAxisAngle([], cross, pitch * rotateSpeed);

      let result = quat.multiply([], quat.multiply([], q, [direction[0], direction[1], direction[2], 1]), quat.conjugate([], q));
      vec3.normalize(direction, result);
      vec3.cross(norm, cross, direction);
      vec3.normalize(norm, norm);
    }

    scene.fire('transform', drawContext);
    updateLookMatrix();
    scene.renderFrame();
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