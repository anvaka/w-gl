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

export default function createTouchController(inputTarget, allowRotation) {
  let api = eventify({dispose});

  let listening = false;
  let activeTouches = new Map();
  let twoTouchMode = UNKNOWN;

  // for two fingers mode detection we are using moving averages of total scaling
  // and total rotation. As soon as either of them exceeds a threshold, we lock the 
  // `twoTouchMode` to either scaling or rotation.
  let totalScale = 0;
  let totalRotation = 0;

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

    api.fire('touchstart', e.touches);

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

      totalScale = totalScale * 0.2 + 0.8 * Math.abs(zoomChange);
      totalRotation = totalRotation * 0.2 + 0.8 * Math.abs(angle);

      if (twoTouchMode === UNKNOWN) {
        if (!allowRotation || totalScale > 0.01) twoTouchMode = ZOOM;
        else if (totalRotation > 0.0025) twoTouchMode = ROTATE;
      }

      if (twoTouchMode === ZOOM) api.fire('zoomChange', cx, cy, zoomChange);
      if (twoTouchMode === ROTATE) api.fire('angleChange', angle)

      e.preventDefault();
      e.stopPropagation();
    }

    if (dx !== 0 || dy !== 0) {
      // we are panning around
      api.fire('pan', dx, dy);
    }
  }

  function handleTouchEnd(e) {
    let touches = e.changedTouches;
    for (let i = 0; i < touches.length; ++i) {
      let touch = touches[i];
      activeTouches.delete(touch.identifier);
    }

    if (activeTouches.size === 0) {
      listening = false;
      stopDocumentTouchListeners();
      api.fire('touchend', e.touches);
    }
    if (activeTouches.size < 2) {
      twoTouchMode = UNKNOWN;
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
