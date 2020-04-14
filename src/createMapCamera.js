import makePanzoom from 'panzoom';
import {quat} from 'gl-matrix';

export default function createMapCamera(scene, drawContext) {
  var wglController = wglPanZoom(scene, drawContext);
  let canvas = drawContext.canvas;
  canvas.style.outline = 'none';
  canvas.setAttribute('tabindex', 0);

  
  const api = ({
    dispose,
    setViewBox,
    getPanzoom() { return panzoom; },
    setSpeed(speed) {
      panzoom.setZoomSpeed(speed);
    }
  });

  const panzoom = makePanzoom(canvas, {
    controller: wglController
  });

  return api;

  function dispose() {
    panzoom.dispose()
  }

  function setViewBox(rect) {
    const dx = (rect.left + rect.right)/2;
    const dy = (rect.top + rect.bottom)/2;
    const dpr = scene.getPixelRatio();
    const nearHeight = dpr * Math.max((rect.top - rect.bottom)/2, (rect.right - rect.left) / 2);
    let zScale = drawContext.height / ( 2 * nearHeight * dpr);

    // TODO: Probably best to open the API on panzoom end.
    let t = panzoom.getTransform();
    t.scale = Math.tan(drawContext.fov / 2) / nearHeight;
    t.x = -dx * zScale;
    t.y = dy * zScale;
    wglController.applyTransform(t);
  }
}

function wglPanZoom(scene, drawContext) {
  var z = 1;
  var fov = drawContext.fov;
  var controller = {
    applyTransform(newT) {
      z = 1 / newT.scale;
      let zScale = 2 * Math.tan( fov / 2 ) * z
      zScale = drawContext.height / ( zScale * scene.getPixelRatio());

      let dx = -newT.x / zScale;
      let dy = newT.y / zScale;
      let view = drawContext.view;

      view.position[0] = dx;
      view.position[1] = dy;
      view.position[2] = z;
      quat.set(view.rotation, 0, 0, 0, 1);
      view.update();

      scene.fire('transform', drawContext);
      scene.renderFrame()
    },

    getOwner() {
      return drawContext.canvas
    },

    getScreenCTM() {
      const dpr = 1/scene.getPixelRatio();
      return {
        a: 1,
        d: 1,
        e: dpr * drawContext.width / 2,
        f: dpr * drawContext.height / 2
      }
    }
  }

  return controller;
  }