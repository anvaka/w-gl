import {vec3, quat} from 'gl-matrix';

/**
 * This class tracks device orientation and applies it to a give object's quaternion (e.g. camera).
 *  See also: https://developers.google.com/web/fundamentals/native-hardware/device-orientation#device_coordinate_frame
 */
export default function createDeviceOrientationHandler(inputTarget, objectOrientation, updated) {
  if (!updated) updated = Function.prototype;

  inputTarget.addEventListener('touchstart', pauseDeviceOrientation);
  inputTarget.addEventListener('touchend', resetScreenAdjustment);
  let deviceOrientationEventName = 'deviceorientationabsolute';
  window.addEventListener(deviceOrientationEventName as any, onDeviceOrientationChange);

  let sceneRotationAdjustment: [number, number, number, number] | null;

  let api = {
    useCurrentOrientation,
    dispose,
    isAbsolute: true
  };

  return api;

  function useCurrentOrientation() {
    sceneRotationAdjustment = null;
  }

  function onDeviceOrientationChange(e: DeviceOrientationEvent) {
    const {alpha, beta, gamma} = e;
    if (e.absolute && alpha === null && beta === null && gamma === null) {
      // This means the device can never provide absolute values. We need to fallback
      // to relative device orientation which is not very accurate and prone to errors.
      // Consumers of this API better should allow users to switch to non-device-orientation based
      // means of movement
      window.removeEventListener('deviceorientationabsolute', onDeviceOrientationChange);
      window.addEventListener('deviceorientation', onDeviceOrientationChange);
      deviceOrientationEventName = 'deviceorientation';
      api.isAbsolute = false;
      return;
    }

    let q = getDeviceOrientation(alpha, beta, gamma);
    // align with current lookAt:
    if (!sceneRotationAdjustment) {
      // Here we find an angle between device orientation and the object's orientation i XY plane
      let deviceFront = vec3.normalize([], vec3.transformQuat([], [0, 0, -1], q));
      let cameraFront = vec3.normalize([], vec3.transformQuat([], [0, 0, -1], objectOrientation));

      // Since we care only about 2D projection:
      let xyDot = deviceFront[0] * cameraFront[0] + deviceFront[1] * cameraFront[1];
      let deviceLength = Math.sqrt(deviceFront[0] * deviceFront[0] + deviceFront[1] * deviceFront[1]);
      let cameraLength = Math.sqrt(cameraFront[0] * cameraFront[0] + cameraFront[1] * cameraFront[1]);
      let angle = Math.acos(xyDot/(deviceLength*cameraLength))/2;
      // all we care about is the sign of the Z component of a cross product, as it would give us
      // direction of correct rotation to align the scene and device.
      let sign = -Math.sign(vec3.cross([], cameraFront, deviceFront)[2]);
      sceneRotationAdjustment = [0, 0, sign * Math.sin(angle), Math.cos(angle)];
    }

    // TODO: `window.orientation` is deprecated, might need to sue screen.orientation.angle,
    // but that is not supported by ios
    let orientation = (window.orientation || 0) as number;
    let screenAngle = -(Math.PI * orientation / 180 )/2;
    let s = [0, 0, Math.sin(screenAngle), Math.cos(screenAngle)];
    quat.mul(q, q, s);
     // account for difference between lookAt and device orientation:
    quat.mul(objectOrientation, sceneRotationAdjustment, q);
    // quat.mul(objectOrientation, [0, 0, 0, 1], q);
    updated();
  }

  function getDeviceOrientation(alpha, beta, gamma ) {
    var halfToRad = .5 * Math.PI / 180;
    // These values can be nulls if device cannot provide them for some reason.
    var _x = beta  ? beta  * halfToRad : 0;
    var _y = gamma ? gamma * halfToRad : 0;
    var _z = alpha ? alpha * halfToRad : 0;

    var cX = Math.cos(_x);
    var cY = Math.cos(_y);
    var cZ = Math.cos(_z);
    var sX = Math.sin(_x);
    var sY = Math.sin(_y);
    var sZ = Math.sin(_z);

    // ZXY quaternion construction from Euler
    var x = sX * cY * cZ - cX * sY * sZ;
    var y = cX * sY * cZ + sX * cY * sZ;
    var z = cX * cY * sZ + sX * sY * cZ;
    var w = cX * cY * cZ - sX * sY * sZ;

    return [x, y, z, w];
  }


  function dispose() {
    inputTarget.removeEventListener('touchstart', pauseDeviceOrientation);
    inputTarget.removeEventListener('touchend', resetScreenAdjustment);
    window.removeEventListener('deviceorientationabsolute', onDeviceOrientationChange);
    window.removeEventListener('deviceorientation', onDeviceOrientationChange);
  }

  function pauseDeviceOrientation(e) {
    if (sceneRotationAdjustment === null) return;
    sceneRotationAdjustment = null;
    e.preventDefault();
    window.removeEventListener(deviceOrientationEventName as any, onDeviceOrientationChange);
  }

  function resetScreenAdjustment(e) {
    if (e.touches.length) return; // still touching. Wait till all are gone
    sceneRotationAdjustment = null;
    // just in case... to prevent leaking.
    window.removeEventListener(deviceOrientationEventName as any, onDeviceOrientationChange);
    window.addEventListener(deviceOrientationEventName as any, onDeviceOrientationChange);
  }

}