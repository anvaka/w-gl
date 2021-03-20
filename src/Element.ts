import {mat4} from 'gl-matrix';
import {WglScene, DrawContext} from './createScene';

/**
 * Represents a single element in the scene tree
 */
export default class Element {
  children: Element[];

  parent: Element | null;

  /**
   * Transforms local coordinate system to parent coordinate system
   */
  model: mat4;

  /**
   * Cumulative transform to webgl coordinate system.
   */
  worldModel: mat4;

  /**
   * Model * view * projection matrix
   */
  modelViewProjection: mat4;

  worldTransformNeedsUpdate: boolean;

  /**
   * If true, the modelViewProjection matrix is updated before draw() call
   */
  modelViewProjectionNeedsUpdate: boolean;

  type: string;

  scene: WglScene | null;

  constructor() {
    this.children = [];
    this.model = mat4.create();
    this.worldModel = mat4.create();
    this.modelViewProjection = mat4.create();
    this.worldTransformNeedsUpdate = true;
    this.modelViewProjectionNeedsUpdate = true;

    this.type = 'Element';
    this.scene = null;
    this.parent = null;
  }

  appendChild(child: Element, sendToBack = false) {
    child.parent = this;
    if (sendToBack) {
      // back of z-index
      this.children.unshift(child);
    } else {
      this.children.push(child);
    }
    if (child.bindScene) {
      child.bindScene(this.scene);
    }

    if (this.scene) this.scene.renderFrame();
  }

  insertChildAfter(child: Element, after: Element) {
    child.parent = this;
    let afterIndex = this.children.indexOf(after);
    if (afterIndex < 0) throw new Error('Could not find element to insert after');
    this.children.splice(afterIndex + 1, 0, child);

    if (child.bindScene) {
      child.bindScene(this.scene);
    }

    if (this.scene) this.scene.renderFrame();
  }

  bindScene(scene: WglScene | null) {
    this.scene = scene;
  }

  traverse(enterCallback, exitCallback) {
    enterCallback(this);

    for (var i = 0; i < this.children.length; ++i) {
      var child = this.children[i];
      child.traverse(enterCallback, exitCallback);
    }

    if (exitCallback) exitCallback(this);
  }

  /**
   * Rotates this element `rad` radians around `axis`.
   */
  rotate(rad: number, axis: number[]) {
    mat4.rotate(this.model, this.model, rad, axis);
    this.worldTransformNeedsUpdate = true;

    if (this.scene) this.scene.renderFrame();
    return this;
  }

  /**
   * Rotate `rad` radians around X axis
   */
  rotateX(rad: number) {
    mat4.rotateX(this.model, this.model, rad);
    this.worldTransformNeedsUpdate = true;
    if (this.scene) this.scene.renderFrame();
    return this;
  }

  /**
   * Rotate `rad` radians around Y axis
   */
  rotateY(rad: number) {
    mat4.rotateY(this.model, this.model, rad);
    this.worldTransformNeedsUpdate = true;
    if (this.scene) this.scene.renderFrame();
    return this;
  }

  /**
   * Rotate `rad` radians around Z axis
   */
  rotateZ(rad: number) {
    mat4.rotateZ(this.model, this.model, rad);
    this.worldTransformNeedsUpdate = true;
    if (this.scene) this.scene.renderFrame();
    return this;
  }

  /**
   * Scales this element by vector `v`
   */
  scale(v: number[]) {
    mat4.scale(this.model, this.model, v);
    this.worldTransformNeedsUpdate = true;
    if (this.scene) this.scene.renderFrame();
    return this;
  }

  /**
   * Translate this element by vector `v`
   */
  translate(v: number[]) {
    mat4.translate(this.model, this.model, v);
    this.worldTransformNeedsUpdate = true;
    if (this.scene) this.scene.renderFrame();
    return this;
  }

  /**
   * Removes the child from the collection of children. Takes `O(n)` time where `n` is number
   * of children.
   */
  removeChild(child: Element) {
    // TODO: should this be faster?
    let childIdx = this.children.indexOf(child);
    if (childIdx > -1) {
      this.children.splice(childIdx, 1);
      child.bindScene(null);
    }

    if (this.scene) this.scene.renderFrame();
  }

  updateWorldTransform(force = false) {
    if (this.worldTransformNeedsUpdate || force) {
      if (this.parent) {
        mat4.multiply(this.worldModel, this.parent.worldModel, this.model);
      } else {
        mat4.copy(this.worldModel, this.model);
      }

      this.modelViewProjectionNeedsUpdate = true;
      this.worldTransformNeedsUpdate = false;
      force = true; // We have to update children now.
    }

    let wasDirty = force;

    var children = this.children;
    for (var i = 0; i < children.length; i++ ) {
       wasDirty = children[i].updateWorldTransform(force) || wasDirty;
    }

    return wasDirty;
  }

  scheduleMVPUpdate() {
    this.modelViewProjectionNeedsUpdate = true;
    let children = this.children;
    for (var i = 0; i < children.length; i++ ) {
       children[i].scheduleMVPUpdate();
    }
  }

  updateModelViewProjection(projection: mat4, view: mat4) {
    if (!this.modelViewProjectionNeedsUpdate) return;

    mat4.multiply(this.modelViewProjection, projection, view);
    mat4.multiply(this.modelViewProjection, this.modelViewProjection, this.worldModel);
    this.modelViewProjectionNeedsUpdate = false;
  }

  /**
   * Requests the element to draw itself (and its children)
   */
  draw(gl: WebGLRenderingContext, drawContext: DrawContext) {
    for (var i = 0; i < this.children.length; ++i) {
      let child = this.children[i];
      child.updateModelViewProjection(drawContext.projection, drawContext.view.matrix);
      child.draw(gl, drawContext);
    }
  }

  dispose() {
    for (var i = 0; i < this.children.length; ++i) {
      var child = this.children[i];
      child.dispose();
    }
  }
}