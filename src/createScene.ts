import eventify, { EventedType } from 'ngraph.events';

import Element from './Element';
import onClap from './clap';
import {mat4, vec4, vec3, quat} from 'gl-matrix';
import {setMatrixArrayType} from 'gl-matrix/esm/common';
import ViewMatrix from './ViewMatrix';
import createSpaceMapCamera from './createSpaceMapCamera';
import {EventCallback, EventKey} from 'ngraph.events';

// Float32 is not enough for large scenes.
setMatrixArrayType(Float64Array);

type Size = {
  width: number;
  height: number;
}

type Rectangle = {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

type WGLSceneOptions = {
  /**
   * Default device pixel ratio to be used for scene. If non specified
   * window.devicePixelRatio is used.
   */
  devicePixelRatio?: number;

  /**
   * Indicates whether user can rotate the scene (either with an `alt` key or with touch/keyboard)
   * 
   * `true` by default.
   */
  allowRotation?: boolean;

  /**
   * The smallest angle of rotation around Y axis, tracked from axis X to axis Z.
   * 
   * `-Infinity` by default;
   */
  minPhi?: number;

  /**
   * The largest angle of rotation around Y axis, tracked from axis X to axis Z.
   * 
   * `Infinity` by default;
   */
  maxPhi?: number;

  /**
   * The smallest camera inclination angle in radians. (Angle above Oxz plane)
   */
  minTheta?: number;

  /**
   * The largest camera inclination angle in radians. (Angle above Oxz plane)
   */
  maxTheta?: number;

  /**
   * Size of the scene;
   */
  size?: Size;

  /**
   * WebGL context options. 
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
   */
  wglContextOptions?: any

  /**
   * Field of view angle defined in radians.
   */
  fov?: number

  /**
   * Near bound of the frustum
   */
  near?: number

  /**
   * far bound of the frustum
   */
  far?: number

  /**
   * Don't use this - this is experimental bit.
   */
  camera?: any
}

/**
 * A context that is passed to individual rendering programs of the w-gl
 */
export interface DrawContext {
  width: number;
  height: number;
  fov: number;
  pixelRatio: number;
  canvas: HTMLCanvasElement;
  projection: mat4;
  view: ViewMatrix;
  center: vec3;
}

export interface SceneCoordinate {
  x: number
  y: number
  z: number
}


export interface WglScene extends EventedType {
  /**
   * Given `clientX` and `clientY` of a mouse coordinate, return corresponding coordinate
   * in the rendered world.
   */
  getSceneCoordinate(clientX: number, clientY: number): SceneCoordinate;

  /**
   * Appends a new child to the scene
   */
  appendChild: (child: Element, sendToBack?: boolean) => void;

  /**
   * Returns current options passed during scene creation.
   */
  getOptions: () => WGLSceneOptions;

  /**
   * Requests the scene to schedule a re-render. If `immediate` is true, then rendering
   * happens synchronously inside the call;
   */
  renderFrame: (immediate?: boolean) => void;

  /**
   * Returns the root element of the scene. Root element is a tree entry point of all things
   * that can be rendered on this scene.
   */
  getRoot: () => Element;

  /**
   * Returns four element-array of the WebGL's clear color [r, g, b, a]. Each element is
   * between `0` and `1`;
   */
  getClearColor: () => [number, number, number, number];

  /**
   * Returns current draw context (thing passed to every element during render loop)
   */
  getDrawContext: () => DrawContext

  /**
   * Get current pixel ratio
   */
  getPixelRatio: () => number

  /**
   * Returns rendering context.
   */
  getGL: () => WebGLRenderingContext
}


export default function createScene(canvas: HTMLCanvasElement, options: WGLSceneOptions = {}): WglScene {
  let width: number;
  let height: number;

  let pixelRatio = options.devicePixelRatio || window.devicePixelRatio;
  let wglContextOptions = options.wglContextOptions;

  let gl = (canvas.getContext('webgl', wglContextOptions) || 
    canvas.getContext('experimental-webgl', wglContextOptions)
  ) as WebGLRenderingContext;

  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT)

  let frameToken = 0;
  let sceneRoot = new Element();
  let hasMouseClickListeners = false;
  let hasMouseMoveListeners = false;

  let view = new ViewMatrix();
  let projection = mat4.create();
  let inverseProjection = mat4.create();
  let fov = options.fov === undefined ? Math.PI * 45 / 180 : options.fov;
  let near = options.near === undefined ? 0.01 : options.near;
  let far = options.far === undefined ? Infinity : options.far;

  const drawContext: DrawContext = { 
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio,
    canvas,
    projection,
    view,
    fov,
    center: [0, 0, 0],
 };

  updateCanvasSize();

  let api = eventify({
    appendChild,
    getSceneCoordinate,
    getClientCoordinate,
    getTransform,
    getRoot,
    getGL,
    removeChild,
    setViewBox,
    setClearColor,
    getClearColor,
    clear,
    dispose,
    renderFrame,

    getPixelRatio,
    setPixelRatio,

    getCamera,
    setCamera,

    getDrawContext,
    getOptions
  });

  let realOn = api.on;
  api.on = trapOn;

  sceneRoot.bindScene(api);

  let cameraController = (options.camera || createSpaceMapCamera)(api, drawContext);

  let disposeClick: Function;

  listenToEvents();

  renderFrame();

  return api;

  function getPixelRatio() {
    return pixelRatio;
  }

  function getDrawContext() {
    return drawContext;
  }

  function getOptions() {
    return options;
  }

  function setPixelRatio(newPixelRatio: number) {
    pixelRatio = newPixelRatio;
    drawContext.pixelRatio = pixelRatio;
    updateCanvasSize();
  }

  function getGL() {
    return gl;
  }

  function getRoot() {
    return sceneRoot;
  }

  function setCamera(createCamera: Function) {
    if (cameraController) {
      cameraController.dispose();
    }
    cameraController = createCamera(api, drawContext);
  }

  function getCamera() {
    return cameraController;
  }

  function getTransform() {
    return sceneRoot.model;
  }

  function setClearColor(r: number, g: number, b: number, a: number) {
    gl.clearColor(r, g, b, a)
  }

  function getClearColor() {
    // [r, g, b, a]
    return gl.getParameter(gl.COLOR_CLEAR_VALUE);
  }

  function listenToEvents() {
    canvas.addEventListener('mousemove', onMouseMove);
    disposeClick = onClap(canvas, onMouseClick);
    window.addEventListener('resize', onResize, true);
  }

  function dispose() {
    canvas.removeEventListener('mousemove', onMouseMove);


    if (disposeClick) disposeClick();

    window.removeEventListener('resize', onResize, true);

    cameraController.dispose();
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
    mat4.perspective(projection, fov, width/height, near, far);

    inverseProjection = mat4.invert(mat4.create(), projection);
    renderFrame();
  }

  function onMouseClick(e: MouseEvent | Touch) {
    if (!hasMouseClickListeners) return;
    var p = getSceneCoordinate(e.clientX, e.clientY);
    if (!p) return; // need to zoom in!

    api.fire('click', {
      originalEvent: e,
      x: p.x,
      y: p.y,
    })
  }

  function onMouseMove(e: MouseEvent) {
    if (!hasMouseMoveListeners) return;

    var p = getSceneCoordinate(e.clientX, e.clientY);
    if (!p) return;

    api.fire('mousemove', {
      originalEvent: e,
      x: p.x,
      y: p.y,
      z: p.z,
    });
  }

  function getSceneCoordinate(clientX: number, clientY: number) {
    // TODO: This is not optimized by any means.
    var dpr = api.getPixelRatio();
    let clipSpaceX = (dpr * clientX / width) * 2 - 1;
    let clipSpaceY = (1 - dpr * clientY / height) * 2 - 1;

    let spare: vec4 = [0, 0, 0, 0];
    let mx = vec4.transformMat4(spare, [clipSpaceX, clipSpaceY, 0, 1], inverseProjection);
    mx[0] /= mx[3]; mx[1] /= mx[3]; mx[2] /= mx[3]; mx[3] /= mx[3];
    vec4.transformMat4(mx, mx, view.cameraWorld);

    vec3.sub(mx, mx, view.position);
    vec3.normalize(mx, mx);
    // let l = Math.hypot(mx[0], mx[1], mx[2]);
    // mx[0] /= l; mx[1] /= l; mx[2] /= l;
    var targetZ = 0;

    // TODO: This is likely not going to work for all cases.
    var distance = (targetZ - view.position[2]) / mx[2];
    if (mx[2] > 0) {
      // ray shoots backwards.

    }

    vec4.scaleAndAdd(mx, view.position as vec4, mx, distance)

    // TODO: Return mx?
    return {
      x: mx[0],
      y: mx[1],
      z: mx[2]
    }
  }

  function getClientCoordinate(sceneX: number, sceneY: number, sceneZ = 0) {
    // TODO: this is not optimized either.
    var mvp = mat4.multiply(mat4.create(), projection, view.matrix)
    mat4.multiply(mvp, mvp, sceneRoot.model);
    var coordinate = vec4.transformMat4([], [sceneX, sceneY, sceneZ, 1], mvp);

    var dpr = api.getPixelRatio();
    var x = width * (coordinate[0]/coordinate[3] + 1) * 0.5/dpr;
    var y = height * (1 - (coordinate[1]/coordinate[3] + 1) * 0.5)/dpr;
    return {x, y};
  }

  function setViewBox(rect: Rectangle) {
    const dpr = drawContext.pixelRatio;
    const nearHeight = dpr * Math.max((rect.top - rect.bottom) / 2, (rect.right - rect.left) / 2);
    const {position, rotation} = drawContext.view;
    position[0] = (rect.left + rect.right)/2;
    position[1] = (rect.top + rect.bottom)/2;
    position[2] = nearHeight / Math.tan(drawContext.fov / 2);
    quat.set(rotation as unknown as vec4, 0, 0, 0, 1);

    drawContext.view.update();
    if (cameraController.setViewBox) {
      cameraController.setViewBox(rect)
    }
  }

  function renderFrame(immediate = false) {
    if (immediate) {
      return frame();
    }

    if (!frameToken) frameToken = requestAnimationFrame(frame)
  }

  function frame() {
    gl.clear(gl.COLOR_BUFFER_BIT)
    sceneRoot.updateWorldTransform();
    sceneRoot.draw(gl, drawContext);
    frameToken = 0;
  }

  function clear() {
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  function appendChild(child: Element, sendToBack = false) {
    sceneRoot.appendChild(child, sendToBack);
    api.fire('append-child', child); // TODO: might need to add support for bubbling?
  }

  function removeChild(child: Element) {
    sceneRoot.removeChild(child)
    api.fire('remove-child', child);
  }

  function trapOn(eventName: EventKey, callback: EventCallback, context?: any) {
    if (eventName === 'click') hasMouseClickListeners = true;
    if (eventName === 'mousemove') hasMouseMoveListeners = true;

    return realOn(eventName, callback, context);
  }
}
