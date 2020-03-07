import {mat4, vec3} from 'gl-matrix';

let spareVec3 = [0, 0, 0];
const xAxis = [1, 0, 0];
const yAxis = [0, 1, 0];
const zAxis = [0, 0, 1];

/**
 * View matrix allows you to place camera anywhere in the world
 */
export default class ViewMatrix {
  constructor(viewMatrix) {
    this.matrix = viewMatrix || mat4.create();
    // True position of the camera in the world:
    this.cameraWorld = mat4.invert(mat4.create(), this.matrix);

    this.position = [0, 0, 0];
    this.rotation = [0, 0, 0, 1];

    this.deconstructPositionRotation();
  }

  lookAt(eye, center, up) {
    mat4.lookAt(this.cameraWorld, eye, center, up);
    this.deconstructPositionRotation();
    return this;
  }

  update() {
    mat4.fromRotationTranslation(this.cameraWorld, this.rotation, this.position);
    mat4.invert(this.matrix, this.cameraWorld);
    return this;
  }

  deconstructPositionRotation() {
    mat4.getTranslation(this.position, this.cameraWorld);
    mat4.getRotation(this.rotation, this.cameraWorld);
  }

  translateOnAxis(axis, distance) {
    let translation = vec3.transformQuat(spareVec3, axis, this.rotation);
    vec3.scaleAndAdd(this.position, this.position, translation, distance);
    return this;
  } 

  translateX(distance) {
    return this.translateOnAxis(xAxis, distance);
  }

  translateY(distance) {
    return this.translateOnAxis(yAxis, distance);
  }

  translateZ(distance) {
    return this.translateOnAxis(zAxis, distance);
  }
}