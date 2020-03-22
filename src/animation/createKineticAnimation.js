
/**
 * Allows smooth kinetic scrolling of the surface
 */
export default function createKineticAnimation(getCurrentPoint, moveCallback, settings) {
  if (typeof settings !== 'object') {
    settings = {};
  }
  let EPS = 1e-3;

  let minVelocity = typeof settings.minVelocity === 'number' ? settings.minVelocity : EPS;
  let amplitude = typeof settings.amplitude === 'number' ? settings.amplitude : 0.01;
  let cancelAnimationFrame = typeof settings.cancelAnimationFrame === 'function' ? settings.cancelAnimationFrame : getCancelAnimationFrame();
  let requestAnimationFrame = typeof settings.requestAnimationFrame === 'function' ? settings.requestAnimationFrame : getRequestAnimationFrame();

  let lastPoint;
  let timestamp;
  let timeConstant = 342;

  let ticker;
  let vx, ax;
  let vy, ay;
  let vz, az;

  let raf;

  return {
    start,
    setAmplitude,
    getAmplitude,
    stop,
    cancel
  };

  function setAmplitude(newAmplitude) {
    amplitude = newAmplitude;
  }

  function getAmplitude() {
    return amplitude;
  }

  function cancel() {
    cancelAnimationFrame(ticker);
    cancelAnimationFrame(raf);
  }

  function start() {
    lastPoint = getCurrentPoint();

    ax = ay = vx = vy = vz = 0;
    timestamp = new Date();

    cancelAnimationFrame(ticker);
    cancelAnimationFrame(raf);

    // we start polling the point position to accumulate velocity
    // Once we stop(), we will use accumulated velocity to keep scrolling
    // an object.
    ticker = requestAnimationFrame(track);
  }

  function track() {
    var now = Date.now();
    var elapsed = now - timestamp;
    timestamp = now;

    var currentPoint = getCurrentPoint();

    var dx = currentPoint.x - lastPoint.x;
    var dy = currentPoint.y - lastPoint.y;
    var dz = (currentPoint.z || 0) - lastPoint.z;

    lastPoint = currentPoint;

    var dt = 1000 / (1 + elapsed);

    // moving average
    vx = 0.8 * dx * dt + 0.2 * vx;
    vy = 0.8 * dy * dt + 0.2 * vy;
    vz = 0.8 * dz * dt + 0.2 * vz;

    ticker = requestAnimationFrame(track);
  }

  function stop() {
    cancelAnimationFrame(ticker);
    cancelAnimationFrame(raf);

    timestamp = Date.now();

    if (vx < -minVelocity || vx > minVelocity) {
      ax = amplitude * vx;
    }

    if (vy < -minVelocity || vy > minVelocity) {
      ay = amplitude * vy;
    }
    if (vz < -minVelocity || vz > minVelocity) {
      az = amplitude * vz;
    }

    raf = requestAnimationFrame(kineticMove);
  }

  function kineticMove() {
    var elapsed = Date.now() - timestamp;

    var moving = false;
    var dx = 0;
    var dy = 0;
    var dz = 0;

    let fade = Math.exp(-elapsed / timeConstant);
    if (ax) {
      dx = ax * fade;

      if (dx > EPS || dx < -EPS) moving = true;
      else dx = ax = 0;
    }

    if (ay) {
      dy = ay * fade;

      if (dy > EPS || dy < -EPS) moving = true;
      else dy = ay = 0;
    }

    if (az) {
      dz = az * fade;

      if (dz > EPS || dz < -EPS) moving = true;
      else dz = az = 0;
    }

    if (moving) {
      let p = getCurrentPoint();
      moveCallback(p.x + dx, p.y + dy, p.z + dz);
      raf = requestAnimationFrame(kineticMove);
    }
  }
}

function getCancelAnimationFrame() {
  if (typeof cancelAnimationFrame === 'function') return cancelAnimationFrame;

  return clearTimeout;
}

function getRequestAnimationFrame() {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame;

  return function (handler) {
    return setTimeout(handler, 16);
  }
}