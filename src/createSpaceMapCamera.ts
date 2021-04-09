import { vec3, mat4 } from 'gl-matrix';
import animate from 'amator';
import createKineticAnimation from './animation/createKineticAnimation';
import createTouchController from './input/createTouchController';
import createKeyboardController from './input/createKeyboardController';
import createMouseController from './input/createMouseController'
import { WglScene } from './createScene';

export default function createSpaceMapCamera(scene: WglScene) {
  const drawContext = scene.getDrawContext();
  let view = drawContext.view;
  let rotationSpeed = Math.PI * 2;
  let inclinationSpeed = Math.PI * 1.618;

  let sceneOptions = scene.getOptions() || {};
  let allowRotation =
    sceneOptions.allowRotation === undefined ? true : !!sceneOptions.allowRotation;
  let allowPinchRotation =
    sceneOptions.allowPinchRotation === undefined ? allowRotation : !!sceneOptions.allowPinchRotation;

  let r = 1;
  // angle of rotation around Y axis, tracked from axis X to axis Z
  let minPhi = option(sceneOptions.minPhi, -Infinity);
  let maxPhi = option(sceneOptions.maxPhi, Infinity);
  // Rotate the camera so it looks to the central point in Oxy plane from distance r.
  let phi = clamp(-Math.PI / 2, minPhi, maxPhi);

  let planeNormal: vec3 = [0, 0, 1];

  // camera inclination angle. (Angle above Oxz plane)
  let minTheta = option(sceneOptions.minTheta, 0);
  let maxTheta = option(sceneOptions.maxTheta, Math.PI);
  let minR = option(sceneOptions.minZoom, -Infinity);
  let maxR = option(sceneOptions.maxZoom, Infinity);

  let theta = clamp(0, minTheta, maxTheta);

  let centerPointPosition = drawContext.center;
  let cameraPosition = view.position;

  let panAnimation = createKineticAnimation(getCenterPosition, setCenterPosition);
  let rotateAnimation = createKineticAnimation(getCenterRotation, setCenterRotation, {
    minVelocity: 1
  });

  const api = {
    dispose,
    setViewBox,
    panByAbsoluteOffset,
    slideCenterUpDown,
    rotateByAngle,
    rotateByAbsoluteOffset,
    zoomCenterByScaleFactor,
    zoomToClientCoordinates,
    redraw,
    allowRotation,
    allowPinchRotation,
    rotateAnimation,
    panAnimation,

    getRadius,
  };

  let inputTarget: HTMLElement | null = drawContext.canvas;
  if (typeof sceneOptions.inputTarget === 'string') {
    inputTarget =  document.querySelector(sceneOptions.inputTarget);
    if (!inputTarget) throw new Error('Cannot find input target: ' + sceneOptions.inputTarget);
  } else if (sceneOptions.inputTarget) {
    inputTarget = sceneOptions.inputTarget;
  }

  const keyboardController = createKeyboardController(inputTarget, api);
  const touchController = createTouchController(inputTarget, api);
  const mouseController = createMouseController(inputTarget, api);

  redraw();

  return api;

  function getRadius() {
    return r;
  }

  function setViewBox() {
    cameraPosition = view.position;
    r = Math.hypot(cameraPosition[2]);
    centerPointPosition[0] = cameraPosition[0];
    centerPointPosition[1] = cameraPosition[1];
    centerPointPosition[2] = 0;

    theta = clamp(0, minTheta, maxTheta);
    phi = clamp(-Math.PI / 2, minPhi, maxPhi);
    redraw();
  }

  function dispose() {
    rotateAnimation.cancel();
    panAnimation.cancel();
    touchController.dispose();
    keyboardController.dispose();
    mouseController.dispose();
  }

  function getZoomPlaneIntersection(clientX: number, clientY: number) {
    let viewPoint = scene.getSceneCoordinate(clientX, clientY);
    let spare: vec3 = [0, 0, 0];
    let ray = vec3.sub(spare, [viewPoint.x, viewPoint.y, viewPoint.z], cameraPosition);
    vec3.normalize(ray, ray);

    let denom = vec3.dot(planeNormal, ray);
    if (Math.abs(denom) > 1e-7) {
      let t =
        vec3.dot(
          vec3.sub([0, 0, 0], centerPointPosition, cameraPosition),
          planeNormal
        ) / denom;
      return vec3.scaleAndAdd([0, 0, 0], cameraPosition, ray, t);
    }
  }

  function rotateByAngle(angleChange: number, thetaChange: number) {
    phi = clamp(phi + angleChange, minPhi, maxPhi);
    theta = clamp(theta + thetaChange, minTheta, maxTheta);
  }

  function rotateByAbsoluteOffset(dx: number, dy: number) {
    if (!allowRotation) return;

    let ar = drawContext.width / drawContext.height;

    phi -= (rotationSpeed * dx) / drawContext.width;
    theta -= ((inclinationSpeed * dy) / drawContext.height) * ar;

    theta = clamp(theta, minTheta, maxTheta);
    phi = clamp(phi, minPhi, maxPhi);
  }

  function panByAbsoluteOffset(dx: number, dy: number) {
    let ar = drawContext.width / drawContext.height;
    // the idea behind this formula is this. We turn dx and dy to be
    // in a range from [0..1] (as a ratio of the screen width or height),
    // We know the FoV angle, we want to know how much of the distance we
    // traveled on the frustrum plane.
    // Distance to frustrum is `r`, thus half length of the frustrum plane
    // is `r * tan(fov/2)`, we now extend it to full length by performing `2 * `
    // and take the ratio in dx and dy scale.
    let fCoefficient = 2 * r * Math.tan(drawContext.fov / 2);
    let x = (ar * fCoefficient * dx) / (drawContext.width / drawContext.pixelRatio);
    let y = (fCoefficient * dy) / (drawContext.height / drawContext.pixelRatio); 
    moveCenterBy(x, -y); // WebGL Y is not the same as typical DOM Y.
  }

  function zoomToClientCoordinates(clientX: number, clientY: number, scaleFactor: number, shouldAnimate: any) {
    let p = getZoomPlaneIntersection(clientX, clientY);
    if (!p) {
      return;
    }
    let dx = p[0] - centerPointPosition[0];
    let dy = p[1] - centerPointPosition[1];

    if (shouldAnimate) {
      let from = { r, x: centerPointPosition[0], y: centerPointPosition[1] };
      let to = {
        r: clamp(r * (1 - scaleFactor), minR, maxR),
        x: from.x + dx * scaleFactor,
        y: from.y + dy * scaleFactor
      };
      animate(from, to, {
        step(values) {
          r = values.r;
          centerPointPosition[0] = values.x;
          centerPointPosition[1] = values.y;
          redraw();
        }
      });
    } else {
      zoomCenterByScaleFactor(scaleFactor, dx, dy);
      redraw();
    }
  }

  function moveCenterBy(dx: number, dy: number) {
    let cPhi = Math.cos(phi);
    let sPhi = Math.sin(phi);
    centerPointPosition[0] += cPhi * dy + sPhi * dx;
    centerPointPosition[1] += sPhi * dy - cPhi * dx;
  }

  function slideCenterUpDown(dz: number) {
    centerPointPosition[2] += dz * r * 0.001;
  }

  function getCenterPosition() {
    return {
      x: centerPointPosition[0],
      y: centerPointPosition[1],
      z: centerPointPosition[2]
    };
  }

  function getCenterRotation() {
    return {
      x: phi,
      y: theta,
      z: 0, // Should be r, but not used.
    };
  }

  function setCenterRotation(new_phi: number, new_theta: number) {
    theta = clamp(new_theta, minTheta, maxTheta);
    phi = clamp(new_phi, minPhi, maxPhi);
    redraw();
  }

  function setCenterPosition(x: number, y: number, z: number) {
    vec3.set(centerPointPosition, x, y, z);
    redraw();
  }

  function zoomCenterByScaleFactor(scaleFactor: number, dx: number, dy: number) {
    // `scaleFactor` defines whether we shrink the radius by multiplying it by something < 1
    // or increase it by multiplying by something > 1.
    let newR = clamp(r * (1 - scaleFactor), minR, maxR);
    if (newR === r) return;

    r = newR;
    // let's also move the center closer to the scrolling origin, this gives
    // better UX, similar to the one seen in maps: Map zooms into point under
    // mouse cursor.

    // How much should we move the center point?
    // (dx, dy) is current distance from the scroll point to the center. We should
    // keep it the same after we scaled!
    // dXScaled = dx * (1 - scaleFactor); // this is going to be the distance after we scaled.
    // newOffsetX = dx - dXScaled; // Thus we move the center by this amount. Which is the same as:
    // newOffsetX = dx - dx * (1 - scaleFactor) == dx * (1 - 1 + scaleFactor) == dx * scaleFactor;
    // Thus the formula below:
    centerPointPosition[0] += dx * scaleFactor;
    centerPointPosition[1] += dy * scaleFactor;
  }

  function redraw() {
    let newCameraPosition = getSpherical(r, theta, phi);

    // now we want to know what is an up vector? The idea is that its position
    // can also be represented in spherical coordinates of a sphere with slightly larger
    // radius. How much larger?
    // Just assume `up` vector length is 1, then the sphere  radius is sqrt(r * r + 1 * 1):
    let upVectorSphereRadius = Math.hypot(r, 1); // Note: may run into precision error here.

    // We know a hypotenuse of the new triangle and its size. The angle would be
    // `Math.acos(r/upVectorSphereRadius)`, and since we don't care whether up is above or below
    // the actual `theta`, we pick one direction and stick to it:
    let upVectorTheta = theta - Math.acos(r / upVectorSphereRadius);
    // The rotation angle around z axis (phi) is the same as the camera position.
    let upVector = getSpherical(upVectorSphereRadius, upVectorTheta, phi);

    // Finally we know both start of the upVector, and the end of the up vector, let's find the direction:
    vec3.sub(upVector, upVector, newCameraPosition);

    vec3.set(
      cameraPosition,
      newCameraPosition[0],
      newCameraPosition[1],
      newCameraPosition[2]
    );
    vec3.add(cameraPosition, cameraPosition, centerPointPosition);

    // I'd assume this could be simplified? I just don't know and haven't thought yet how:
    mat4.targetTo(view.matrix, cameraPosition, centerPointPosition, upVector);
    mat4.getRotation(view.rotation, view.matrix);
    view.update();

    scene.getRoot().scheduleMVPUpdate();
    scene.fire('transform', drawContext);
    scene.renderFrame();
  }
}

function getSpherical(r: number, theta: number, phi: number): vec3 {
  let z = r * Math.cos(theta);
  let x = r * Math.sin(theta) * Math.cos(phi);
  let y = r * Math.sin(theta) * Math.sin(phi);
  return [x, y, z];
}

function clamp(v: number, min: number, max: number) {
  if (v < min) v = min;
  if (v > max) v = max;
  return v;
}

function option(value: number | undefined, fallback: number) {
  if (value === undefined) return fallback;
  return value;
}
