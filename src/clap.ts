const config = {
  maxSingleTouchTime: 300, // ms
  singleTapDistanceSquared: 25 // within 5px we consider it as a single tap
}

type Point = {
  x: number;
  y: number;
}

type ClapHandler = {
  (e: MouseEvent) : void;
  (e: Touch) : void;
}

export default function onClap(element: Element, callback: ClapHandler, ctx?: any) {
  var touchStartTime = Date.now();
  let startPos: Point;

  element.addEventListener('click', invokeHandler as ClapHandler, {passive: false})

  element.addEventListener('touchend', handleTouchEnd, {passive: false})
  element.addEventListener('touchstart', handleTouchStart, {passive: false})

  return disposePrevHandler;

  function handleTouchStart(e: TouchEvent) {
    var touches = e.touches

    if (touches.length === 1) {
      touchStartTime = Date.now()
      startPos = {
        x: e.touches[0].pageX,
        y: e.touches[0].pageY
      }
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    // multitouch - ignore
    if (e.touches.length > 1) return

    // single touch - use time difference to determine if it was a touch or
    // a swipe
    var dt = Date.now() - touchStartTime

    // To long - ignore
    if (dt > config.maxSingleTouchTime) return
    let touch = e.changedTouches[0];

    var dx = touch.pageX - startPos.x
    var dy = touch.pageY - startPos.y

    if (dx * dx + dy * dy < config.singleTapDistanceSquared) {
      invokeHandler(touch)
    }
  }

  function disposePrevHandler() {
    element.removeEventListener('click', invokeHandler as ClapHandler)
    element.removeEventListener('touchend', handleTouchEnd)
    element.removeEventListener('touchstart', handleTouchStart)
  }

  function invokeHandler(e: MouseEvent | Touch) {
    callback.call(ctx, e)
  }
}