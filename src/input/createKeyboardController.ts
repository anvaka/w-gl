export default function createKeyboardController(inputTarget: HTMLElement, camera) {
  let frameHandle = 0;

  let vx = 0, vy = 0, vz = 0; // velocity of the panning
  let dx = 0, dy = 0, dz = 0; // actual offset of the panning
  let dPhi = 0, vPhi = 0; // rotation 
  let dRadius = 0, vRadius = 0; // radius
  let dIncline = 0, vIncline = 0; // inclination

  listenToEvents();

  return { dispose };

  function listenToEvents() {
    if (!inputTarget.getAttribute('tabindex')) {
      inputTarget.setAttribute('tabindex', '0');
    }
    inputTarget.addEventListener('keydown', handleKeyDown);
    inputTarget.addEventListener('keyup', handleKeyUp);
  }

  function dispose() {
    inputTarget.removeEventListener('keydown', handleKeyDown);
    inputTarget.removeEventListener('keyup', handleKeyUp);
    cancelAnimationFrame(frameHandle);
  }

  function frame() {
    frameHandle = 0;
    let dampFactor = 0.9;
    let needRedraw = false;

    dx = clampTo(dx * dampFactor + vx, 0.5, 0);
    dy = clampTo(dy * dampFactor + vy, 0.5, 0);
    dz = clampTo(dz * dampFactor + vz, 0.5, 0);
    if (dx || dy) {
      camera.panByAbsoluteOffset(dx, dy);
      needRedraw = true;
    }
    if (dz) {
      camera.slideCenterUpDown(dz);
      needRedraw = true;
    }

    dPhi = clampTo((dPhi * dampFactor + vPhi/2), Math.PI/360, 0);
    dIncline = clampTo((dIncline * dampFactor + vIncline/6), Math.PI/360, 0);
    if (dPhi || dIncline) {
      camera.rotateByAbsoluteOffset(dPhi, dIncline);
      needRedraw = true;
    }

    dRadius = clampTo((dRadius * 0.7 + vRadius), 0.5, 0);
    if (dRadius) {
      let scaleFactor = Math.sign(dRadius) * 0.025;
      camera.zoomCenterByScaleFactor(scaleFactor, 0, 0);
      needRedraw = true;
    }

    if (needRedraw) {
      camera.redraw();
      processNextInput();
    }
  }

  function processNextInput() {
    if (frameHandle) return; // already scheduled
    frameHandle = requestAnimationFrame(frame);
  }

  function handleKeyDown(e: KeyboardEvent) {
    onKey(e, 1);
  }

  function handleKeyUp(e: KeyboardEvent) {
    onKey(e, 0);
  }

  function onKey(e: KeyboardEvent, isDown: number) {
    if (isModifierKey(e)) return;

    // TODO: implement plane move on the z up/down?
    switch (e.which) {
      case 81: // q - roll right
        vPhi = -isDown;
        break;
      case 69: // e - roll left
        vPhi = isDown;
        break;
      case 187: // = - zoom in
        vRadius = isDown;
        break;
      case 189: // - - zoom in
        vRadius = -isDown;
        break;
      case 82: // r - inline up
        vIncline = isDown;
        break;
      case 70: // f - incline down
        vIncline = -isDown;
        break;
      case 37: // ←
      case 65: // a
        vx = isDown;
        break;
      case 39: // →
      case 68: // d
        vx = -isDown;
        break;
      case 38: // ↑
      case 87: // w
        vy = isDown;
        break;
      case 40: // ↓
      case 83: // d
        vy = -isDown;
        break;
      case 71: // g
        vz = -isDown;
        break;
      case 84: // t
        vz = isDown;
        break;
    }
    processNextInput();
  }
}

function isModifierKey(e) {
  return e.altKey || e.ctrlKey || e.metaKey;
}

function clampTo(x, threshold, clampValue) {
  return Math.abs(x) < threshold ? clampValue: x;
}
