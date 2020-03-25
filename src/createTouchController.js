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
      api.fire('touchstart');
      listening = true;
    }

    for (let i = 0; i < e.touches.length; ++i) {
      let touch = e.touches[i];
      activeTouches.set(touch.identifier, new TouchState(touch));
    }

    e.stopPropagation();
    e.preventDefault();
  }

  function handleTouchMove(e) {
    let touches = e.changedTouches;
    let changedCount = 0;
    let dx = 0; let dy = 0; // total difference between touches.
    let cx = 0; let cy = 0; // center of the touches
    let first, second;

    for (let i = 0; i < touches.length; ++i) {
      let touch = touches[i];
      let state = activeTouches.get(touch.identifier);
      if (!state) {
        // We never tracked this touch. Ignore it.
        continue;
      }
      state.move(touch);

      cx += state.x; cy += state.y;

      dx += state.x - state.lastX;
      dy += state.y - state.lastY;

      changedCount += 1;
      if (!first) first = state;
      else if (!second) second = state;
    }

    dx /= changedCount; dy /= changedCount; 
    cx /= changedCount; cy /= changedCount;

    if (first && second) {
      // todo: find something better than this?
      let sx = Math.hypot(first.x - second.x, first.y - second.y) /
        Math.hypot(first.lastX - second.lastX, first.lastY - second.lastY);
      api.fire('zoom', cx, cy, sx - 1);
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
      api.fire('touchend');
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
