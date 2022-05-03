import {vec3, quat, ReadonlyVec3} from 'gl-matrix';

const halfToRad = .5 * Math.PI / 180;
const FRONT = [0, 0, -1] as ReadonlyVec3;

/**
 * This object tracks device orientation and applies it to a give object's quaternion (e.g. camera).
 *  See also: https://developers.google.com/web/fundamentals/native-hardware/device-orientation#device_coordinate_frame
 */
export default function createDeviceOrientationHandler(inputTarget, objectOrientation, updated, events) {
  if (!updated) updated = Function.prototype;

  inputTarget.addEventListener('touchstart', pauseDeviceOrientation);
  inputTarget.addEventListener('touchend', resetScreenAdjustment);
  let deviceOrientationEventName = 'deviceorientationabsolute';

  window.addEventListener('orientationchange', updateScreenOrientation);

  let sceneAdjustmentNeedsUpdate = true;
  const sceneAdjustment = [0, 0, 0, 1] as quat;
  const deviceOrientation = [0, 0, 0, 1] as quat;
  const screenOrientation = [0, 0, 0, 1] as quat;
  updateScreenOrientation();

  let api = {
    isEnabled: false,
    isAbsolute: true,
    useCurrentOrientation,
    dispose,
    enable,
  };

  return api;

  function enable(newEnabled: boolean) {
    api.isEnabled = newEnabled;

    if (api.isEnabled) {
      if (window.DeviceOrientationEvent !== undefined && 
        window.DeviceOrientationEvent.requestPermission !== undefined) {
        // We are in IOS? IOS doesn't have the deviceorientationabsolute for some reason.
        DeviceOrientationEvent.requestPermission().then(response => {
          if (response === 'granted') {
            deviceOrientationEventName = 'deviceorientation';
            window.addEventListener(deviceOrientationEventName as any, onDeviceOrientationChange);
          } else {
            api.isEnabled = false;
          }
          if (events) events.fire('device-orientation', api.isEnabled);
        }).catch(e => {
          api.isEnabled = false;
          if (events) events.fire('device-orientation', api.isEnabled);
        });
      } else {
        window.addEventListener(deviceOrientationEventName as any, onDeviceOrientationChange);
      }
    } else {
      pauseDeviceOrientation();
      if (events) events.fire('device-orientation', api.isEnabled);
    }
  }

  function useCurrentOrientation() {
    sceneAdjustmentNeedsUpdate = true;
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

    updateDeviceOrientationFromEuler(alpha, beta, gamma);

    // align with current object's orientation:
    if (sceneAdjustmentNeedsUpdate) {
      sceneAdjustmentNeedsUpdate = false;
      // Here we find an angle between device orientation and the object's orientation in XY plane
      let deviceFront = vec3.transformQuat([0, 0, 0], FRONT, deviceOrientation);
      let cameraFront = vec3.transformQuat([0, 0, 0], FRONT, objectOrientation);

      // Since we care only about 2D projection:
      let xyDot = deviceFront[0] * cameraFront[0] + deviceFront[1] * cameraFront[1];
      let deviceLength = Math.sqrt(deviceFront[0] * deviceFront[0] + deviceFront[1] * deviceFront[1]);
      let cameraLength = Math.sqrt(cameraFront[0] * cameraFront[0] + cameraFront[1] * cameraFront[1]);
      let angle = Math.acos(xyDot/(deviceLength*cameraLength))/2;
      // We care about the sign of the Z component of a cross product, as it gives us
      // direction of correct rotation to align the scene and device.

      // let sign = Math.sign(vec3.cross([], deviceFront, cameraFront)[2]);
      let sign = Math.sign(deviceFront[0] * cameraFront[1] - deviceFront[1] * cameraFront[0])

      // These two are zero:
      // sceneAdjustment[0] = 0;
      // sceneAdjustment[1] = 0;
      sceneAdjustment[2] = sign * Math.sin(angle);
      sceneAdjustment[3] = Math.cos(angle);
    }

    quat.mul(deviceOrientation, deviceOrientation, screenOrientation);
    // account for difference between lookAt and device orientation:
    quat.mul(objectOrientation, sceneAdjustment, deviceOrientation);
    updated();
  }

  function updateScreenOrientation() {
    // TODO: `window.orientation` is deprecated, might need to sue screen.orientation.angle,
    // but that is not supported by ios
    let orientation = (window.orientation || 0) as number;
    let screenAngle = -orientation * halfToRad;
    // We assume these two are zero:
    // screenOrientation[0] = 0;
    // screenOrientation[1] = 0;
    screenOrientation[2] = Math.sin(screenAngle);
    screenOrientation[3] = Math.cos(screenAngle);
  }

  function updateDeviceOrientationFromEuler(alpha, beta, gamma) {
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
    deviceOrientation[0] = sX * cY * cZ - cX * sY * sZ;
    deviceOrientation[1] = cX * sY * cZ + sX * cY * sZ;
    deviceOrientation[2] = cX * cY * sZ + sX * sY * cZ;
    deviceOrientation[3] = cX * cY * cZ - sX * sY * sZ;
  }

  function dispose() {
    inputTarget.removeEventListener('touchstart', pauseDeviceOrientation);
    inputTarget.removeEventListener('touchend', resetScreenAdjustment);
    window.removeEventListener('deviceorientationabsolute', onDeviceOrientationChange);
    window.removeEventListener('deviceorientation', onDeviceOrientationChange);
    window.removeEventListener('orientationchange', updateScreenOrientation);
  }

  function pauseDeviceOrientation(e?: UIEvent) {
    if (sceneAdjustmentNeedsUpdate) return;
    sceneAdjustmentNeedsUpdate = true;

    if (e) e.preventDefault();
    window.removeEventListener(deviceOrientationEventName as any, onDeviceOrientationChange);
  }

  function resetScreenAdjustment(e) {
    if (e.touches.length) return; // still touching. Wait till all are gone
    sceneAdjustmentNeedsUpdate = true;
    // just in case... to prevent leaking.
    if (api.isEnabled) {
      window.removeEventListener(deviceOrientationEventName as any, onDeviceOrientationChange);
      window.addEventListener(deviceOrientationEventName as any, onDeviceOrientationChange);
    }
  }
}