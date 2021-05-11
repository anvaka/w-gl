import {mat4, vec3, quat} from 'gl-matrix';

let spareVec3: vec3 = [0, 0, 0];
const xAxis = [1, 0, 0];
const yAxis = [0, 1, 0];
const zAxis = [0, 0, 1];


/**
 * View matrix allows you to place camera anywhere in the world
 */
export default class ViewMatrix {
  /**
   * This is our view matrix
   */
  matrix: mat4;

  /**
   * Inverse of the view matrix
   */
  cameraWorld: mat4;

  /**
   * Camera position in the world
   */
  position: vec3;

  /**
   * Camera orientation in the world
   */
  orientation: quat;

  /**
   * Where the camera is looking
   */
  center: vec3;

  constructor(viewMatrix?: mat4) {
    this.matrix = viewMatrix || mat4.create();
    // True position of the camera in the world:
    this.cameraWorld = mat4.invert(mat4.create(), this.matrix);

    this.position = [0, 0, 0];
    this.orientation = [0, 0, 0, 1];
    this.center = [0, 0, 0];

    this.deconstructPositionRotation();
  }

  lookAt(eye: number[], center: number[], up: number[]) {
    mat4.lookAt(this.cameraWorld, 
      eye as unknown as Float32Array, 
      center as unknown as Float32Array,
      up as unknown as Float32Array
    );
    this.deconstructPositionRotation();
    return this;
  }

  update() {
    mat4.fromRotationTranslation(this.cameraWorld, this.orientation, this.position);
    mat4.invert(this.matrix, this.cameraWorld);
    return this;
  }

  deconstructPositionRotation() {
    mat4.getTranslation(this.position, this.cameraWorld);
    mat4.getRotation(this.orientation, this.cameraWorld);
  }

  translateOnAxis(axis: number[], distance: number) {
    let translation = vec3.transformQuat(spareVec3, axis as unknown as Float32Array, this.orientation);
    vec3.scaleAndAdd(this.position, this.position, translation, distance);
    return this;
  } 

  translateX(distance: number) {
    return this.translateOnAxis(xAxis, distance);
  }

  translateY(distance: number) {
    return this.translateOnAxis(yAxis, distance);
  }

  translateZ(distance: number) {
    return this.translateOnAxis(zAxis, distance);
  }
}