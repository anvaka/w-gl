import eventify from 'ngraph.events';

/**
 * Just to track changes for a single touch event, we create this state:
 */
class TouchState {
  constructor(touch) {
    this.x = touch.clientX;
    this.y = touch.clientY;
    this.lastX = this.x;
    this.lastY = this.y;
    this.id = touch.identifier;
    this.createdAt = Date.now();
  }

  move(touch) {
    this.lastX = this.x;
    this.lastY = this.y;

    this.x = touch.clientX;
    this.y = touch.clientY;
  }
}

// When two fingers touch the scene we want to "lock" interaction to either rotation
// or scaling. When locked to rotation, we also allow scaling. When Locked to scaling
// only scaling is allowed
const UNKNOWN = 0; // here we don't know yet. Collect more input to make a decision
const SCALE = 1;   // Locked to scaling.
const ROTATE = 2;  // Locked to rotation.
const INCLINE = 3; // Locked to inclination.

/**
 * This state is used to detect gestures. It answers the questions:
 * - Should we scale with this gesture?
 * - Should we rotate with this gesture?
 * - Should we change incline with this gesture?
 */
class MultiTouchState {
  constructor(allowRotation) {
    this.allowRotation = allowRotation;
    this.state = UNKNOWN;
    this.canRotate = false;
    this.canScale = false;
    this.canIncline = false;
    this.first = undefined;
    this.second = undefined;
  }

  reset() {
    this.state = UNKNOWN;
    this.canRotate = false;
    this.canScale = false;
    this.canIncline = false;
    this.first = undefined;
    this.second = undefined;
  }

  track(first, second) {
    this.rotationStateChanged = false;
    if (this.state !== UNKNOWN) return; // Already resolved the state.

    if (!(this.first && this.second)) {
      this.first = {
        id: first.id,
        x: first.x,
        y: first.y
      };
      this.second = {
        id: second.id,
        x: second.x,
        y: second.y
      };
      // we are not ready yet to process anything. Wait for more data:
      return;
    }

    // Make sure we have the same first/second touches:
    let originalFirst = this.first;
    let originalSecond = this.second;
    if (first.id === originalSecond.id && second.id === originalFirst.id) {
      let t = originalFirst;
      originalFirst = originalSecond;
      originalSecond = t;
    }

    // Now let's figure out what gesture we are dealing with...
    let dfy = originalFirst.y - originalSecond.y;
    let dfx = originalFirst.x - originalSecond.x;

    let dcy = first.y - second.y;
    let dcx = first.x - second.x;

    // We compare how much the distance has changed between first two touches and
    // current two touches:
    let scaleChange = Math.abs(Math.hypot(dfy, dfx) - Math.hypot(dcy, dcx));
    // Also compare how much the angle has changed:
    let initialAngle = Math.atan2(dfy, dfx);
    let angleChange = Math.abs(initialAngle - Math.atan2(dcy, dcx));

    // Now let's see if this is incline change:
    initialAngle = Math.abs(initialAngle) * 180 / Math.PI;
    // Two fingers have to be roughly on the horizontal line
    let horizontalAngleInDegrees = 60;
    let isHorizontalLine = initialAngle < horizontalAngleInDegrees || 
          (180 - initialAngle) < horizontalAngleInDegrees;
    if (isHorizontalLine && this.allowRotation && 
      Math.abs(first.createdAt - second.createdAt) < 100) {
      // we take a sum of two vectors:
      // direction of the first finger + direction of the second finger
      // In case of incline change we want them to move either up or down
      // which means X change should be small, why Y change should be large
      let vx = first.x - originalFirst.x + second.x - originalSecond.x;
      let vy = first.y - originalFirst.y + second.y - originalSecond.y;
      if (Math.abs(vx) < 10 && Math.abs(vy) > 42) {
        this.canIncline = true;
      }
    }

    if (this.canIncline) {
      this.canRotate = false;
      this.canScale = false;
      this.canIncline = true;
      this.state = INCLINE;
    } else if (angleChange > 0.1 && this.allowRotation) {
      // When we are rotating we want to be able to scale too:
      this.canRotate = true;
      this.canScale = true;
      this.canIncline = false;
      this.state = ROTATE;
    } else if (scaleChange > 15) {
      // But when we are scaling, only scaling should be allowed
      // (otherwise it's too annoying):
      this.canRotate = false;
      this.canScale = true;
      this.canIncline = false;
      this.state = SCALE;
    }

    this.rotationStateChanged = this.canRotate || this.canIncline;
  }
}

export default function createTouchController(inputTarget, inputState) {
  let api = eventify({dispose});

  let listening = false;
  let activeTouches = new Map();
  let {allowRotation, panAnimation, rotateAnimation} = inputState;
  let multiTouchState = new MultiTouchState(allowRotation);

  // used for double tap distance check: if they tapped to far, it is not a double tap:
  let lastTouch; 
  let lastTouchEndEventTime = Date.now();
  let lastMultiTouchEventTime = lastTouchEndEventTime;

  listenToEvents();

  return api;

  function dispose() {
    inputTarget.removeEventListener('touchstart', handleTouchStart, {passive: false});
    stopDocumentTouchListeners();
  }

  function listenToEvents() {
    inputTarget.addEventListener('touchstart', handleTouchStart, {passive: false});
  }
  
  function handleTouchStart(e) {
    if (!listening) {
      startDocumentTouchListeners();
      listening = true;
    }

    panAnimation.cancel();
    rotateAnimation.cancel();

    if (e.touches.length === 1) {
      // only when one touch is active we want to have inertia
      panAnimation.start();
    }

    for (let i = 0; i < e.touches.length; ++i) {
      let touch = e.touches[i];
      if (!activeTouches.has(touch.identifier)) {
        activeTouches.set(touch.identifier, new TouchState(touch));
      }
    }

    e.stopPropagation();
    e.preventDefault();
  }

  function handleTouchMove(e) {
    let now = Date.now();

    let dx = 0; let dy = 0; // total difference between touches.
    let cx = 0; let cy = 0; // center of the touches
    let first, second; // fingers.

    let touches = e.touches;
    for (let i = 0; i < touches.length; ++i) {
      let touch = touches[i];
      let state = activeTouches.get(touch.identifier);
      if (!state) {
        // We never tracked this touch - how is this even possible?
        continue;
      }

      state.move(touch);

      cx += state.x; cy += state.y;
      dx += state.x - state.lastX;
      dy += state.y - state.lastY;

      if (!first) first = state;
      else if (!second) second = state;
    }
    let changedCount = touches.length;
    dx /= changedCount; dy /= changedCount; 
    cx /= changedCount; cy /= changedCount;

    if (!second) multiTouchState.reset();

    // todo: find something better than `first` and `second` tracking?
    if (first && second) {
      lastMultiTouchEventTime = now;

      let dx = second.x - first.x;
      let dy = second.y - first.y;

      let lastDx = second.lastX - first.lastX;
      let lastDy = second.lastY - first.lastY;

      let zoomChange = Math.hypot(dx, dy) / Math.hypot(lastDx, lastDy) - 1;
      let angle = Math.atan2(dy, dx) - Math.atan2(lastDy, lastDx); 

      multiTouchState.track(first, second);

      if (multiTouchState.rotationStateChanged) {
        rotateAnimation.start();
      }

      if (multiTouchState.canScale) api.fire('zoomChange', cx, cy, zoomChange);
      if (multiTouchState.canRotate) api.fire('angleChange', angle);
      if (multiTouchState.canIncline) {
        let totalMove = (second.y - second.lastY + first.y - first.lastY);
        api.fire('altPan', 0, totalMove);
      }

      e.preventDefault();
      e.stopPropagation();
    }

    let timeSinceLastTouchEnd = now - lastTouchEndEventTime;
    let shouldSkipPanning = multiTouchState.canIncline ||  // can't pan when incline is changed
      (timeSinceLastTouchEnd < 300) || // don't pan if they just released a finger.
      (e.touches.length > 1 && multiTouchState.state === UNKNOWN);

    if ((dx !== 0 || dy !== 0) && !shouldSkipPanning) {
      // we are panning around
      api.fire('pan', dx, dy);
    }
  }

  function handleTouchEnd(e) {
    let now = Date.now();
    let timeSinceLastTouchEnd = now - lastTouchEndEventTime;
    lastTouchEndEventTime = now;

    let touches = e.changedTouches;
    for (let i = 0; i < touches.length; ++i) {
      let touch = touches[i];
      activeTouches.delete(touch.identifier);
    }

    if (e.touches.length < 2) {
      multiTouchState.reset(); // prepare for more multi-touch gesture detection
      rotateAnimation.stop();  // spin if necessary.
    } 

    if (e.touches.length === 0) {
      // Just in case we missed a finger in the map - clean it here.
      activeTouches.clear();
    }

    if (activeTouches.size === 0 && e.changedTouches.length === 1) {
      listening = false;
      stopDocumentTouchListeners();

      panAnimation.stop();

      if (timeSinceLastTouchEnd < 350 && (now - lastMultiTouchEventTime) > 350) {
        // Double tap?
        let newLastTouch = e.changedTouches[0];
        let dx = Math.abs(newLastTouch.clientX - lastTouch.clientX);
        let dy = Math.abs(newLastTouch.clientY - lastTouch.clientY);

        if (Math.hypot(dx, dy) < 30) {
          // Yes! They tapped close enough to the last tap. Zoom in:
          api.fire('zoomChange', lastTouch.clientX, lastTouch.clientY, 0.5, true);
        }
      }

      lastTouch = e.changedTouches[0];
    }
  }

  function startDocumentTouchListeners() {
    document.addEventListener('touchmove', handleTouchMove, {passive: false});
    document.addEventListener('touchend', handleTouchEnd, {passive: false});
    document.addEventListener('touchcancel ', handleTouchEnd, {passive: false});
  }

  function stopDocumentTouchListeners() {
    document.removeEventListener('touchmove', handleTouchMove, {passive: false});
    document.removeEventListener('touchend', handleTouchEnd, {passive: false});
    document.removeEventListener('touchcancel ', handleTouchEnd, {passive: false});
  }
}

function round(x, f) {
  return Math.round(x * f) / f;
}