var config = {
  maxSingleTouchTime: 300, // ms
  singleTapDistanceSquared: 25 // within 5px we consider it as a single tap
}

export default onClap;

function onClap(element, callback, ctx) {
  var touchStartTime
  var startPos

  element.addEventListener('click', invokeHandler)

  element.addEventListener('touchend', handleTouchEnd)
  element.addEventListener('touchstart', handleTouchStart)

  return disposePrevHandler;

  function handleTouchStart(e) {
    var touches = e.touches

    if (touches.length === 1) {
      touchStartTime = new Date()
      startPos = {
        x: e.touches[0].pageX,
        y: e.touches[0].pageY
      }
    }
  }

  function handleTouchEnd(e) {
    // multitouch - ignore
    if (e.touches.length > 1) return

    // single touch - use time diference to determine if it was a touch or
    // a swipe
    var dt = new Date() - touchStartTime

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
    element.removeEventListener('click', invokeHandler)
    element.removeEventListener('touchend', handleTouchEnd)
    element.removeEventListener('touchstart', handleTouchStart)
  }

  function invokeHandler(e) {
    callback.call(ctx, e)
  }
}