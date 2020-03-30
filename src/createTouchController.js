import { TouchState, MultiTouchState } from './input/TouchState';

export default function createTouchController(inputTarget, camera) {
  let listening = false;
  let activeTouches = new Map();
  let { allowRotation, panAnimation, rotateAnimation } = camera;
  let multiTouchState = new MultiTouchState(allowRotation);

  // used for double tap distance check: if they tapped to far, it is not a double tap:
  let lastTouch;
  let lastTouchEndEventTime = Date.now();
  let lastMultiTouchEventTime = lastTouchEndEventTime;

  listenToEvents();

  return {dispose};

  function dispose() {
    inputTarget.removeEventListener('touchstart', handleTouchStart, { passive: false });
    stopDocumentTouchListeners();
  }

  function listenToEvents() {
    inputTarget.addEventListener('touchstart', handleTouchStart, { passive: false });
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

    let dx = 0;
    let dy = 0; // total difference between touches.
    let cx = 0;
    let cy = 0; // center of the touches
    let first, second; // fingers.
    let needRedraw = false;

    let touches = e.touches;
    for (let i = 0; i < touches.length; ++i) {
      let touch = touches[i];
      let state = activeTouches.get(touch.identifier);
      if (!state) {
        // We never tracked this touch - how is this even possible?
        continue;
      }

      state.move(touch);

      cx += state.x;
      cy += state.y;
      dx += state.x - state.lastX;
      dy += state.y - state.lastY;

      if (!first) first = state;
      else if (!second) second = state;
    }
    let changedCount = touches.length;
    dx /= changedCount;
    dy /= changedCount;
    cx /= changedCount;
    cy /= changedCount;

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

      if (multiTouchState.stateChanged) {
        rotateAnimation.start();
        panAnimation.cancel();
      }

      if (multiTouchState.canScale) {
        camera.zoomToClientCoordinates(cx, cy, zoomChange);
        needRedraw = true;
      }
      if (multiTouchState.canRotate) {
        camera.rotateByAngle(angle, 0);
        needRedraw = true;
      } 
      if (multiTouchState.canIncline) {
        let totalMove = second.y - second.lastY + first.y - first.lastY;
        camera.rotateByAbsoluteOffset(0, totalMove);
        needRedraw = true;
      }

      e.preventDefault();
      e.stopPropagation();
    }

    let timeSinceLastTouchEnd = now - lastTouchEndEventTime;
    let shouldSkipPanning =
      multiTouchState.canIncline || // can't pan when incline is changed
      timeSinceLastTouchEnd < 300 || // don't pan if they just released a finger.
      (e.touches.length > 1 && multiTouchState.isUnknown());

    if ((dx !== 0 || dy !== 0) && !shouldSkipPanning) {
      // we are panning around
      camera.panByAbsoluteOffset(dx, dy);
      needRedraw = true;
    }

    if (needRedraw) {
      camera.redraw();
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
      rotateAnimation.stop(); // spin if necessary.
      panAnimation.stop();
    }

    if (e.touches.length === 0) {
      // Just in case we missed a finger in the map - clean it here.
      activeTouches.clear();
    }

    if (activeTouches.size === 0 && e.changedTouches.length === 1) {
      listening = false;
      stopDocumentTouchListeners();

      panAnimation.stop();

      if (timeSinceLastTouchEnd < 350 && now - lastMultiTouchEventTime > 350) {
        // Double tap?
        let newLastTouch = e.changedTouches[0];
        let dx = Math.abs(newLastTouch.clientX - lastTouch.clientX);
        let dy = Math.abs(newLastTouch.clientY - lastTouch.clientY);

        if (Math.hypot(dx, dy) < 30) {
          // Yes! They tapped close enough to the last tap. Zoom in:
          camera.zoomToClientCoordinates(lastTouch.clientX, lastTouch.clientY, 0.5, true);
        }
      }

      lastTouch = e.changedTouches[0];
    }
  }

  function startDocumentTouchListeners() {
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel ', handleTouchEnd, { passive: false });
  }

  function stopDocumentTouchListeners() {
    document.removeEventListener('touchmove', handleTouchMove, { passive: false });
    document.removeEventListener('touchend', handleTouchEnd, { passive: false });
    document.removeEventListener('touchcancel ', handleTouchEnd, { passive: false });
  }
}
