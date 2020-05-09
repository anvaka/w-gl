export default function createMouseController(inputTarget, camera) {
  let mouseX, mouseY, isAltMouseMove;
  let { allowRotation, panAnimation, rotateAnimation } = camera;

  inputTarget.addEventListener('wheel', handleWheel, { passive: false });
  inputTarget.addEventListener('mousedown', handleMouseDown, {
    passive: false
  });
  inputTarget.addEventListener('dblclick', handleDoubleClick, {
    passive: false
  });

  return {dispose};

  function dispose() {
    inputTarget.removeEventListener('wheel', handleWheel, { passive: false });
    inputTarget.removeEventListener('mousedown', handleMouseDown, { passive: false });
    inputTarget.removeEventListener('dblclick', handleDoubleClick, { passive: false });

    // TODO: Should I be more precise here?
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  function handleMouseDown(e: MouseEvent) {
    let isLeftButton =
      (e.button === 1 && window.event !== null) || e.button === 0;
    if (!isLeftButton) return;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    mouseX = e.clientX;
    mouseY = e.clientY;
    isAltMouseMove = e.altKey && allowRotation;

    panAnimation.cancel();
    rotateAnimation.cancel();

    if (isAltMouseMove) {
      rotateAnimation.start();
    } else {
      panAnimation.start();
    }
  }

  function onMouseMove(e: MouseEvent) {
    let dy = e.clientY - mouseY;
    let dx = e.clientX - mouseX;

    if (isAltMouseMove) {
      camera.rotateByAbsoluteOffset(dx, dy);
    } else {
      camera.panByAbsoluteOffset(dx, dy);
    }

    mouseX = e.clientX;
    mouseY = e.clientY;

    camera.redraw();
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (isAltMouseMove) {
      rotateAnimation.stop();
    } else {
      panAnimation.stop();
    }
  }

  function handleDoubleClick(e: MouseEvent) {
    camera.zoomToClientCoordinates(e.clientX, e.clientY, 0.5, true);
    e.preventDefault();
    e.stopPropagation();
  }

  function handleWheel(e) {
    // in windows FF it scrolls differently. Want to have the same speed there:
    let deltaFactor = e.deltaMode > 0 ? 100 : 1;
    let scaleFactor = getScaleFactorFromDelta(-e.deltaY * deltaFactor);
    camera.zoomToClientCoordinates(e.clientX, e.clientY, scaleFactor);

    e.preventDefault();
  }

  function getScaleFactorFromDelta(delta: number) {
    return Math.sign(delta) * Math.min(0.25, Math.abs(delta / 128));
  }
}