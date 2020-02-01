import makePanzoom from 'panzoom';
import eventify from 'ngraph.events';

import Element from './Element';
import onClap from './clap';

export default makeScene;

function makeScene(canvas, options) {
  var width;
  var height;
  var drawContext = { width: 0, height: 0 };
  var pixelRatio = window.devicePixelRatio;
  if (!options) options = {};

  var wglContextOptions = options.wglContext;

  var gl = canvas.getContext('webgl', wglContextOptions) || canvas.getContext('experimental-webgl', wglContextOptions);

  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  gl.clearColor(0, 0, 0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT)

  var frameToken = 0;
  var sceneRoot = new Element();
  updateCanvasSize();

  var api = eventify({
    appendChild,
    getSceneCoordinate,
    getClientCoordinate,
    getTransform,
    getRoot,
    getGL,
    removeChild,
    setViewBox,
    setClearColor,
    clear,
    dispose,
    renderFrame,

    getPixelRatio,
    setPixelRatio,

    getPanzoom
  });

  var wglController = wglPanZoom(canvas, sceneRoot, api);
  canvas.style.outline = 'none';
  canvas.setAttribute('tabindex', 0);

  var panzoom = makePanzoom(canvas, {
    controller: wglController
  });

  sceneRoot.bindScene(api);

  var disposeClick;
  listenToEvents();

  renderFrame();

  return api;

  function getPixelRatio() {
    return pixelRatio;
  }

  function setPixelRatio(newPixelRatio) {
    pixelRatio = newPixelRatio;
    updateCanvasSize();
  }

  function getGL() {
    return gl;
  }

  function getRoot() {
    return sceneRoot;
  }

  function getPanzoom() {
    return panzoom;
  }

  function getTransform() {
    return sceneRoot.transform;
  }

  function setClearColor(r, g, b, a) {
    gl.clearColor(r, g, b, a)
  }

  function listenToEvents() {
    canvas.addEventListener('mousemove', onMouseMove);

    panzoom.on('transform', onTransform);

    disposeClick = onClap(canvas, onMouseClick, this);

    window.addEventListener('resize', onResize, true);
  }

  function dispose() {
    canvas.removeEventListener('mousemove', onMouseMove);

    panzoom.off('transform', onTransform);

    if (disposeClick) disposeClick();

    window.removeEventListener('resize', onResize, true);

    panzoom.dispose();
    sceneRoot.dispose();

    if (frameToken) {
      cancelAnimationFrame(frameToken);
      frameToken = 0;
    }
  }

  function onResize() {
    updateCanvasSize();
  }

  function updateCanvasSize() {
    if (options.size) {
      // Fixed size canvas doesn't update. We assume CSS does the scaling.
      width = canvas.width = options.size.width;
      height = canvas.height = options.size.height;
    } else {
      width = canvas.width = canvas.offsetWidth * pixelRatio;
      height = canvas.height = canvas.offsetHeight * pixelRatio;
    }

    gl.viewport(0, 0, width, height);

    drawContext.width = width;
    drawContext.height = height;
    sceneRoot.worldTransformNeedsUpdate = true;
    renderFrame();
  }

  function onTransform(e) {
    api.fire('transform', e);
  }

  function onMouseClick(e) {
    var p = getSceneCoordinate(e.clientX, e.clientY);
    api.fire('click', {
      originalEvent: e,
      sceneX: p.x,
      sceneY: p.y,
    })
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

  function getClientCoordinate(sceneX, sceneY) {
    var t = sceneRoot.transform;

    var x = (sceneX * t.scale + t.dx)/pixelRatio;
    var y = (sceneY * t.scale + t.dy)/pixelRatio;

    return {x: x, y: y};
  }

  function setViewBox(rect) {
    panzoom.showRectangle(rect, {
      width: width,
      height: height
    });
    var newT = panzoom.getTransform();
    wglController.applyTransform(newT);
  }

  function renderFrame(immediate) {
    if (immediate) {
      return frame();
    }

    if (!frameToken) frameToken = requestAnimationFrame(frame)
  }

  function frame() {
    gl.clear(gl.COLOR_BUFFER_BIT)
    drawContext.wasDirty = sceneRoot.updateWorldTransform();
    sceneRoot.draw(gl, drawContext);
    frameToken = 0;
  }

  function clear() {
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  function appendChild(child, sendToBack) {
    sceneRoot.appendChild(child, sendToBack);
  }

  function removeChild(child) {
    sceneRoot.removeChild(child)
  }

  function wglPanZoom(canvas, sceneRoot, scene) {
    var controller = {
      applyTransform(newT) {
        var transform = sceneRoot.transform;
        var pixelRatio = scene.getPixelRatio();

        transform.dx = newT.x * pixelRatio;
        transform.dy = newT.y * pixelRatio;
        transform.scale = newT.scale;
        sceneRoot.worldTransformNeedsUpdate = true;
        scene.renderFrame()
      },

      getOwner() {
        return canvas
      }
    }

    if (options.size){
      controller.getScreenCTM = customSizeCTM;
    }

    return controller;

    function customSizeCTM() {
        return {
          a: (options.size.width/canvas.offsetWidth), //scale x
          d: (options.size.height/canvas.offsetHeight), //scale y
          e: 0,
          f: 0
        }
      }
  }
}
