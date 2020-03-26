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

export default function createTouchController(inputTarget) {
  let api = eventify({
    dispose
  });
  let listening = false;
  let activeTouches = new Map();

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
    if (first && second && third) {
      api.fire('altPan', dx, dy);
    } else if (first && second) {
      let dx = second.x - first.x;
      let dy = second.y - first.y;

      let lastDx = second.lastX - first.lastX;
      let lastDy = second.lastY - first.lastY;

      let zoomChange = Math.hypot(dx, dy) / Math.hypot(lastDx, lastDy) - 1;
      api.fire('zoomChange', cx, cy, zoomChange);

      let angle = Math.atan2(dy, dx) - Math.atan2(lastDy, lastDx); 
      api.fire('angleChange', angle)

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
