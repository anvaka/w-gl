import {mat4, vec3, quat} from 'gl-matrix';

export default function createGameCamera(scene, drawContext) {
  let moveSpeed = 0.1;
  let rotateSpeed =  Math.PI/180;
  let speedFactor = 1;

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

  let norm = [0, 1, 0];
  let origin = drawContext.origin; // [0, 0, 2];
  let direction = [0, 0, -1];
  let center = [0, 0, 0];

  let dx = 0, dy = 0, dz = 0;
  let roll = 0, yaw = 0, pitch = 0;

  updateLookMatrix();

  let canvas = drawContext.canvas;
  canvas.style.outline = 'none';
  canvas.setAttribute('tabindex', 0);
  canvas.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('keyup', handleKeyUp);

  let frameHandle = requestAnimationFrame(frame);

  return api;

  function setViewBox(rect) {
    const dx = (rect.left + rect.right)/2;
    const dy = (rect.top + rect.bottom)/2;
    const dpr = scene.getPixelRatio();
    const nearHeight = dpr * Math.max((rect.top - rect.bottom)/2, (rect.right - rect.left) / 2);
    origin[0] = dx;
    origin[1] = dy;
    origin[2] = -nearHeight/Math.tan(drawContext.fov / 2);
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
    if (e.which === 87) dz = 1; // w
    else if (e.which === 83) dz = -1;// s
    else if (e.which === 65) dx = -1; // a
    else if (e.which === 68) dx = 1 // d - left
    else if (e.which === 82) dy = 1 // r - up
    else if (e.which === 70) dy = -1; // f - down
    else if (e.which === 69) roll = 1; // e - roll left
    else if (e.which === 81) roll = -1 // q - roll right
    else if (e.which === 39) yaw = -1; // yaw right 
    else if (e.which === 37) yaw = 1; // yaw left
    else if (e.which === 38) pitch = 1 // j - up
    else if (e.which === 40) pitch = -1; // k - down
  }

  function handleKeyUp(e) {
    if (e.which === 87) dz = 0; // w
    else if (e.which === 83) dz = 0;// s
    else if (e.which === 65) dx = 0; // a
    else if (e.which === 68) dx = 0 // d - left
    else if (e.which === 82) dy = 0 // r - up
    else if (e.which === 70) dy = 0; // f - down
    else if (e.which === 69) roll = 0; // e - roll left
    else if (e.which === 81) roll = 0 // q - roll right
    else if (e.which === 39) yaw = 0; // yaw right 
    else if (e.which === 37) yaw = 0; // yaw left
    else if (e.which === 38) pitch = 0 // j - up
    else if (e.which === 40) pitch = 0; // k - down
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
      let q = quat.setAxisAngle([], direction, roll * rotateSpeed * speedFactor);
      let result = quat.multiply([], quat.multiply([], q, [norm[0], norm[1], norm[2], 1]), quat.conjugate([], q));
      vec3.normalize(norm, result);
    }
    if (yaw) {
      let q = quat.setAxisAngle([], norm, yaw * rotateSpeed * speedFactor);
      let result = quat.multiply([], quat.multiply([], q, [direction[0], direction[1], direction[2], 1]), quat.conjugate([], q));
      vec3.normalize(direction, result);
    }
    if (pitch) {
      let cross = vec3.cross([], direction, norm);
      vec3.normalize(cross, cross);
      let q = quat.setAxisAngle([], cross, pitch * rotateSpeed * speedFactor);

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