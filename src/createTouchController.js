import eventify from "ngraph.events";

class TouchState {
  constructor(touch) {
    this.x = touch.clientX;
    this.y = touch.clientY;
    this.lastX = this.x;
    this.lastY = this.y;
  }

  move(touch) {
    this.lastX = this.x;
    this.lastY = this.y;

    this.x = touch.clientX;
    this.y = touch.clientY;
  }
}

// When two fingers touch the scene we want to "lock" interaction to either rotation
// or scaling. These constants represent "locked" state.
const UNKNOWN = 0; // here we don't know yet. Collect more input to make a decision
const ZOOM = 1;    // Locked to zooming.
const ROTATE = 2;  // Locked to rotation.

export default function createTouchController(inputTarget, inputState) {
  let api = eventify({dispose});

  let listening = false;
  let activeTouches = new Map();
  let {allowRotation, panAnimation} = inputState;

  // for two fingers mode detection we are using moving averages of total scaling
  // and total rotation. 
  let totalScale = 0;
  let totalRotation = 0;

  // To handle double taps:
  let doubleTapWaitHandler = 0;
  let doubleTapWait = false;

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
    if (e.touches.length === 1) {
      // only when one touch is active we want to have inertia
      panAnimation.start();
    }

    for (let i = 0; i < e.touches.length; ++i) {
      let touch = e.touches[i];
      activeTouches.set(touch.identifier, new TouchState(touch));
    }

    if (e.touches.length === 2) {
      totalScale = 0;
      totalRotation = 0;
    }

    e.stopPropagation();
    e.preventDefault();
  }

  function handleTouchMove(e) {

    let dx = 0; let dy = 0; // total difference between touches.
    let cx = 0; let cy = 0; // center of the touches
    let first, second, third; // fingers.

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
      else if (!third) third = state;
    }

    let changedCount = touches.length;
    dx /= changedCount; dy /= changedCount; 
    cx /= changedCount; cy /= changedCount;

    // todo: find something better than `first` and `second` tracking
    if (first && second && third && allowRotation) {
      api.fire('altPan', dx, dy);
    } else if (first && second) {
      let dx = second.x - first.x;
      let dy = second.y - first.y;

      let lastDx = second.lastX - first.lastX;
      let lastDy = second.lastY - first.lastY;

      let zoomChange = Math.hypot(dx, dy) / Math.hypot(lastDx, lastDy) - 1;
      let angle = Math.atan2(dy, dx) - Math.atan2(lastDy, lastDx); 

      totalScale = totalScale * 0.5 + 0.5 * Math.abs(zoomChange);
      totalRotation = totalRotation * 0.2 + 0.8 * Math.abs(angle);

      if (!allowRotation || totalScale > 0.01) api.fire('zoomChange', cx, cy, zoomChange);;
      if (allowRotation && totalRotation > 0.0025) api.fire('angleChange', angle);

      e.preventDefault();
      e.stopPropagation();
    }

    if (dx !== 0 || dy !== 0 ) {
      if (!(third && allowRotation)) {
        // we are panning around
        api.fire('pan', dx, dy);
      }
    }
  }

  function handleTouchEnd(e) {
    let touches = e.changedTouches;
    for (let i = 0; i < touches.length; ++i) {
      let touch = touches[i];
      activeTouches.delete(touch.identifier);
    }

    clearTimeout(doubleTapWaitHandler);

    if (activeTouches.size === 0) {
      listening = false;
      stopDocumentTouchListeners();

      panAnimation.stop();

      if (doubleTapWait) {
        // we were waiting for the second tap, and this is it!
        doubleTapWait = false;
        let lastTouch = e.changedTouches[0];
        api.fire('zoomChange', lastTouch.clientX, lastTouch.clientY, 0.5, true);
      } else {
        doubleTapWait = true;
        doubleTapWaitHandler = setTimeout(() => {
          doubleTapWait = false;
        }, 350);
      }
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