import makePanzoom from 'panzoom';
import eventify from 'ngraph.events';

import Element from './Element';
import onClap from './clap';

export default makeScene;

var pixelRatio = window.devicePixelRatio;

function makeScene(canvas) {
  var width;
  var height;
  var drawContext = { width: 0, height: 0 };

  var sceneRoot = new Element();

  var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  gl.clearColor(0, 0, 0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT)

  updateCanvasSize();
  
  var panzoom = makePanzoom(canvas, {
    zoomSpeed: 0.025,
    controller: wglPanZoom(canvas, sceneRoot)
  });

  var api = eventify({
    appendChild,
    getSceneCoordinate,
    getTransform,
    getRoot,
    removeChild,
    setViewBox,
    setClearColor,
    dispose,
  });

  var frameToken = requestAnimationFrame(frame);
  var disposeClick;

  listenToEvents();

  return api;

  function getRoot() {
    return sceneRoot;
  }

  function getTransform() {
    return sceneRoot.transform;
  }

  function setClearColor(r, g, b, a) {
    gl.clearColor(r, g, b, a)
  }

  function listenToEvents() {
    canvas.addEventListener('mousemove', onMouseMove);
    disposeClick = onClap(canvas, onMouseClick, this);

    window.addEventListener('resize', onResize, true);
  }

  function dispose() {
    canvas.removeEventListener('mousemove', onMouseMove);
    if (disposeClick) disposeClick();

    canvas.removeEventListener('click', onMouseClick);
    window.removeEventListener('resize', onResize, true);

    panzoom.dispose();
    sceneRoot.dispose();

    if (frameToken) {
      cancelAnimationFrame(frameToken);
      frameToken = null;
    }
  }

  function onResize() {
    updateCanvasSize();
  }

  function updateCanvasSize() {
    width = canvas.width = canvas.offsetWidth * pixelRatio
    height = canvas.height = canvas.offsetHeight * pixelRatio
    gl.viewport(0, 0, width, height);

    drawContext.width = width;
    drawContext.height = height;
    sceneRoot.worldTransformNeedsUpdate = true;
  }

  function onMouseClick(e) {
    var p = getSceneCoordinate(e.clientX, e.clientY);
    api.fire('click', {
      originalEvent: e,
      sceneX: p.x,
      sceneY: p.y,
    });
  }

  function onMouseMove(e) {
    var p = getSceneCoordinate(e.clientX, e.clientY);
    api.fire('mousemove', {
      originalEvent: e,
      sceneX: p.x,
      sceneY: p.y,
    });
  }

  function getSceneCoordinate(clientX, clientY) {
    var t = sceneRoot.transform;
    var canvasX = clientX * pixelRatio;
    var canvasY = clientY * pixelRatio;
    var x = (canvasX - t.dx)/t.scale;
    var y = (canvasY - t.dy)/t.scale;

    return {x, y};
  }

  function setViewBox(rect) {
    panzoom.showRectangle(rect)
  }

  function frame() {
    gl.clear(gl.COLOR_BUFFER_BIT)
    drawContext.wasDirty = sceneRoot.updateWorldTransform();
    sceneRoot.draw(gl, drawContext);
    frameToken = requestAnimationFrame(frame);
  }

  function appendChild(child, sendToBack) {
    sceneRoot.appendChild(child, sendToBack);
  }

  function removeChild(child) {
    sceneRoot.removeChild(child)
  }
}

function wglPanZoom(canvas, sceneRoot) {
  return {
      applyTransform(newT) {
        var transform = sceneRoot.transform;
        transform.dx = newT.x * pixelRatio;
        transform.dy = newT.y * pixelRatio; 
        transform.scale = newT.scale;
        sceneRoot.worldTransformNeedsUpdate = true;
      },

      getOwner() {
        return canvas
      }
    }
}
